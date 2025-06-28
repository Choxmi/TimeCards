/**
 * This file will automatically be loaded by webpack and run in the "renderer" context.
 * To learn more about the differences between the "main" and the "renderer" context in
 * Electron, visit:
 *
 * https://electronjs.org/docs/tutorial/process-model
 *
 * By default, Node.js integration in this file is disabled. When enabling Node.js integration
 * in a renderer process, please be aware of potential security implications. You can read
 * more about security risks here:
 *
 * https://electronjs.org/docs/tutorial/security
 *
 * To enable Node.js integration in this file, open up `main.js` and enable the `nodeIntegration`
 * flag:
 *
 * ```
 *  // Create the browser window.
 *  mainWindow = new BrowserWindow({
 *    width: 800,
 *    height: 600,
 *    webPreferences: {
 *      nodeIntegration: true
 *    }
 *  });
 * ```
 */

import './index.css';

const STORAGE_KEY = 'users_by_range';
let usersByRange = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
let currentRange = null;
let currentUser = null;

function saveUsers() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(usersByRange));
}

function getRangeKey(start, end) {
  return `${start}__${end}`;
}

function updateUserSelect() {
  const userSelect = document.getElementById('userSelect');
  userSelect.innerHTML = '';
  if (!currentRange || !usersByRange[currentRange]) return;
  Object.keys(usersByRange[currentRange]).forEach((name) => {
    const opt = document.createElement('option');
    opt.value = name;
    opt.textContent = name;
    userSelect.appendChild(opt);
  });
  if (currentUser && usersByRange[currentRange][currentUser]) {
    userSelect.value = currentUser;
  } else if (Object.keys(usersByRange[currentRange]).length) {
    currentUser = Object.keys(usersByRange[currentRange])[0];
    userSelect.value = currentUser;
  } else {
    currentUser = null;
  }
}

function renderRecords() {
  const table = document.getElementById('recordsTable');
  const tbody = table.querySelector('tbody');
  tbody.innerHTML = '';
  if (!currentRange || !currentUser || !usersByRange[currentRange][currentUser] || usersByRange[currentRange][currentUser].length === 0) {
    table.style.display = 'none';
    document.getElementById('exportBtn').style.display = 'none';
    renderUserTotal();
    return;
  }
  usersByRange[currentRange][currentUser].forEach((rec, i) => {
    const tr = document.createElement('tr');
    tr.innerHTML = `<td>${i+1}</td><td>${rec.date}</td><td>${rec.clockIn}</td><td>${rec.clockOut}</td><td>${rec.total}</td>`;
    tbody.appendChild(tr);
  });
  table.style.display = '';
  document.getElementById('exportBtn').style.display = 'inline-block';
  renderUserTotal();
}

function getUserTotal(records) {
  let totalMs = 0;
  records.forEach((rec) => {
    if (!rec.total) return;
    const match = rec.total.match(/(\d+) hour\(s\) (\d+) minute\(s\)/);
    if (match) {
      const h = parseInt(match[1], 10);
      const m = parseInt(match[2], 10);
      totalMs += (h * 60 + m) * 60 * 1000;
    }
  });
  const totalH = Math.floor(totalMs / 1000 / 60 / 60);
  const totalM = Math.floor((totalMs / 1000 / 60) % 60);
  return `${totalH} hour(s) ${totalM} minute(s)`;
}

function renderUserTotal() {
  const totalDiv = document.getElementById('userTotal');
  if (!currentRange || !currentUser || !usersByRange[currentRange][currentUser] || usersByRange[currentRange][currentUser].length === 0) {
    totalDiv.textContent = '';
    return;
  }
  totalDiv.textContent = `Total hours for ${currentUser} in selected range: ` + getUserTotal(usersByRange[currentRange][currentUser]);
}

document.addEventListener('DOMContentLoaded', () => {
  const setRangeBtn = document.getElementById('setRangeBtn');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const userSection = document.getElementById('user-section');
  const form = document.getElementById('timecard-form');
  const resultDiv = document.getElementById('result');
  const exportBtn = document.getElementById('exportBtn');
  const userSelect = document.getElementById('userSelect');
  const addUserBtn = document.getElementById('addUserBtn');
  const newUserName = document.getElementById('newUserName');

  setRangeBtn.addEventListener('click', () => {
    const start = startDateInput.value;
    const end = endDateInput.value;
    if (!start || !end || new Date(start) > new Date(end)) {
      alert('Please select a valid date range.');
      return;
    }
    currentRange = getRangeKey(start, end);
    if (!usersByRange[currentRange]) usersByRange[currentRange] = {};
    userSection.style.display = '';
    form.style.display = '';
    updateUserSelect();
    renderRecords();
  });

  addUserBtn.addEventListener('click', () => {
    if (!currentRange) return;
    const name = newUserName.value.trim();
    if (!name) return;
    if (!usersByRange[currentRange][name]) usersByRange[currentRange][name] = [];
    currentUser = name;
    saveUsers();
    updateUserSelect();
    renderRecords();
    newUserName.value = '';
  });

  userSelect.addEventListener('change', (e) => {
    currentUser = e.target.value;
    renderRecords();
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!currentRange || !currentUser) {
      resultDiv.textContent = 'Please select a date range and user.';
      return;
    }
    const clockIn = document.getElementById('clockIn').value;
    const clockOut = document.getElementById('clockOut').value;
    if (!clockIn || !clockOut) {
      resultDiv.textContent = 'Please enter both times.';
      return;
    }
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    let start = new Date();
    let end = new Date();
    start.setHours(inH, inM, 0, 0);
    end.setHours(outH, outM, 0, 0);
    if (end < start) end.setDate(end.getDate() + 1); // handle overnight
    const diffMs = end - start;
    const hours = Math.floor(diffMs / 1000 / 60 / 60);
    const mins = Math.floor((diffMs / 1000 / 60) % 60);
    const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const total = `${hours} hour(s) ${mins} minute(s)`;
    usersByRange[currentRange][currentUser].push({ date: today, clockIn, clockOut, total });
    saveUsers();
    resultDiv.textContent = `Added: ${today} ${clockIn} - ${clockOut} (${total})`;
    renderRecords();
    form.reset();
  });

  exportBtn.addEventListener('click', () => {
    if (!currentRange || !currentUser || !usersByRange[currentRange][currentUser]) return;
    let text = `User: ${currentUser}\nDate Range: ${currentRange.replace('__',' to ')}\n`;
    usersByRange[currentRange][currentUser].forEach((rec, i) => {
      text += `#${i+1}: Date: ${rec.date}, Clock In: ${rec.clockIn}, Clock Out: ${rec.clockOut}, Total: ${rec.total}\n`;
    });
    text += `Total: ${getUserTotal(usersByRange[currentRange][currentUser])}`;
    const blob = new Blob([text], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${currentUser}_timecards_${currentRange.replace('__','-')}.txt`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });
});

console.log('👋 This message is being logged by "renderer.js", included via webpack');
