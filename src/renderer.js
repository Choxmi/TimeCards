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
//   table.style.display = '';
//   document.getElementById('exportBtn').style.display = 'inline-block';
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

  // Move rangeListDiv to be a sibling, not a child, and wrap main content
  const rangeListDiv = document.createElement('div');
  rangeListDiv.id = 'rangeListDiv';
  rangeListDiv.style.width = '220px';
  rangeListDiv.style.minHeight = '400px';
  rangeListDiv.style.float = 'left';
  rangeListDiv.style.marginRight = '2rem';
  rangeListDiv.innerHTML = '<h3>Date Ranges</h3><ul id="rangeList" style="list-style:none;padding:0;"></ul>';

  // Wrap all main content in a container
  const mainContent = document.createElement('div');
  mainContent.id = 'mainContent';
  mainContent.style.overflow = 'auto';

  // Move all children except rangeListDiv into mainContent
  while (document.body.firstChild) {
    mainContent.appendChild(document.body.firstChild);
  }
  // Add rangeListDiv and mainContent to body
  document.body.appendChild(rangeListDiv);
  document.body.appendChild(mainContent);

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
    const clockInDate = document.getElementById('clockInDate').value; // get editable date
    if (!clockIn || !clockOut || !clockInDate) {
      resultDiv.textContent = 'Please enter date and both times.';
      return;
    }
    const [inH, inM] = clockIn.split(':').map(Number);
    const [outH, outM] = clockOut.split(':').map(Number);
    let start = new Date(clockInDate);
    let end = new Date(clockInDate);
    start.setHours(inH, inM, 0, 0);
    end.setHours(outH, outM, 0, 0);
    if (end < start) end.setDate(end.getDate() + 1); // handle overnight
    const diffMs = end - start;
    const hours = Math.floor(diffMs / 1000 / 60 / 60);
    const mins = Math.floor((diffMs / 1000 / 60) % 60);
    const total = `${hours} hour(s) ${mins} minute(s)`;
    usersByRange[currentRange][currentUser].push({ date: clockInDate, clockIn, clockOut, total });
    saveUsers();
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

  // Add Export All Users CSV button
  const exportAllCsvBtn = document.createElement('button');
  exportAllCsvBtn.id = 'exportAllCsvBtn';
  exportAllCsvBtn.textContent = 'Export All Users as CSV';
  exportAllCsvBtn.style.display = 'none';
  exportAllCsvBtn.style.marginLeft = '1rem';
  exportBtn.parentNode.insertBefore(exportAllCsvBtn, exportBtn.nextSibling);

  function updateExportAllCsvBtn() {
    if (!currentRange || !usersByRange[currentRange] || Object.keys(usersByRange[currentRange]).length === 0) {
      exportAllCsvBtn.style.display = 'none';
    } else {
      exportAllCsvBtn.style.display = 'inline-block';
    }
  }

  // Patch renderRecords to update the all-users CSV button
  const origRenderRecords = renderRecords;
  renderRecords = function() {
    origRenderRecords();
    updateExportAllCsvBtn();
  };

  exportAllCsvBtn.addEventListener('click', () => {
    if (!currentRange || !usersByRange[currentRange]) return;
    let csv = 'User,Date,Clock In,Clock Out,Total\n';
    Object.entries(usersByRange[currentRange]).forEach(([user, records]) => {
      records.forEach(rec => {
        csv += `${user},${rec.date},${rec.clockIn},${rec.clockOut},${rec.total}\n`;
      });
    });
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `all_users_timecards_${currentRange.replace('__','-')}.csv`;
    document.body.appendChild(a);
    a.click();
    setTimeout(() => {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 0);
  });

  function renderRangeList() {
    const rangeList = document.getElementById('rangeList');
    rangeList.innerHTML = '';
    Object.keys(usersByRange).forEach((rangeKey) => {
      const li = document.createElement('li');
      li.style.marginBottom = '0.5rem';
      const [start, end] = rangeKey.split('__');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      const rangeText = document.createElement('span');
      rangeText.textContent = `${start} to ${end}`;
      rangeText.style.cursor = 'pointer';
      if (rangeKey === currentRange) {
        rangeText.style.fontWeight = 'bold';
        rangeText.style.textDecoration = 'underline';
      }
      rangeText.addEventListener('click', () => {
        currentRange = rangeKey;
        document.getElementById('startDate').value = start;
        document.getElementById('endDate').value = end;
        document.getElementById('user-section').style.display = '';
        document.getElementById('timecard-form').style.display = '';
        updateUserSelect();
        renderRecords();
        renderRangeList();
      });
      // Delete button
      const delBtn = document.createElement('button');
      delBtn.textContent = '🗑️';
      delBtn.title = 'Delete this date range';
      delBtn.style.marginLeft = '0.5rem';
      delBtn.style.background = 'none';
      delBtn.style.border = 'none';
      delBtn.style.cursor = 'pointer';
      delBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        if (confirm(`Are you sure you want to delete the date range ${start} to ${end}? This will remove all users and records in this range.`)) {
          delete usersByRange[rangeKey];
          saveUsers();
          // If currentRange was deleted, clear selection
          if (currentRange === rangeKey) {
            currentRange = null;
            currentUser = null;
            document.getElementById('startDate').value = '';
            document.getElementById('endDate').value = '';
            document.getElementById('user-section').style.display = 'none';
            document.getElementById('timecard-form').style.display = 'none';
          }
          updateUserSelect();
          renderRecords();
          renderRangeList();
        }
      });
      li.appendChild(rangeText);
      li.appendChild(delBtn);
      rangeList.appendChild(li);
    });
  }

  // Patch setRangeBtn to update range list
  const origSetRangeBtnHandler = setRangeBtn.onclick;
  setRangeBtn.onclick = function(...args) {
    if (origSetRangeBtnHandler) origSetRangeBtnHandler.apply(this, args);
    renderRangeList();
  };
  setRangeBtn.addEventListener('click', renderRangeList);

  function renderAllUsersRecords() {
    const container = document.getElementById('allUsersRecords');
    if (!currentRange || !usersByRange[currentRange] || Object.keys(usersByRange[currentRange]).length === 0) {
      container.innerHTML = '';
      return;
    }
    let html = '<h3>All User Records for Selected Date Range</h3>';
    Object.entries(usersByRange[currentRange]).forEach(([user, records]) => {
      if (!records.length) return;
      html += `<div style="margin-bottom:1.5rem;"><b>${user}</b><table style="width:100%;margin-top:0.5rem;margin-bottom:0.5rem;"><thead><tr><th>#</th><th>Date</th><th>Clock In</th><th>Clock Out</th><th>Total</th><th>Delete</th></tr></thead><tbody>`;
      records.forEach((rec, i) => {
        html += `<tr data-user="${user}" data-index="${i}"><td>${i+1}</td><td>${rec.date}</td><td>${rec.clockIn}</td><td>${rec.clockOut}</td><td>${rec.total}</td><td><button class="delete-record-btn" data-user="${user}" data-index="${i}">Delete</button></td></tr>`;
      });
      html += '</tbody></table>';
      html += `<div style="font-weight:500;">Total: ${getUserTotal(records)}</div></div>`;
    });
    container.innerHTML = html;

    // Add event listeners for delete buttons
    container.querySelectorAll('.delete-record-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const user = btn.getAttribute('data-user');
        const idx = parseInt(btn.getAttribute('data-index'), 10);
        if (usersByRange[currentRange] && usersByRange[currentRange][user]) {
          usersByRange[currentRange][user].splice(idx, 1);
          saveUsers();
          renderRecords();
        }
      });
    });
  }

  // Patch renderRecords to also update all users records
  const origRenderRecords2 = renderRecords;
  renderRecords = function() {
    origRenderRecords2();
    renderAllUsersRecords();
  };

  renderRangeList();
});

console.log('👋 This message is being logged by "renderer.js", included via webpack');
