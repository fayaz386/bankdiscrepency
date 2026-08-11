/**
 * ReconcileFlow - Frontend Core Application (Enhanced)
 * Supports Multi-Company workspaces, AMEX sub-tabs, user authentication, and admin settings.
 * Includes separate Hotel and Restaurant Trial Balance grids, and multiple AMEX bank postings.
 */

// --- CATEGORY CONFIGURATIONS ---
const CARD_ROWS = [
  { id: 'visa', name: 'Visa' },
  { id: 'mc', name: 'MasterCard (MC)' },
  { id: 'discover', name: 'Discover' },
  { id: 'debit1', name: 'Debit 1' },
  { id: 'debit2', name: 'Debit 2' },
  { id: 'visapos', name: 'Visa POS' },
  { id: 'mcpos', name: 'MC POS' },
  { id: 'diner', name: 'Diner' }
];

const AMEX_ROWS = [
  { id: 'amex', name: 'AMEX' },
  { id: 'amexpos', name: 'AMEX POS' }
];

const CARD_BANK_INPUTS = [
  { id: 'visa', name: 'Visa Settled' },
  { id: 'mc', name: 'MasterCard (MC) Settled' },
  { id: 'discover', name: 'Discover Settled' },
  { id: 'debit1', name: 'Debit 1 Settled' },
  { id: 'debit2', name: 'Debit 2 Settled' }
];

// --- APP STATE ---
let currentUser = null;
let activeCompany = 'ws_hospitality';
let activeTab = 'cards';

// Separate Grid States
let hotelColumns = []; // [{ date: 'YYYY-MM-DD', values: { visa: 0, mc: 0... } }]
let restaurantColumns = []; // [{ date: 'YYYY-MM-DD', values: { visa: 0, mc: 0... } }]

// AMEX Bank Statement Postings
let amexBankPostings = [{ id: 1, value: '' }];

let history = []; // Array of saved reconciliation reports
let trendChart = null;

// --- DOM ELEMENTS ---
let loginScreen, mainHeader, mainContainer, mainFooter;
let loginForm, loginUsername, loginPassword;
let userDisplayName, btnLogout, btnSettingsToggle, settingsView, btnCloseSettings, dashboardView;
let companyTabsContainer, subTabsContainer;
let hotelLabelsContainer, hotelColumnsContainer, btnAddHotelCol;
let restaurantLabelsContainer, restaurantColumnsContainer, btnAddRestaurantCol;
let bankInputsContainer, bankBadgeTitle;
let btnSave, btnClear, reconTbody;
let totalLedgerDisplay, totalBankDisplay, netDiscrepancyDisplay, discrepancyIcon, discrepancyIconContainer;
let historyTbody, historyCount, noHistoryMessage;
let historyFromDate, historyToDate, historyStatusFilter;
let btnExportCsv, btnExportSummaryPdf, btnCopySummary, btnPrintReport, btnDownloadPdf;
let usersTbody, addUserForm, newUsername, newPassword, newRole;

// Initialize on DOM load
document.addEventListener('DOMContentLoaded', () => {
  // Bind UI Elements
  loginScreen = document.getElementById('login-screen');
  mainHeader = document.getElementById('main-header');
  mainContainer = document.getElementById('main-container');
  mainFooter = document.getElementById('main-footer');
  
  loginForm = document.getElementById('login-form');
  loginUsername = document.getElementById('login-username');
  loginPassword = document.getElementById('login-password');
  
  userDisplayName = document.getElementById('user-display-name');
  btnLogout = document.getElementById('btn-logout');
  btnSettingsToggle = document.getElementById('btn-settings-toggle');
  settingsView = document.getElementById('settings-view');
  btnCloseSettings = document.getElementById('btn-close-settings');
  dashboardView = document.getElementById('dashboard-view');
  
  companyTabsContainer = document.getElementById('company-tabs-container');
  subTabsContainer = document.getElementById('sub-tabs-container');
  
  hotelLabelsContainer = document.getElementById('hotel-labels-container');
  hotelColumnsContainer = document.getElementById('hotel-columns-container');
  btnAddHotelCol = document.getElementById('btn-add-hotel-col');

  restaurantLabelsContainer = document.getElementById('restaurant-labels-container');
  restaurantColumnsContainer = document.getElementById('restaurant-columns-container');
  btnAddRestaurantCol = document.getElementById('btn-add-restaurant-col');

  bankInputsContainer = document.getElementById('bank-inputs-container');
  bankBadgeTitle = document.getElementById('bank-badge-title');
  
  btnSave = document.getElementById('btn-save');
  btnClear = document.getElementById('btn-clear');
  reconTbody = document.getElementById('recon-tbody');
  
  totalLedgerDisplay = document.getElementById('total-ledger-display');
  totalBankDisplay = document.getElementById('total-bank-display');
  netDiscrepancyDisplay = document.getElementById('net-discrepancy-display');
  discrepancyIcon = document.getElementById('discrepancy-icon');
  discrepancyIconContainer = document.getElementById('discrepancy-icon-container');
  
  historyTbody = document.getElementById('history-tbody');
  historyCount = document.getElementById('history-count');
  noHistoryMessage = document.getElementById('no-history-message');
  
  historyFromDate = document.getElementById('history-from-date');
  historyToDate = document.getElementById('history-to-date');
  historyStatusFilter = document.getElementById('history-status-filter');
  
  btnExportCsv = document.getElementById('btn-export-csv');
  btnExportSummaryPdf = document.getElementById('btn-export-summary-pdf');
  btnCopySummary = document.getElementById('btn-copy-summary');
  btnPrintReport = document.getElementById('btn-print-report');
  btnDownloadPdf = document.getElementById('btn-download-pdf');
  
  usersTbody = document.getElementById('users-tbody');
  addUserForm = document.getElementById('add-user-form');
  newUsername = document.getElementById('new-username');
  newPassword = document.getElementById('new-password');
  newRole = document.getElementById('new-role');

  // Event Listeners
  loginForm.addEventListener('submit', handleLogin);
  btnLogout.addEventListener('click', handleLogout);
  btnSettingsToggle.addEventListener('click', toggleSettingsView);
  btnCloseSettings.addEventListener('click', () => toggleSettingsView(false));
  addUserForm.addEventListener('submit', handleCreateUser);
  
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', toggleTheme);
  
  setupNavigationTabs();

  // Columns & Inputs actions
  btnAddHotelCol.addEventListener('click', () => {
    addTbColumn(true);
  });
  
  btnAddRestaurantCol.addEventListener('click', () => {
    addTbColumn(false);
  });
  
  document.getElementById('reconcile-form').addEventListener('submit', handleSaveReport);
  btnClear.addEventListener('click', handleClearForm);
  
  // History exports
  btnExportCsv.addEventListener('click', exportCSV);
  btnExportSummaryPdf.addEventListener('click', downloadSummaryPDF);
  btnCopySummary.addEventListener('click', copySummaryToClipboard);
  btnPrintReport.addEventListener('click', () => window.print());
  btnDownloadPdf.addEventListener('click', downloadCurrentReportPDF);
  
  // History table filters
  historyFromDate.addEventListener('change', renderHistoryTable);
  historyToDate.addEventListener('change', renderHistoryTable);
  historyStatusFilter.addEventListener('change', renderHistoryTable);

  // Global click to open calendar datepicker on anywhere click
  document.addEventListener('click', (e) => {
    if (e.target && e.target.type === 'date') {
      try {
        e.target.showPicker();
      } catch (err) {}
    }
  });

  // Check auth session on startup
  checkSession();
  
  initChart();
  lucide.createIcons();
});

// --- SESSION & USER ACTIONS ---

function checkSession() {
  const session = sessionStorage.getItem('currentUser');
  if (session) {
    currentUser = JSON.parse(session);
    showAuthenticatedUI();
  } else {
    showLoginUI();
  }
}

function handleLogin(e) {
  e.preventDefault();
  const username = loginUsername.value.trim();
  const password = loginPassword.value;

  if (!username || !password) return;

  fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password })
  })
  .then(res => {
    if (!res.ok) throw new Error('Invalid username or password');
    return res.json();
  })
  .then(data => {
    currentUser = data.user;
    sessionStorage.setItem('currentUser', JSON.stringify(currentUser));
    showToast('Signed in successfully!', 'success');
    showAuthenticatedUI();
  })
  .catch(err => {
    showToast(err.message, 'error');
  });
}

function handleLogout() {
  currentUser = null;
  sessionStorage.removeItem('currentUser');
  showToast('Logged out successfully.', 'info');
  showLoginUI();
}

function showLoginUI() {
  loginScreen.style.display = '';
  mainHeader.style.display = 'none';
  mainContainer.style.display = 'none';
  mainFooter.style.display = 'none';
  loginScreen.classList.remove('hidden');
  mainHeader.classList.add('hidden');
  mainContainer.classList.add('hidden');
  mainFooter.classList.add('hidden');
  loginUsername.value = '';
  loginPassword.value = '';
}

function showAuthenticatedUI() {
  loginScreen.style.display = 'none';
  mainHeader.style.display = '';
  mainContainer.style.display = '';
  mainFooter.style.display = '';
  loginScreen.classList.add('hidden');
  mainHeader.classList.remove('hidden');
  mainContainer.classList.remove('hidden');
  mainFooter.classList.remove('hidden');
  
  const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'User';
  userDisplayName.textContent = `${currentUser.username} (${roleLabel})`;
  
  if (currentUser.role === 'admin') {
    btnSettingsToggle.style.display = '';
    btnSettingsToggle.classList.remove('hidden');
  } else {
    btnSettingsToggle.style.display = 'none';
    btnSettingsToggle.classList.add('hidden');
    toggleSettingsView(false);
  }
  
  resetAppInputs();
  loadDataFromServer();
}

function toggleSettingsView(forceOpen) {
  const isHidden = settingsView.style.display === 'none' || settingsView.classList.contains('hidden');
  const shouldOpen = typeof forceOpen === 'boolean' ? forceOpen : isHidden;
  
  if (shouldOpen) {
    settingsView.style.display = '';
    dashboardView.style.display = 'none';
    document.getElementById('dashboard-summary-cards').style.display = 'none';
    settingsView.classList.remove('hidden');
    dashboardView.classList.add('hidden');
    document.getElementById('dashboard-summary-cards').classList.add('hidden');
    loadUsersDirectory();
  } else {
    settingsView.style.display = 'none';
    dashboardView.style.display = '';
    document.getElementById('dashboard-summary-cards').style.display = '';
    settingsView.classList.add('hidden');
    dashboardView.classList.remove('hidden');
    document.getElementById('dashboard-summary-cards').classList.remove('hidden');
  }
}

function loadUsersDirectory() {
  if (currentUser.role !== 'admin') return;

  fetch('/api/users')
    .then(res => res.json())
    .then(users => {
      usersTbody.innerHTML = '';
      users.forEach(u => {
        const row = document.createElement('tr');
        const roleLabel = u.role === 'admin' ? 'Administrator' : 'Standard User';
        
        let actionsHtml = '';
        // Change password key button
        actionsHtml += `<button class="btn-table-action" onclick="changeUserPassword('${u.username}')" title="Change Password"><i data-lucide="key"></i></button>`;
        
        if (u.username.toLowerCase() !== 'admin') {
          actionsHtml += `<button class="btn-table-action delete" onclick="deleteUserAccount('${u.username}')" title="Delete User"><i data-lucide="trash-2"></i></button>`;
        }

        row.innerHTML = `
          <td><strong>${u.username}</strong></td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-blue'}">${roleLabel}</span></td>
          <td class="actions-col">
            <div class="action-icon-buttons">
              ${actionsHtml}
            </div>
          </td>
        `;
        usersTbody.appendChild(row);
      });
      lucide.createIcons();
    })
    .catch(err => {
      console.error(err);
      showToast('Error loading user directory', 'error');
    });
}

function handleCreateUser(e) {
  e.preventDefault();
  const username = newUsername.value.trim();
  const password = newPassword.value;
  const role = newRole.value;

  if (!username || !password || !role) return;
  if (password.length < 4) {
    showToast('Password must be at least 4 characters long', 'error');
    return;
  }

  fetch('/api/users', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password, role })
  })
    .then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.error) });
      return res.json();
    })
    .then(data => {
      showToast(data.message, 'success');
      newUsername.value = '';
      newPassword.value = '';
      loadUsersDirectory();
    })
    .catch(err => {
      showToast(err.message, 'error');
    });
}

window.deleteUserAccount = function(username) {
  if (confirm(`Are you sure you want to delete the user account '${username}'?`)) {
    fetch(`/api/users/${username}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) return res.json().then(d => { throw new Error(d.error) });
        return res.json();
      })
      .then(data => {
        showToast(data.message, 'info');
        loadUsersDirectory();
      })
      .catch(err => {
        showToast(err.message, 'error');
      });
  }
};

window.changeUserPassword = function(username) {
  const newPass = prompt(`Enter new password for user '${username}':`);
  if (newPass === null) return;
  const cleanPass = newPass.trim();
  if (cleanPass.length < 4) {
    showToast('Password must be at least 4 characters long', 'error');
    return;
  }

  fetch('/api/users/password', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, newPassword: cleanPass })
  })
    .then(res => {
      if (!res.ok) return res.json().then(d => { throw new Error(d.error) });
      return res.json();
    })
    .then(data => {
      showToast(data.message, 'success');
    })
    .catch(err => {
      showToast(err.message, 'error');
    });
};

// --- DYNAMIC SHEETS AND NAVIGATION TABS ---

function setupNavigationTabs() {
  // Company Switchers
  const compButtons = companyTabsContainer.querySelectorAll('.company-tab');
  compButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      compButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCompany = btn.getAttribute('data-company');
      
      toggleSettingsView(false);
      resetAppInputs();
      loadDataFromServer();
      showToast(`Switched workspace to ${btn.textContent}`, 'info');
    });
  });

  // Card vs AMEX Sub-Tabs Switchers
  const subButtons = subTabsContainer.querySelectorAll('.sub-tab');
  subButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      subButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');

      toggleSettingsView(false);
      resetAppInputs();
      loadDataFromServer();
    });
  });
}

function resetAppInputs() {
  hotelColumns = [];
  restaurantColumns = [];
  
  if (activeTab === 'cards') {
    bankBadgeTitle.textContent = "Bank Settled (Visa/MC/Discover/Debit)";
  } else {
    bankBadgeTitle.textContent = "Bank Settled (AMEX)";
    amexBankPostings = [{ id: Date.now(), value: '' }];
  }
  
  // Render Labels
  renderTbLabels(hotelLabelsContainer);
  renderTbLabels(restaurantLabelsContainer);

  // Render Bank Form
  renderBankInputsList();
  
  // Initialize with 1 blank column each
  addTbColumn(true);
  addTbColumn(false);

  calculateReconciliation();
}

function renderTbLabels(container) {
  container.innerHTML = '';
  
  const headerCell = document.createElement('div');
  headerCell.className = 'sheet-label-cell header-cell';
  headerCell.textContent = 'TB Date';
  container.appendChild(headerCell);

  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(row => {
    const labelCell = document.createElement('div');
    labelCell.className = 'sheet-label-cell';
    labelCell.textContent = row.name;
    container.appendChild(labelCell);
  });
}

function renderBankInputsList() {
  bankInputsContainer.innerHTML = '';

  // Render Bank Date input row
  const dateRow = document.createElement('div');
  dateRow.className = 'bank-input-row';
  dateRow.innerHTML = `
    <label for="bank-date">Bank Date</label>
    <input type="date" id="bank-date" required>
  `;
  bankInputsContainer.appendChild(dateRow);
  
  const bankDateInput = document.getElementById('bank-date');
  bankDateInput.value = formatDate(new Date());
  bankDateInput.addEventListener('change', calculateReconciliation);

  if (activeTab === 'cards') {
    // Normal Cards list
    CARD_BANK_INPUTS.forEach(inp => {
      const inputRow = document.createElement('div');
      inputRow.className = 'bank-input-row';
      inputRow.innerHTML = `
        <label for="bank-${inp.id}">${inp.name}</label>
        <div class="input-prefix">
          <span>$</span>
          <input type="number" id="bank-${inp.id}" step="0.01" placeholder="0.00">
        </div>
      `;
      bankInputsContainer.appendChild(inputRow);
      
      const inputField = document.getElementById(`bank-${inp.id}`);
      inputField.addEventListener('input', calculateReconciliation);
    });
  } else {
    // AMEX Multiple Postings List
    renderAmexPostingsList();
  }
}

function renderAmexPostingsList() {
  // Remove any existing AMEX posting rows or add button first
  const existingRows = bankInputsContainer.querySelectorAll('.amex-posting-row');
  existingRows.forEach(r => r.remove());
  const existingBtn = document.getElementById('btn-add-amex-posting');
  if (existingBtn) existingBtn.remove();

  amexBankPostings.forEach((post, index) => {
    const row = document.createElement('div');
    row.className = 'bank-input-row amex-posting-row';
    
    let deleteBtnHtml = '';
    if (amexBankPostings.length > 1) {
      deleteBtnHtml = `<button type="button" class="btn-del-col" style="margin-left: 8px" onclick="deleteAmexPosting(${post.id})" title="Delete Posting"><i data-lucide="trash-2"></i></button>`;
    }

    row.innerHTML = `
      <label for="bank-amex-${post.id}">AMEX Posting #${index + 1}</label>
      <div style="display: flex; align-items: center; width: 100%;">
        <div class="input-prefix" style="flex: 1;">
          <span>$</span>
          <input type="number" id="bank-amex-${post.id}" step="0.01" placeholder="0.00" value="${post.value}">
        </div>
        ${deleteBtnHtml}
      </div>
    `;
    bankInputsContainer.appendChild(row);

    const inputField = document.getElementById(`bank-amex-${post.id}`);
    inputField.addEventListener('input', (e) => {
      post.value = e.target.value === '' ? '' : parseFloat(e.target.value);
      calculateReconciliation();
    });
  });

  // Append Add Button
  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'btn btn-sm btn-secondary';
  addBtn.id = 'btn-add-amex-posting';
  addBtn.style.width = '100%';
  addBtn.style.marginTop = '10px';
  addBtn.innerHTML = `<i data-lucide="plus"></i> Add AMEX Posting`;
  addBtn.addEventListener('click', addAmexPosting);
  
  bankInputsContainer.appendChild(addBtn);
  lucide.createIcons();
}

function addAmexPosting() {
  amexBankPostings.push({ id: Date.now(), value: '' });
  renderAmexPostingsList();
  calculateReconciliation();
}

window.deleteAmexPosting = function(id) {
  if (amexBankPostings.length <= 1) return;
  amexBankPostings = amexBankPostings.filter(p => p.id !== id);
  renderAmexPostingsList();
  calculateReconciliation();
};

function addTbColumn(isHotel, initialValues = null) {
  const defaultDate = formatDate(new Date());
  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;
  
  const defaultValues = {};
  rows.forEach(r => {
    defaultValues[r.id] = initialValues ? (initialValues[r.id] || '') : '';
  });

  const colDate = initialValues && initialValues.date ? initialValues.date : defaultDate;
  const colObj = {
    date: colDate,
    values: defaultValues
  };

  if (isHotel) {
    hotelColumns.push(colObj);
    renderGridColumns(hotelColumnsContainer, hotelColumns, true);
  } else {
    restaurantColumns.push(colObj);
    renderGridColumns(restaurantColumnsContainer, restaurantColumns, false);
  }

  calculateReconciliation();
}

function deleteTbColumn(isHotel, index) {
  const cols = isHotel ? hotelColumns : restaurantColumns;
  if (cols.length <= 1) {
    showToast('Cannot delete the only remaining Trial Balance column.', 'error');
    return;
  }
  cols.splice(index, 1);
  renderGridColumns(isHotel ? hotelColumnsContainer : restaurantColumnsContainer, cols, isHotel);
  calculateReconciliation();
}

function renderGridColumns(container, colsArray, isHotel) {
  container.innerHTML = '';
  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;

  colsArray.forEach((col, index) => {
    const colDiv = document.createElement('div');
    colDiv.className = 'spreadsheet-col';
    
    // Header item (Date selection + delete icon)
    const headerCell = document.createElement('div');
    headerCell.className = 'sheet-value-cell header-cell';
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = col.date;
    dateInput.addEventListener('change', (e) => {
      col.date = e.target.value;
      calculateReconciliation();
    });
    headerCell.appendChild(dateInput);

    const deleteBtn = document.createElement('button');
    deleteBtn.type = 'button';
    deleteBtn.className = 'btn-del-col';
    deleteBtn.title = 'Delete Column';
    deleteBtn.innerHTML = '<i data-lucide="trash-2"></i>';
    deleteBtn.addEventListener('click', () => {
      deleteTbColumn(isHotel, index);
    });
    headerCell.appendChild(deleteBtn);

    colDiv.appendChild(headerCell);

    // Value input cells
    rows.forEach(row => {
      const valCell = document.createElement('div');
      valCell.className = 'sheet-value-cell';

      const inputPrefix = document.createElement('div');
      inputPrefix.className = 'input-prefix';

      const dollarSpan = document.createElement('span');
      dollarSpan.textContent = '$';
      inputPrefix.appendChild(dollarSpan);

      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.placeholder = '0.00';
      input.value = col.values[row.id];
      
      input.addEventListener('input', (e) => {
        col.values[row.id] = e.target.value === '' ? '' : parseFloat(e.target.value);
        calculateReconciliation();
      });

      inputPrefix.appendChild(input);
      valCell.appendChild(inputPrefix);
      colDiv.appendChild(valCell);
    });

    container.appendChild(colDiv);
  });
  
  lucide.createIcons();
}

// --- CORE RECONCILIATION CALCULATION LOGIC ---

function sumGridRow(cols, rowId) {
  let sum = 0;
  cols.forEach(col => {
    const val = col.values[rowId];
    if (typeof val === 'number') {
      sum += val;
    }
  });
  return sum;
}

function runReconciliationLogic() {
  const result = {
    tbSums: {}, // Combined sum of Hotel + Restaurant row values
    bank: {},
    rows: [],
    totalLedger: 0,
    totalBank: 0,
    netDiscrepancy: 0
  };

  // 1. Gather Bank Statement Inputs
  if (activeTab === 'cards') {
    CARD_BANK_INPUTS.forEach(inp => {
      const el = document.getElementById(`bank-${inp.id}`);
      result.bank[inp.id] = el && el.value !== '' ? parseFloat(el.value) : 0;
    });
  } else {
    // Sum of all AMEX postings
    let totalAmexBank = 0;
    amexBankPostings.forEach(p => {
      if (typeof p.value === 'number') totalAmexBank += p.value;
    });
    result.bank['amex'] = totalAmexBank;
  }

  // 2. Sum Trial Balance categories (Combined Hotel + Restaurant)
  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(r => {
    const hotelSum = sumGridRow(hotelColumns, r.id);
    const restaurantSum = sumGridRow(restaurantColumns, r.id);
    result.tbSums[r.id] = hotelSum + restaurantSum;
  });

  // 3. Map values and calculate discrepancies
  if (activeTab === 'cards') {
    // Visa
    const visaLedger = result.tbSums['visa'] + result.tbSums['visapos'];
    const visaBank = result.bank['visa'];
    const visaDiff = visaBank - visaLedger;
    result.rows.push({ name: 'Visa (Sales + POS)', ledger: visaLedger, bank: visaBank, diff: visaDiff });

    // MC
    const mcLedger = result.tbSums['mc'] + result.tbSums['mcpos'];
    const mcBank = result.bank['mc'];
    const mcDiff = mcBank - mcLedger;
    result.rows.push({ name: 'MasterCard (Sales + POS)', ledger: mcLedger, bank: mcBank, diff: mcDiff });

    // Discover
    const discLedger = result.tbSums['discover'] + result.tbSums['diner'];
    const discBank = result.bank['discover'];
    const discDiff = discBank - discLedger;
    result.rows.push({ name: 'Discover (Discover + Diner)', ledger: discLedger, bank: discBank, diff: discDiff });

    // Debit 1
    const d1Ledger = result.tbSums['debit1'];
    const d1Bank = result.bank['debit1'];
    const d1Diff = d1Bank - d1Ledger;
    result.rows.push({ name: 'Debit 1', ledger: d1Ledger, bank: d1Bank, diff: d1Diff });

    // Debit 2
    const d2Ledger = result.tbSums['debit2'];
    const d2Bank = result.bank['debit2'];
    const d2Diff = d2Bank - d2Ledger;
    result.rows.push({ name: 'Debit 2', ledger: d2Ledger, bank: d2Bank, diff: d2Diff });

  } else {
    // AMEX Reconciliation
    const amexLedger = result.tbSums['amex'] + result.tbSums['amexpos'];
    const amexBank = result.bank['amex'];
    const amexDiff = amexBank - amexLedger;
    result.rows.push({ name: 'American Express (AMEX)', ledger: amexLedger, bank: amexBank, diff: amexDiff });
  }

  // 4. Calculate Totals
  result.rows.forEach(r => {
    result.totalLedger += r.ledger;
    result.totalBank += r.bank;
  });
  result.netDiscrepancy = result.totalBank - result.totalLedger;

  return result;
}

function calculateReconciliation() {
  const result = runReconciliationLogic();

  // Save state globally for exports
  bankValues = result.bank;

  // Render to Live Table
  reconTbody.innerHTML = '';
  result.rows.forEach(r => {
    const row = document.createElement('tr');
    const diffClass = r.diff > 0.005 ? 'val-positive' : (r.diff < -0.005 ? 'val-negative' : 'val-neutral');
    const statusText = Math.abs(r.diff) <= 0.005 
      ? '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Reconciled</span>' 
      : '<span class="status-pill status-discrepant"><i data-lucide="alert-triangle"></i> Discrepant</span>';

    row.innerHTML = `
      <td><strong>${r.name}</strong></td>
      <td class="num-col">${formatCurrency(r.ledger)}</td>
      <td class="num-col">${formatCurrency(r.bank)}</td>
      <td class="num-col ${diffClass}">${r.diff > 0.005 ? '+' : ''}${formatCurrency(r.diff)}</td>
      <td>${statusText}</td>
    `;
    reconTbody.appendChild(row);
  });

  // Render Summary Bottom Row
  const totalRow = document.createElement('tr');
  totalRow.style.fontWeight = 'bold';
  totalRow.style.borderTop = '2px solid var(--border-color)';
  
  const netClass = result.netDiscrepancy > 0.005 ? 'val-positive' : (result.netDiscrepancy < -0.005 ? 'val-negative' : 'val-neutral');
  const netStatus = Math.abs(result.netDiscrepancy) <= 0.005 
    ? '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Balanced</span>' 
    : '<span class="status-pill status-discrepant"><i data-lucide="alert-circle"></i> Out of Balance</span>';

  totalRow.innerHTML = `
    <td>TOTALS</td>
    <td class="num-col">${formatCurrency(result.totalLedger)}</td>
    <td class="num-col">${formatCurrency(result.totalBank)}</td>
    <td class="num-col ${netClass}">${formatCurrency(result.netDiscrepancy)}</td>
    <td>${netStatus}</td>
  `;
  reconTbody.appendChild(totalRow);

  // Update Summary displays
  totalLedgerDisplay.textContent = formatCurrency(result.totalLedger);
  totalBankDisplay.textContent = formatCurrency(result.totalBank);
  netDiscrepancyDisplay.textContent = formatCurrency(result.netDiscrepancy);

  const discCard = document.getElementById('card-discrepancy');
  if (Math.abs(result.netDiscrepancy) <= 0.005) {
    netDiscrepancyDisplay.className = 'val-neutral';
    discrepancyIcon.setAttribute('data-lucide', 'check-circle-2');
    discrepancyIconContainer.style.setProperty('--icon-color', 'var(--accent-green)');
    discCard.style.boxShadow = 'none';
  } else {
    netDiscrepancyDisplay.className = result.netDiscrepancy > 0 ? 'val-positive' : 'val-negative';
    discrepancyIcon.setAttribute('data-lucide', 'alert-circle');
    discrepancyIconContainer.style.setProperty('--icon-color', result.netDiscrepancy > 0 ? 'var(--accent-green)' : 'var(--accent-red)');
    const pulseColor = result.netDiscrepancy > 0 ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)';
    discCard.style.boxShadow = `0 0 20px ${pulseColor}`;
  }

  lucide.createIcons();
}

// --- DATABASE SAVING & LOADING ---

function loadDataFromServer() {
  if (!activeCompany || !activeTab) return;

  const url = `/api/history?companyId=${activeCompany}&reconType=${activeTab}`;
  fetch(url)
    .then(res => {
      if (!res.ok) throw new Error('Failed to load history');
      return res.json();
    })
    .then(data => {
      history = data || [];
      renderHistoryTable();
      updateChart();
    })
    .catch(err => {
      console.error(err);
      showToast('Error loading records from server', 'error');
    });
}

function handleSaveReport(e) {
  e.preventDefault();
  
  const bankDateInput = document.getElementById('bank-date');
  if (!bankDateInput || !bankDateInput.value) {
    showToast('Bank date is required to save report!', 'error');
    return;
  }
  const bankDate = bankDateInput.value;

  // Ensure all columns have dates
  const missingHotelIdx = hotelColumns.findIndex(col => !col.date);
  const missingRestIdx = restaurantColumns.findIndex(col => !col.date);
  if (missingHotelIdx !== -1 || missingRestIdx !== -1) {
    showToast(`All Trial Balance columns must have dates filled!`, 'error');
    return;
  }

  const calculation = runReconciliationLogic();

  // Create range label for history (e.g. "Aug 4 - Aug 6")
  let tbDateLabel = '';
  // Combine all sorted dates
  const allDates = [...hotelColumns, ...restaurantColumns].map(c => c.date).sort();
  const sortedUniqueDates = [...new Set(allDates)];
  if (sortedUniqueDates.length === 1) {
    tbDateLabel = sortedUniqueDates[0];
  } else {
    const options = { month: 'short', day: 'numeric' };
    const startFmt = new Date(sortedUniqueDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
    const endFmt = new Date(sortedUniqueDates[sortedUniqueDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
    tbDateLabel = `${startFmt} - ${endFmt}`;
  }

  const primaryDate = sortedUniqueDates[0] || formatDate(new Date());
  const reportId = `${activeCompany}_${activeTab}_${primaryDate}_${bankDate}`;

  const report = {
    id: reportId,
    companyId: activeCompany,
    reconType: activeTab,
    tbDateLabel,
    primaryTbDate: primaryDate,
    bankDate,
    // Store Hotel and Restaurant columns separately
    hotelColumns: JSON.parse(JSON.stringify(hotelColumns)),
    restaurantColumns: JSON.parse(JSON.stringify(restaurantColumns)),
    // Store AMEX postings if active
    amexBankPostings: activeTab === 'amex' ? JSON.parse(JSON.stringify(amexBankPostings)) : null,
    bank: calculation.bank,
    totalLedger: calculation.totalLedger,
    totalBank: calculation.totalBank,
    netDiscrepancy: calculation.netDiscrepancy,
    timestamp: new Date().getTime()
  };

  showToast('Saving report to database...', 'info');

  fetch('/api/history', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(report)
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to save to database');
      return res.json();
    })
    .then(data => {
      showToast(data.message || 'Report saved successfully!', 'success');
      loadDataFromServer();
    })
    .catch(err => {
      console.error(err);
      showToast('Error saving report to server', 'error');
    });
}

window.deleteReportRecord = function(id) {
  if (confirm(`Delete saved reconciliation report record?`)) {
    showToast('Deleting report...', 'info');
    fetch(`/api/history/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete');
        return res.json();
      })
      .then(data => {
        showToast(data.message || 'Deleted successfully.', 'success');
        loadDataFromServer();
      })
      .catch(err => {
        console.error(err);
        showToast('Error deleting report from server', 'error');
      });
  }
};

window.editReportRecord = function(id) {
  const report = history.find(r => r.id === id);
  if (report) {
    activeCompany = report.companyId;
    activeTab = report.reconType;
    
    companyTabsContainer.querySelectorAll('.company-tab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-company') === activeCompany);
    });
    subTabsContainer.querySelectorAll('.sub-tab').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-tab') === activeTab);
    });

    if (activeTab === 'cards') {
      bankBadgeTitle.textContent = "Bank Settled (Visa/MC/Discover/Debit)";
    } else {
      bankBadgeTitle.textContent = "Bank Settled (AMEX)";
    }

    renderTbLabels(hotelLabelsContainer);
    renderTbLabels(restaurantLabelsContainer);
    renderBankInputsList();

    const bankDateInput = document.getElementById('bank-date');
    if (bankDateInput) bankDateInput.value = report.bankDate;

    // Load grids state (Hotel & Restaurant)
    // Back-compatibility: if report has old tbColumns, load it to hotelColumns, and keep restaurantColumns blank
    if (report.hotelColumns) {
      hotelColumns = JSON.parse(JSON.stringify(report.hotelColumns));
      restaurantColumns = JSON.parse(JSON.stringify(report.restaurantColumns || []));
    } else if (report.tbColumns) {
      hotelColumns = JSON.parse(JSON.stringify(report.tbColumns));
      restaurantColumns = [];
    } else {
      hotelColumns = [];
      restaurantColumns = [];
    }

    renderGridColumns(hotelColumnsContainer, hotelColumns, true);
    renderGridColumns(restaurantColumnsContainer, restaurantColumns, false);

    // Load AMEX postings or Card inputs
    if (activeTab === 'cards') {
      CARD_BANK_INPUTS.forEach(inp => {
        const input = document.getElementById(`bank-${inp.id}`);
        if (input) input.value = report.bank[inp.id] || '';
      });
    } else {
      // Load saved AMEX postings list
      if (report.amexBankPostings) {
        amexBankPostings = JSON.parse(JSON.stringify(report.amexBankPostings));
      } else {
        amexBankPostings = [{ id: Date.now(), value: report.bank['amex'] || '' }];
      }
      renderAmexPostingsList();
    }

    calculateReconciliation();
    toggleSettingsView(false);
    showToast(`Loaded report for Bank Date ${report.bankDate}.`, 'success');
  }
};

// --- HISTORY FILTER & RENDER ENGINE ---

function getFilteredHistory() {
  let filtered = [...history];

  const from = historyFromDate.value;
  const to = historyToDate.value;
  if (from) filtered = filtered.filter(r => r.bankDate >= from);
  if (to) filtered = filtered.filter(r => r.bankDate <= to);

  const status = historyStatusFilter.value;
  if (status === 'reconciled') {
    filtered = filtered.filter(r => Math.abs(r.netDiscrepancy) <= 0.005);
  } else if (status === 'discrepant') {
    filtered = filtered.filter(r => Math.abs(r.netDiscrepancy) > 0.005);
  }

  return filtered;
}

function renderHistoryTable() {
  const filtered = getFilteredHistory();
  historyTbody.innerHTML = '';
  historyCount.textContent = `${filtered.length} report${filtered.length === 1 ? '' : 's'}`;

  if (filtered.length === 0) {
    noHistoryMessage.classList.remove('hidden');
    return;
  }
  noHistoryMessage.classList.add('hidden');

  filtered.forEach(r => {
    const row = document.createElement('tr');
    const diffClass = r.netDiscrepancy > 0.005 ? 'val-positive' : (r.netDiscrepancy < -0.005 ? 'val-negative' : 'val-neutral');
    const statusText = Math.abs(r.netDiscrepancy) <= 0.005 
      ? '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Reconciled</span>' 
      : '<span class="status-pill status-discrepant"><i data-lucide="alert-triangle"></i> Discrepant</span>';

    row.innerHTML = `
      <td><strong>${r.tbDateLabel}</strong></td>
      <td>${r.bankDate}</td>
      <td class="num-col">${formatCurrency(r.totalLedger)}</td>
      <td class="num-col">${formatCurrency(r.totalBank)}</td>
      <td class="num-col ${diffClass}">${r.netDiscrepancy > 0.005 ? '+' : ''}${formatCurrency(r.netDiscrepancy)}</td>
      <td>${statusText}</td>
      <td class="actions-col">
        <div class="action-icon-buttons">
          <button class="btn-table-action" onclick="editReportRecord('${r.id}')" title="Edit / Load"><i data-lucide="edit"></i></button>
          <button class="btn-table-action" onclick="exportReportToPDF('${r.id}')" title="Download PDF"><i data-lucide="file-down"></i></button>
          <button class="btn-table-action delete admin-only" onclick="deleteReportRecord('${r.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
        </div>
      </td>
    `;
    
    if (currentUser && currentUser.role !== 'admin') {
      const delBtn = row.querySelector('.btn-table-action.delete');
      if (delBtn) delBtn.style.display = 'none';
    }

    historyTbody.appendChild(row);
  });

  lucide.createIcons();
}

// --- ANALYTICS CHARTS ---

function initChart() {
  const ctx = document.getElementById('trendChart');
  if (!ctx) return;

  const isLight = document.body.classList.contains('light-theme');
  const textColor = isLight ? '#475569' : '#9ca3af';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  trendChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels: [],
      datasets: [{
        label: 'Net Discrepancy ($)',
        data: [],
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59, 130, 246, 0.1)',
        borderWidth: 2,
        tension: 0.3,
        fill: true
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false }
      },
      scales: {
        x: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'Plus Jakarta Sans', size: 10 } }
        },
        y: {
          grid: { color: gridColor },
          ticks: { color: textColor, font: { family: 'JetBrains Mono', size: 10 } }
        }
      }
    }
  });
}

function updateChart() {
  if (!trendChart) return;

  const sortedReports = [...history]
    .sort((a, b) => new Date(a.bankDate) - new Date(b.bankDate))
    .slice(-30);

  const labels = sortedReports.map(r => r.bankDate);
  const data = sortedReports.map(r => r.netDiscrepancy);

  trendChart.data.labels = labels;
  trendChart.data.datasets[0].data = data;

  const hasDiscrepancies = data.some(val => Math.abs(val) > 0.005);
  trendChart.data.datasets[0].borderColor = hasDiscrepancies ? '#ef4444' : '#10b981';
  trendChart.data.datasets[0].backgroundColor = hasDiscrepancies ? 'rgba(239, 68, 68, 0.05)' : 'rgba(16, 185, 129, 0.05)';

  const isLight = document.body.classList.contains('light-theme');
  const textColor = isLight ? '#475569' : '#9ca3af';
  const gridColor = isLight ? 'rgba(0,0,0,0.06)' : 'rgba(255,255,255,0.06)';

  trendChart.options.scales.x.ticks.color = textColor;
  trendChart.options.scales.x.grid.color = gridColor;
  trendChart.options.scales.y.ticks.color = textColor;
  trendChart.options.scales.y.grid.color = gridColor;

  trendChart.update();
}

// --- EXPORT: EXCEL (CSV) ---

function exportCSV() {
  const filtered = getFilteredHistory();
  if (filtered.length === 0) {
    showToast('No reports to export in selected range!', 'error');
    return;
  }

  const isCards = activeTab === 'cards';
  const tabName = isCards ? 'Cards' : 'AMEX';
  const companyName = activeCompany === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';

  let csvContent = `Reconciliation Period Summary - ${companyName} (${tabName})\n`;
  csvContent += `Generated: ${new Date().toLocaleDateString()}\n\n`;
  csvContent += `TB Date Range,Bank Date,Total Ledger Receipts,Total Bank Deposits,Net Discrepancy,Reconciliation Status\n`;

  let totalLedgerSum = 0;
  let totalBankSum = 0;
  let totalNetDiff = 0;

  filtered.forEach(r => {
    totalLedgerSum += r.totalLedger;
    totalBankSum += r.totalBank;
    totalNetDiff += r.netDiscrepancy;

    const status = Math.abs(r.netDiscrepancy) <= 0.005 ? 'Reconciled' : 'Discrepant';
    csvContent += `"${r.tbDateLabel}",${r.bankDate},${r.totalLedger.toFixed(2)},${r.totalBank.toFixed(2)},${r.netDiscrepancy.toFixed(2)},${status}\n`;
  });

  csvContent += `\n"ROLL-UP PERIOD SUMS",,${totalLedgerSum.toFixed(2)},${totalBankSum.toFixed(2)},${totalNetDiff.toFixed(2)},${Math.abs(totalNetDiff) <= 0.005 ? 'Balanced' : 'Out of Balance'}\n`;

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  
  const compFileStr = activeCompany === 'ws_hospitality' ? 'WS_Hospitality' : 'WS_Hotels';
  link.setAttribute('download', `ReconcileFlow_Summary_${compFileStr}_${tabName}_${formatDate(new Date())}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  
  showToast('Excel CSV Summary downloaded!', 'success');
}

// --- EXPORTS: PDF GENERATION ENGINE ---

const { jsPDF } = window.jspdf;

function generateReconciliationPDF(tbDatesStr, bankDateStr, hotelCols, restCols, bankValuesForPDF) {
  const doc = new jsPDF();
  const isCards = activeTab === 'cards';
  const compName = activeCompany === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';
  
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 15, 'F');
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("ReconcileFlow Report", 14, 10);
  
  doc.setFontSize(10);
  doc.text(`${compName} - ${isCards ? 'Cards' : 'AMEX'} Reconciliation`, 140, 10);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Bank Statement Date: ${bankDateStr}`, 14, 28);
  doc.text(`Trial Balance Range: ${tbDatesStr}`, 14, 34);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 140, 28);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 38, 196, 38);

  const result = runReconciliationLogic();

  const breakdownHeaders = [["Reconciliation Category", "Ledger Total (CB)", "Bank Statement", "Discrepancy", "Status"]];
  const breakdownRows = result.rows.map(r => {
    return [
      r.name,
      formatCurrency(r.ledger),
      formatCurrency(r.bank),
      (r.diff > 0.005 ? '+' : '') + formatCurrency(r.diff),
      Math.abs(r.diff) <= 0.005 ? "Reconciled" : "Discrepant"
    ];
  });

  breakdownRows.push([
    "TOTALS",
    formatCurrency(result.totalLedger),
    formatCurrency(result.totalBank),
    formatCurrency(result.netDiscrepancy),
    Math.abs(result.netDiscrepancy) <= 0.005 ? "Balanced" : "Out of Balance"
  ]);

  doc.autoTable({
    startY: 44,
    head: breakdownHeaders,
    body: breakdownRows,
    theme: 'striped',
    headStyles: { fillStyle: 'F', fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.row.index === breakdownRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        
        if (data.column.index === 3) {
          if (result.netDiscrepancy > 0.005) {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (result.netDiscrepancy < -0.005) {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      } else {
        if (data.column.index === 3) {
          const val = result.rows[data.row.index].diff;
          if (val > 0.005) data.cell.styles.textColor = [16, 185, 129];
          if (val < -0.005) data.cell.styles.textColor = [239, 68, 68];
        }
      }
    }
  });

  // Summary Banner Card
  let currentY = doc.lastAutoTable.finalY + 12;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 34, 4, 4, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Reconciliation Executive Summary", 20, currentY + 8);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total Ledger Receipts: ${formatCurrency(result.totalLedger)}`, 20, currentY + 18);
  doc.text(`Total Bank Deposits:   ${formatCurrency(result.totalBank)}`, 20, currentY + 26);

  if (Math.abs(result.netDiscrepancy) <= 0.005) {
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("RECONCILED", 138, currentY + 15);
    doc.setFontSize(9);
    doc.text("Zero Net Difference", 136, currentY + 21);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("OUT OF BALANCE", 128, currentY + 15);
    doc.setFontSize(9);
    doc.text(`Difference: ${formatCurrency(result.netDiscrepancy)}`, 132, currentY + 21);
  }

  doc.setTextColor(148, 163, 184);
  doc.setFontSize(8);
  doc.text("Generated by ReconcileFlow. Audit ledger copy.", 14, 285);

  return doc;
}

function downloadCurrentReportPDF() {
  const bankDateInput = document.getElementById('bank-date');
  if (!bankDateInput || !bankDateInput.value) {
    showToast('Bank Date is required to generate PDF!', 'error');
    return;
  }

  // Combine dates
  const allDates = [...hotelColumns, ...restaurantColumns].map(c => c.date).sort();
  const sortedUniqueDates = [...new Set(allDates)];
  let rangeLabel = sortedUniqueDates[0];
  if (sortedUniqueDates.length > 1) {
    rangeLabel = `${sortedUniqueDates[0]} to ${sortedUniqueDates[sortedUniqueDates.length - 1]}`;
  }

  const doc = generateReconciliationPDF(rangeLabel, bankDateInput.value, hotelColumns, restaurantColumns, bankValues);
  const compFileStr = activeCompany === 'ws_hospitality' ? 'WS_Hospitality' : 'WS_Hotels';
  const tabName = activeTab === 'cards' ? 'Cards' : 'AMEX';
  doc.save(`Reconciliation_${compFileStr}_${tabName}_${bankDateInput.value}.pdf`);
  showToast('PDF downloaded successfully!', 'success');
}

function exportReportToPDF(id) {
  const report = history.find(r => r.id === id);
  if (!report) {
    showToast('Report data not found!', 'error');
    return;
  }

  const doc = new jsPDF();
  const isCards = report.reconType === 'cards';
  const compName = report.companyId === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';
  
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 15, 'F');
  
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("ReconcileFlow Report (Archived)", 14, 10);
  
  doc.setFontSize(10);
  doc.text(`${compName} - ${isCards ? 'Cards' : 'AMEX'}`, 140, 10);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Bank Statement Date: ${report.bankDate}`, 14, 28);
  doc.text(`Trial Balance Range: ${report.tbDateLabel}`, 14, 34);
  doc.text(`Saved Date: ${new Date(report.timestamp).toLocaleString()}`, 130, 28);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 38, 196, 38);

  // Recalculate sums
  const breakdownHeaders = [["Reconciliation Category", "Ledger Total (CB)", "Bank Statement", "Discrepancy", "Status"]];
  const breakdownRows = [];
  
  // Calculate sums from saved grids
  const tbSums = {};
  const rows = isCards ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(r => {
    let hotelSum = 0;
    let restaurantSum = 0;
    
    if (report.hotelColumns) {
      hotelSum = sumGridRow(report.hotelColumns, r.id);
      restaurantSum = sumGridRow(report.restaurantColumns || [], r.id);
    } else if (report.tbColumns) {
      hotelSum = sumGridRow(report.tbColumns, r.id);
    }
    
    tbSums[r.id] = hotelSum + restaurantSum;
  });

  if (isCards) {
    const visaLedger = tbSums['visa'] + tbSums['visapos'];
    const visaBank = report.bank['visa'] || 0;
    breakdownRows.push(['Visa (Sales + POS)', formatCurrency(visaLedger), formatCurrency(visaBank), formatCurrency(visaBank - visaLedger), Math.abs(visaBank - visaLedger) <= 0.005 ? 'Reconciled' : 'Discrepant']);

    const mcLedger = tbSums['mc'] + tbSums['mcpos'];
    const mcBank = report.bank['mc'] || 0;
    breakdownRows.push(['MasterCard (Sales + POS)', formatCurrency(mcLedger), formatCurrency(mcBank), formatCurrency(mcBank - mcLedger), Math.abs(mcBank - mcLedger) <= 0.005 ? 'Reconciled' : 'Discrepant']);

    const discLedger = tbSums['discover'] + tbSums['diner'];
    const discBank = report.bank['discover'] || 0;
    breakdownRows.push(['Discover (Discover + Diner)', formatCurrency(discLedger), formatCurrency(discBank), formatCurrency(discBank - discLedger), Math.abs(discBank - discLedger) <= 0.005 ? 'Reconciled' : 'Discrepant']);

    const d1Ledger = tbSums['debit1'];
    const d1Bank = report.bank['debit1'] || 0;
    breakdownRows.push(['Debit 1', formatCurrency(d1Ledger), formatCurrency(d1Bank), formatCurrency(d1Bank - d1Ledger), Math.abs(d1Bank - d1Ledger) <= 0.005 ? 'Reconciled' : 'Discrepant']);

    const d2Ledger = tbSums['debit2'];
    const d2Bank = report.bank['debit2'] || 0;
    breakdownRows.push(['Debit 2', formatCurrency(d2Ledger), formatCurrency(d2Bank), formatCurrency(d2Bank - d2Ledger), Math.abs(d2Bank - d2Ledger) <= 0.005 ? 'Reconciled' : 'Discrepant']);
  } else {
    const amexLedger = tbSums['amex'] + tbSums['amexpos'];
    const amexBank = report.bank['amex'] || 0;
    breakdownRows.push(['American Express (AMEX)', formatCurrency(amexLedger), formatCurrency(amexBank), formatCurrency(amexBank - amexLedger), Math.abs(amexBank - amexLedger) <= 0.005 ? 'Reconciled' : 'Discrepant']);
  }

  breakdownRows.push([
    "TOTALS",
    formatCurrency(report.totalLedger),
    formatCurrency(report.totalBank),
    formatCurrency(report.netDiscrepancy),
    Math.abs(report.netDiscrepancy) <= 0.005 ? "Balanced" : "Out of Balance"
  ]);

  doc.autoTable({
    startY: 44,
    head: breakdownHeaders,
    body: breakdownRows,
    theme: 'striped',
    headStyles: { fillStyle: 'F', fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.row.index === breakdownRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        if (data.column.index === 3) {
          if (report.netDiscrepancy > 0.005) data.cell.styles.textColor = [16, 185, 129];
          if (report.netDiscrepancy < -0.005) data.cell.styles.textColor = [239, 68, 68];
        }
      }
    }
  });

  // Summary Banner Card
  let currentY = doc.lastAutoTable.finalY + 12;
  doc.setFillColor(248, 250, 252);
  doc.setDrawColor(226, 232, 240);
  doc.roundedRect(14, currentY, 182, 34, 4, 4, 'FD');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(12);
  doc.text("Reconciliation Executive Summary", 20, currentY + 8);

  doc.setFont("Helvetica", "normal");
  doc.setFontSize(10);
  doc.text(`Total Ledger Receipts: ${formatCurrency(report.totalLedger)}`, 20, currentY + 18);
  doc.text(`Total Bank Deposits:   ${formatCurrency(report.totalBank)}`, 20, currentY + 26);

  if (Math.abs(report.netDiscrepancy) <= 0.005) {
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text("RECONCILED", 138, currentY + 15);
    doc.setFontSize(9);
    doc.text("Zero Net Difference", 136, currentY + 21);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text("OUT OF BALANCE", 128, currentY + 15);
    doc.setFontSize(9);
    doc.text(`Difference: ${formatCurrency(report.netDiscrepancy)}`, 132, currentY + 21);
  }

  const compFileStr = report.companyId === 'ws_hospitality' ? 'WS_Hospitality' : 'WS_Hotels';
  const tabName = report.reconType === 'cards' ? 'Cards' : 'AMEX';
  doc.save(`Reconciliation_${compFileStr}_${tabName}_${report.bankDate}.pdf`);
  showToast(`Archived PDF downloaded!`, 'success');
}

function downloadSummaryPDF() {
  const filtered = getFilteredHistory();
  if (filtered.length === 0) {
    showToast('No reports to export in selected range!', 'error');
    return;
  }

  const doc = new jsPDF();
  const isCards = activeTab === 'cards';
  const tabName = isCards ? 'Cards' : 'AMEX';
  const companyName = activeCompany === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';

  doc.setFillColor(139, 92, 246);
  doc.rect(0, 0, 210, 15, 'F');

  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("Reconciliation Period Roll-Up Summary", 14, 10);

  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Company Name: ${companyName}`, 14, 28);
  doc.text(`Recon Type: ${tabName} Accounts`, 14, 34);
  doc.text(`Generated: ${new Date().toLocaleString()}`, 130, 28);

  const fromVal = historyFromDate.value || 'Beginning';
  const toVal = historyToDate.value || 'Today';
  doc.text(`Date Filters: ${fromVal} to ${toVal}`, 14, 40);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 44, 196, 44);

  const summaryHeaders = [["TB Date Range", "Bank Date", "Ledger Total (CB)", "Bank Total (Col I)", "Net Discrepancy", "Status"]];
  let totalLedgerSum = 0;
  let totalBankSum = 0;
  let totalNetDiff = 0;

  const summaryRows = filtered.map(r => {
    totalLedgerSum += r.totalLedger;
    totalBankSum += r.totalBank;
    totalNetDiff += r.netDiscrepancy;

    return [
      r.tbDateLabel,
      r.bankDate,
      formatCurrency(r.totalLedger),
      formatCurrency(r.totalBank),
      (r.netDiscrepancy > 0.005 ? '+' : '') + formatCurrency(r.netDiscrepancy),
      Math.abs(r.netDiscrepancy) <= 0.005 ? "Balanced" : "Discrepant"
    ];
  });

  summaryRows.push([
    "ROLL-UP TOTALS",
    "",
    formatCurrency(totalLedgerSum),
    formatCurrency(totalBankSum),
    (totalNetDiff > 0.005 ? '+' : '') + formatCurrency(totalNetDiff),
    Math.abs(totalNetDiff) <= 0.005 ? "Balanced" : "Out of Balance"
  ]);

  doc.autoTable({
    startY: 50,
    head: summaryHeaders,
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillStyle: 'F', fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: {
      0: { fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.row.index === summaryRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        
        if (data.column.index === 4) {
          if (totalNetDiff > 0.005) {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (totalNetDiff < -0.005) {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    }
  });

  const compFileStr = activeCompany === 'ws_hospitality' ? 'WS_Hospitality' : 'WS_Hotels';
  doc.save(`Reconciliation_Summary_${compFileStr}_${tabName}_${formatDate(new Date())}.pdf`);
  showToast('PDF Summary Report downloaded!', 'success');
}

// --- UTILITY STYLES & INTERACTION HELPERS ---

function toggleTheme() {
  const body = document.body;
  if (body.classList.contains('dark-theme')) {
    body.classList.remove('dark-theme');
    body.classList.add('light-theme');
    localStorage.setItem('theme', 'light-theme');
  } else {
    body.classList.remove('light-theme');
    body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark-theme');
  }
  updateChart();
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  const toastMessage = document.getElementById('toast-message');
  const toastIcon = document.getElementById('toast-icon');

  toastMessage.textContent = message;
  
  if (type === 'success') {
    toast.className = 'toast show success';
    toastIcon.setAttribute('data-lucide', 'check-circle-2');
  } else if (type === 'error') {
    toast.className = 'toast show error';
    toastIcon.setAttribute('data-lucide', 'x-circle');
  } else {
    toast.className = 'toast show info';
    toastIcon.setAttribute('data-lucide', 'info');
  }

  lucide.createIcons();

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3500);
}

function handleClearForm() {
  if (confirm('Are you sure you want to clear all numbers in the current workspace?')) {
    resetAppInputs();
    showToast('Workspace cleared.', 'info');
  }
}

function copySummaryToClipboard() {
  const result = runReconciliationLogic();
  const compName = activeCompany === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';
  const tabName = activeTab === 'cards' ? 'Cards' : 'AMEX';

  let text = `RECONCILIATION SUMMARY: ${compName} (${tabName})\n`;
  text += `Hotel Trial Balance Days: ${hotelColumns.map(c => c.date).join(', ')}\n`;
  text += `Restaurant Trial Balance Days: ${restaurantColumns.map(c => c.date).join(', ')}\n`;
  text += `Bank Statement Date: ${document.getElementById('bank-date').value}\n`;
  text += `=========================================\n`;
  result.rows.forEach(r => {
    text += `${r.name}: Ledger Total ${formatCurrency(r.ledger)} | Bank ${formatCurrency(r.bank)} | Diff: ${(r.diff > 0 ? '+' : '')}${formatCurrency(r.diff)}\n`;
  });
  text += `=========================================\n`;
  text += `NET DISCREPANCY: ${formatCurrency(result.netDiscrepancy)} (${Math.abs(result.netDiscrepancy) <= 0.005 ? 'Balanced' : 'Out of Balance'})\n`;

  navigator.clipboard.writeText(text)
    .then(() => showToast('Summary copied to clipboard!', 'success'))
    .catch(() => showToast('Failed to copy summary to clipboard.', 'error'));
}
