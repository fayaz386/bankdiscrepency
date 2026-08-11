/**
 * ReconcileFlow - Frontend Core Application (Enhanced)
 * Supports Multi-Company workspaces, AMEX sub-tabs, user authentication, and admin settings.
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

const AMEX_BANK_INPUTS = [
  { id: 'amex', name: 'AMEX Settled' }
];

// --- APP STATE ---
let currentUser = null;
let activeCompany = 'ws_hospitality';
let activeTab = 'cards';

let tbColumns = []; // Array of columns: { date: 'YYYY-MM-DD', values: { visa: 0, mc: 0... } }
let bankValues = {}; // Map of inputs: { visa: 0, mc: 0... }
let history = []; // Array of saved reconciliation reports

let trendChart = null;

// --- DOM ELEMENTS ---
let loginScreen, mainHeader, mainContainer, mainFooter;
let loginForm, loginUsername, loginPassword;
let userDisplayName, btnLogout, btnSettingsToggle, settingsView, btnCloseSettings, dashboardView;
let companyTabsContainer, subTabsContainer, btnSampleData;
let tbLabelsContainer, tbColumnsContainer, btnAddTbCol;
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
  btnSampleData = document.getElementById('btn-sample-data');
  
  tbLabelsContainer = document.getElementById('tb-labels-container');
  tbColumnsContainer = document.getElementById('tb-columns-container');
  btnAddTbCol = document.getElementById('btn-add-tb-col');
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
  
  // Theme and dynamic setup
  const themeToggle = document.getElementById('theme-toggle');
  themeToggle.addEventListener('click', toggleTheme);
  
  // Listeners for Switching Company & Sub-Tabs
  setupNavigationTabs();

  // Columns & Inputs actions
  btnAddTbCol.addEventListener('click', () => {
    addTbColumn();
  });
  
  document.getElementById('reconcile-form').addEventListener('submit', handleSaveReport);
  btnClear.addEventListener('click', handleClearForm);
  btnSampleData.addEventListener('click', loadSampleData);
  
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
  
  // Set User Details
  const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'User';
  userDisplayName.textContent = `${currentUser.username} (${roleLabel})`;
  
  // Toggle Admin capabilities
  if (currentUser.role === 'admin') {
    btnSettingsToggle.style.display = '';
    btnSettingsToggle.classList.remove('hidden');
  } else {
    btnSettingsToggle.style.display = 'none';
    btnSettingsToggle.classList.add('hidden');
    toggleSettingsView(false); // Hide settings panel if they were on it
  }
  
  // Initial loading of workspace data
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
        
        let deleteBtn = '';
        if (u.username.toLowerCase() !== 'admin') {
          deleteBtn = `<button class="btn-table-action delete" onclick="deleteUserAccount('${u.username}')" title="Delete User"><i data-lucide="trash-2"></i></button>`;
        } else {
          deleteBtn = `<span class="val-neutral" style="font-size:0.8rem">System Lock</span>`;
        }

        row.innerHTML = `
          <td><strong>${u.username}</strong></td>
          <td><span class="badge ${u.role === 'admin' ? 'badge-purple' : 'badge-blue'}">${roleLabel}</span></td>
          <td class="actions-col">
            <div class="action-icon-buttons">
              ${deleteBtn}
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

// --- DYNAMIC SHEETS AND NAVIGATION TABS ---

function setupNavigationTabs() {
  // Company Switchers
  const compButtons = companyTabsContainer.querySelectorAll('.company-tab');
  compButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      compButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCompany = btn.getAttribute('data-company');
      
      toggleSettingsView(false); // Close settings if open
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

      toggleSettingsView(false); // Close settings if open
      resetAppInputs();
      loadDataFromServer();
    });
  });
}

function resetAppInputs() {
  tbColumns = [];
  bankValues = {};
  
  // Set up appropriate title badges
  if (activeTab === 'cards') {
    bankBadgeTitle.textContent = "Bank Settled (Visa/MC/Discover/Debit)";
  } else {
    bankBadgeTitle.textContent = "Bank Settled (AMEX)";
  }
  
  // Initialize dynamic structure
  renderTbLabels();
  renderBankInputsList();
  
  // Always initialize with 1 blank column
  addTbColumn();
  calculateReconciliation();
}

function renderTbLabels() {
  tbLabelsContainer.innerHTML = '';
  
  const headerCell = document.createElement('div');
  headerCell.className = 'sheet-label-cell header-cell';
  headerCell.textContent = 'TB Date';
  tbLabelsContainer.appendChild(headerCell);

  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(row => {
    const labelCell = document.createElement('div');
    labelCell.className = 'sheet-label-cell';
    labelCell.textContent = row.name;
    tbLabelsContainer.appendChild(labelCell);
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
  
  // Set current date on newly created date field
  const bankDateInput = document.getElementById('bank-date');
  bankDateInput.value = formatDate(new Date());
  
  // Add live update trigger
  bankDateInput.addEventListener('change', calculateReconciliation);

  // Render monetary inputs rows
  const inputs = activeTab === 'cards' ? CARD_BANK_INPUTS : AMEX_BANK_INPUTS;
  inputs.forEach(inp => {
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
    
    // Add live calculation listeners
    const inputField = document.getElementById(`bank-${inp.id}`);
    inputField.addEventListener('input', calculateReconciliation);
  });
}

function addTbColumn(initialValues = null) {
  const defaultDate = formatDate(new Date());
  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;
  
  const defaultValues = {};
  rows.forEach(r => {
    defaultValues[r.id] = initialValues ? (initialValues[r.id] || '') : '';
  });

  const colDate = initialValues && initialValues.date ? initialValues.date : defaultDate;

  tbColumns.push({
    date: colDate,
    values: defaultValues
  });

  renderTbColumns();
  calculateReconciliation();
}

function deleteTbColumn(index) {
  if (tbColumns.length <= 1) {
    showToast('Cannot delete the only remaining Trial Balance column.', 'error');
    return;
  }
  tbColumns.splice(index, 1);
  renderTbColumns();
  calculateReconciliation();
}

function renderTbColumns() {
  tbColumnsContainer.innerHTML = '';
  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;

  tbColumns.forEach((col, index) => {
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
      deleteTbColumn(index);
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

    tbColumnsContainer.appendChild(colDiv);
  });
  
  lucide.createIcons();
}

// --- CORE RECONCILIATION CALCULATION LOGIC ---

function runReconciliationLogic() {
  const result = {
    tbSums: {},
    bank: {},
    rows: [],
    totalLedger: 0,
    totalBank: 0,
    netDiscrepancy: 0
  };

  // 1. Gather Bank Statement Inputs
  const bankInputs = activeTab === 'cards' ? CARD_BANK_INPUTS : AMEX_BANK_INPUTS;
  bankInputs.forEach(inp => {
    const el = document.getElementById(`bank-${inp.id}`);
    result.bank[inp.id] = el && el.value !== '' ? parseFloat(el.value) : 0;
  });

  // 2. Sum Trial Balance columns
  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(r => {
    let rowSum = 0;
    tbColumns.forEach(col => {
      const val = col.values[r.id];
      if (typeof val === 'number') {
        rowSum += val;
      }
    });
    result.tbSums[r.id] = rowSum;
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

  // Save state globally for easy exports
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

  // Update Bottom Dashboard Summary Metrics Widgets
  totalLedgerDisplay.textContent = formatCurrency(result.totalLedger);
  totalBankDisplay.textContent = formatCurrency(result.totalBank);
  netDiscrepancyDisplay.textContent = formatCurrency(result.netDiscrepancy);

  // Style bottom discrepancy card dynamically
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
    
    // Add pulsing border alert
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
  const missingDateIndex = tbColumns.findIndex(col => !col.date);
  if (missingDateIndex !== -1) {
    showToast(`Trial Balance day #${missingDateIndex + 1} has no date filled!`, 'error');
    return;
  }

  const calculation = runReconciliationLogic();

  // Create range label for history (e.g. "Aug 4 - Aug 6")
  let tbDateLabel = '';
  const sortedDates = tbColumns.map(c => c.date).sort();
  if (sortedDates.length === 1) {
    tbDateLabel = sortedDates[0];
  } else {
    const options = { month: 'short', day: 'numeric' };
    const startFmt = new Date(sortedDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
    const endFmt = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
    tbDateLabel = `${startFmt} - ${endFmt}`;
  }

  // Composite Unique ID to segment reports properly
  const reportId = `${activeCompany}_${activeTab}_${sortedDates[0]}_${bankDate}`;

  const report = {
    id: reportId,
    companyId: activeCompany,
    reconType: activeTab,
    tbDateLabel,
    primaryTbDate: sortedDates[0],
    bankDate,
    tbColumns: JSON.parse(JSON.stringify(tbColumns)), // Deep clone input grid values
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
      loadDataFromServer(); // Refresh history
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
        loadDataFromServer(); // Refresh history
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
    // 1. Set sub-tab and company if they don't match (already matches if loaded in table, but to be safe)
    activeCompany = report.companyId;
    activeTab = report.reconType;
    
    // Toggle active classes in HTML
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

    renderTbLabels();
    renderBankInputsList();

    // 2. Set bank date
    const bankDateInput = document.getElementById('bank-date');
    if (bankDateInput) bankDateInput.value = report.bankDate;

    // 3. Load dynamic Trial Balance columns state
    tbColumns = JSON.parse(JSON.stringify(report.tbColumns));
    renderTbColumns();

    // 4. Load Bank statement inputs
    const inputs = activeTab === 'cards' ? CARD_BANK_INPUTS : AMEX_BANK_INPUTS;
    inputs.forEach(inp => {
      const input = document.getElementById(`bank-${inp.id}`);
      if (input) input.value = report.bank[inp.id] || '';
    });

    calculateReconciliation();
    toggleSettingsView(false); // Make sure dashboard is visible
    showToast(`Loaded report for Bank Date ${report.bankDate} into workspace.`, 'success');
  }
};

// --- HISTORY FILTER & RENDER ENGINE ---

function getFilteredHistory() {
  let filtered = [...history];

  // Date Filters
  const from = historyFromDate.value;
  const to = historyToDate.value;
  if (from) {
    filtered = filtered.filter(r => r.bankDate >= from);
  }
  if (to) {
    filtered = filtered.filter(r => r.bankDate <= to);
  }

  // Status Filter
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
    
    // Hide delete buttons inside table rows if standard user
    if (currentUser && currentUser.role !== 'admin') {
      const delBtn = row.querySelector('.btn-table-action.delete');
      if (delBtn) delBtn.style.display = 'none';
    }

    historyTbody.appendChild(row);
  });

  lucide.createIcons();
}

// --- SAMPLE DATA LOADERS ---

function loadSampleData() {
  tbColumns = [];
  
  if (activeTab === 'cards') {
    // 3-Day Weekend Cards Example
    const col1 = {
      date: '2026-08-04',
      values: { visa: 10561.37, mc: 20843.78, discover: 0.00, debit1: 687.01, debit2: 0.00, visapos: 154.50, mcpos: 0.00, diner: 0.00 }
    };
    const col2 = {
      date: '2026-08-05',
      values: { visa: 12771.89, mc: 16985.01, discover: 178.13, debit1: 1478.67, debit2: 0.00, visapos: 1609.86, mcpos: 0.00, diner: 0.00 }
    };
    const col3 = {
      date: '2026-08-06',
      values: { visa: 5232.48, mc: 14420.87, discover: 0.00, debit1: 200.54, debit2: 0.00, visapos: 4.50, mcpos: 308.42, diner: 0.00 }
    };

    tbColumns.push(col1, col2, col3);
    renderTbColumns();

    // Set bank date
    const bankDateInput = document.getElementById('bank-date');
    if (bankDateInput) bankDateInput.value = '2026-08-06';

    // Set bank statement settled entries
    document.getElementById('bank-visa').value = '30325.60';
    document.getElementById('bank-mc').value = '52790.22';
    document.getElementById('bank-discover').value = '178.13';
    document.getElementById('bank-debit1').value = '2375.22';
    document.getElementById('bank-debit2').value = '0.00';

  } else {
    // AMEX Example
    const col1 = {
      date: '2026-08-04',
      values: { amex: 1250.00, amexpos: 150.00 }
    };
    const col2 = {
      date: '2026-08-05',
      values: { amex: 1800.50, amexpos: 0.00 }
    };
    const col3 = {
      date: '2026-08-06',
      values: { amex: 950.25, amexpos: 75.00 }
    };

    tbColumns.push(col1, col2, col3);
    renderTbColumns();

    // Set bank date
    const bankDateInput = document.getElementById('bank-date');
    if (bankDateInput) bankDateInput.value = '2026-08-06';

    // Set bank statement settled entries (matches ledger total: 1250+150 + 1800.50 + 950.25+75 = 4225.75)
    document.getElementById('bank-amex').value = '4225.75';
  }

  calculateReconciliation();
  showToast('Standard 3-day weekend example loaded!', 'info');
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

  // Gather last 30 reports sorted chronologically
  const sortedReports = [...history]
    .sort((a, b) => new Date(a.bankDate) - new Date(b.bankDate))
    .slice(-30);

  const labels = sortedReports.map(r => r.bankDate);
  const data = sortedReports.map(r => r.netDiscrepancy);

  trendChart.data.labels = labels;
  trendChart.data.datasets[0].data = data;

  // Set line colors based on discrepancy trend
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

  // Append Summarized Totals row
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

function generateReconciliationPDF(tbDatesStr, bankDateStr, tbCols, bankValuesForPDF) {
  const doc = new jsPDF();
  const isCards = activeTab === 'cards';
  const compName = activeCompany === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';
  
  // Header Branding Accent
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, 210, 15, 'F');
  
  // Header Title
  doc.setFont("Helvetica", "bold");
  doc.setFontSize(18);
  doc.setTextColor(255, 255, 255);
  doc.text("ReconcileFlow Report", 14, 10);
  
  // Company & Workspace
  doc.setFontSize(10);
  doc.text(`${compName} - ${isCards ? 'Cards' : 'AMEX'} Reconciliation`, 140, 10);

  // Metadata Block
  doc.setTextColor(15, 23, 42);
  doc.setFontSize(11);
  doc.text(`Bank Statement Date: ${bankDateStr}`, 14, 28);
  doc.text(`Trial Balance Range: ${tbDatesStr}`, 14, 34);
  doc.text(`Report Generated: ${new Date().toLocaleString()}`, 140, 28);

  // Divider Line
  doc.setDrawColor(226, 232, 240);
  doc.line(14, 38, 196, 38);

  // Process data using runReconciliationLogic
  const result = runReconciliationLogic();

  // Create Table 1: Breakdown Table
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

  // Append Total Row to Table
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
      // Style the final totals summary row uniquely
      if (data.row.index === breakdownRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        
        if (data.column.index === 3) {
          // Color code total net difference
          if (result.netDiscrepancy > 0.005) {
            data.cell.styles.textColor = [16, 185, 129];
          } else if (result.netDiscrepancy < -0.005) {
            data.cell.styles.textColor = [239, 68, 68];
          }
        }
      } else {
        // Color code individual discrepancy differences
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

  // Status highlights in Summary Banner
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

  // Footer notes
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

  // Sort dates
  const sortedDates = tbColumns.map(c => c.date).sort();
  let rangeLabel = sortedDates[0];
  if (sortedDates.length > 1) {
    rangeLabel = `${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]}`;
  }

  const doc = generateReconciliationPDF(rangeLabel, bankDateInput.value, tbColumns, bankValues);
  
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

  // Generate PDF from the archived report data parameters
  const doc = new jsPDF();
  const isCards = report.reconType === 'cards';
  const compName = report.companyId === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';
  
  // Header Branding Accent
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

  // Recalculate sums based on saved columns structure
  const breakdownHeaders = [["Reconciliation Category", "Ledger Total (CB)", "Bank Statement", "Discrepancy", "Status"]];
  const breakdownRows = [];
  
  // Calculate sums
  const tbSums = {};
  const rows = isCards ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(r => {
    let rowSum = 0;
    report.tbColumns.forEach(col => {
      const val = col.values[r.id];
      if (typeof val === 'number') rowSum += val;
    });
    tbSums[r.id] = rowSum;
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

  // Banner branding
  doc.setFillColor(139, 92, 246); // purple for summary reports
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

  // Filters display
  const fromVal = historyFromDate.value || 'Beginning';
  const toVal = historyToDate.value || 'Today';
  doc.text(`Date Filters: ${fromVal} to ${toVal}`, 14, 40);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 44, 196, 44);

  // Build roll-up data
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

  // Append roll-up summary totals row
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
  // Refresh chart scales with new theme text contrast
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
  
  // Set icons based on status type
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

  // Slide down toast after 3.5 seconds
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
  text += `Trial Balance: ${tbColumns.map(c => c.date).join(', ')}\n`;
  text += `Bank Statement: ${document.getElementById('bank-date').value}\n`;
  text += `=========================================\n`;
  result.rows.forEach(r => {
    text += `${r.name}: Ledger ${formatCurrency(r.ledger)} | Bank ${formatCurrency(r.bank)} | Diff: ${(r.diff > 0 ? '+' : '')}${formatCurrency(r.diff)}\n`;
  });
  text += `=========================================\n`;
  text += `NET DISCREPANCY: ${formatCurrency(result.netDiscrepancy)} (${Math.abs(result.netDiscrepancy) <= 0.005 ? 'Balanced' : 'Out of Balance'})\n`;

  navigator.clipboard.writeText(text)
    .then(() => showToast('Summary copied to clipboard!', 'success'))
    .catch(() => showToast('Failed to copy summary to clipboard.', 'error'));
}
