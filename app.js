/**
 * ReconcileFlow - Frontend Core Application (Enhanced)
 * Supports Multi-Company workspaces, AMEX sub-tabs, user authentication, and admin settings.
 * Includes separate Hotel and Restaurant Trial Balance grids, and dynamic multiple bank statement postings per card.
 * Supports Excel-style math additions (e.g. 100+200+50) inside any cell.
 * Supports dynamic addition of multiple amount sub-lines under any Trial Balance category in both spreadsheets.
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

// Helper to get initial default categories (1 line per category)
function getInitialCategories() {
  return {
    cards: {
      visa: { name: 'Visa', lines: [{ id: 'visa_0', label: 'Line 1' }] },
      mc: { name: 'MasterCard (MC)', lines: [{ id: 'mc_0', label: 'Line 1' }] },
      discover: { name: 'Discover', lines: [{ id: 'discover_0', label: 'Line 1' }] },
      debit1: { name: 'Debit 1', lines: [{ id: 'debit1_0', label: 'Line 1' }] },
      debit2: { name: 'Debit 2', lines: [{ id: 'debit2_0', label: 'Line 1' }] },
      visapos: { name: 'Visa POS', lines: [{ id: 'visapos_0', label: 'Line 1' }] },
      mcpos: { name: 'MC POS', lines: [{ id: 'mcpos_0', label: 'Line 1' }] },
      diner: { name: 'Diner', lines: [{ id: 'diner_0', label: 'Line 1' }] }
    },
    amex: {
      amex: { name: 'AMEX', lines: [{ id: 'amex_0', label: 'Line 1' }] },
      amexpos: { name: 'AMEX POS', lines: [{ id: 'amexpos_0', label: 'Line 1' }] }
    }
  };
}

// --- APP STATE ---
let currentUser = null;
let activeCompany = 'ws_hospitality';
let activeTab = 'live';
let activeLoadedReportId = null;
let historySortColumn = 'timestamp';
let historySortAscending = false;
const companyFilters = {
  ws_hospitality: { from: '', to: '', selectedRun: '' },
  ws_hotels: { from: '', to: '', selectedRun: '' }
};
let amexFeeRateSetting = parseFloat(localStorage.getItem('amexFeeRate') || '3.5');
let amexThresholdRateSetting = parseFloat(localStorage.getItem('amexThresholdRate') || '12.0');

// Separate Grid States
let hotelColumns = []; // [{ date: 'YYYY-MM-DD', values: { visa_0: '', mc_0: ''... } }]
let restaurantColumns = []; // [{ date: 'YYYY-MM-DD', values: { visa_0: '', mc_0: ''... } }]

// Dynamic Spreadsheet Categories Configuration
let hotelCategories = getInitialCategories();
let restaurantCategories = getInitialCategories();

// Dynamic Bank Statement Postings per Card
let bankPostings = {
  visa: [{ id: 'visa_init', value: '' }],
  mc: [{ id: 'mc_init', value: '' }],
  discover: [{ id: 'discover_init', value: '' }],
  debit1: [{ id: 'debit1_init', value: '' }],
  debit2: [{ id: 'debit2_init', value: '' }],
  amex: [{ id: 'amex_init', value: '' }]
};

let history = []; // Array of saved reconciliation reports
let trendChart = null;

// --- DOM ELEMENTS ---
let loginScreen, mainHeader, mainContainer, mainFooter;
let loginForm, loginUsername, loginPassword;
let userDisplayName, btnLogout, btnSettingsToggle, settingsView, btnCloseSettings, dashboardView;
let companyTabsContainer, subTabsContainer;
let hotelLabelsContainer, hotelColumnsContainer, btnAddHotelCol;
let restaurantLabelsContainer, restaurantColumnsContainer, btnAddRestaurantCol;
let bankLabelsContainer, bankColumnsContainer, bankBadgeTitle;
let btnSave, btnClear, reconTbody, selectLoadHistory, btnRefresh, btnNewEntry;
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

  bankLabelsContainer = document.getElementById('bank-labels-container');
  bankColumnsContainer = document.getElementById('bank-columns-container');
  bankBadgeTitle = document.getElementById('bank-badge-title');
  
  btnSave = document.getElementById('btn-save');
  btnClear = document.getElementById('btn-clear');
  reconTbody = document.getElementById('recon-tbody');
  selectLoadHistory = document.getElementById('select-load-history');
  btnRefresh = document.getElementById('btn-refresh');
  btnNewEntry = document.getElementById('btn-new-entry');
  
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

  // Initialize and Bind AMEX Rules Config Settings
  const settingAmexFeeRateInput = document.getElementById('setting-amex-fee-rate');
  const settingAmexThresholdRateInput = document.getElementById('setting-amex-threshold-rate');
  if (settingAmexFeeRateInput) {
    settingAmexFeeRateInput.value = amexFeeRateSetting;
  }
  if (settingAmexThresholdRateInput) {
    settingAmexThresholdRateInput.value = amexThresholdRateSetting;
  }

  const btnSaveRules = document.getElementById('btn-save-rules');
  if (btnSaveRules) {
    btnSaveRules.addEventListener('click', () => {
      const feeRateVal = parseFloat(settingAmexFeeRateInput.value);
      const thresholdVal = parseFloat(settingAmexThresholdRateInput.value);
      if (isNaN(feeRateVal) || feeRateVal < 0 || isNaN(thresholdVal) || thresholdVal < 0) {
        showToast('Please enter valid non-negative numbers for fee rules.', 'error');
        return;
      }
      amexFeeRateSetting = feeRateVal;
      amexThresholdRateSetting = thresholdVal;
      localStorage.setItem('amexFeeRate', feeRateVal.toString());
      localStorage.setItem('amexThresholdRate', thresholdVal.toString());
      showToast('Reconciliation & AMEX fee rules saved successfully!', 'success');
      calculateReconciliation(); // Recalculate summary details instantly
    });
  }
  
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
  
  if (selectLoadHistory) {
    selectLoadHistory.addEventListener('change', (e) => {
      const val = e.target.value;
      if (val === '') {
        resetAppInputs();
      } else {
        editReportRecord(val);
      }
    });
  }
  if (btnRefresh) {
    btnRefresh.addEventListener('click', () => {
      loadDataFromServer();
      showToast('Data refreshed from server.', 'success');
    });
  }
  if (btnNewEntry) {
    btnNewEntry.addEventListener('click', () => {
      if (confirm('Start a new entry? This will clear all numbers in the current workspace.')) {
        resetAppInputs();
        showToast('Ready for new entry.', 'info');
      }
    });
  }
  
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
  


  // Global click listeners
  document.addEventListener('click', (e) => {
    // 1. Automatically trigger browser datepicker when clicking anywhere on a date input
    if (e.target && e.target.type === 'date') {
      try {
        e.target.showPicker();
      } catch (err) {}
    }

    // 2. Card collapse toggler
    const collapseBtn = e.target.closest('.btn-collapse');
    if (collapseBtn) {
      const card = collapseBtn.closest('.card');
      if (card) {
        card.classList.toggle('collapsed');
      }
    }
  });

  const btnRefreshStatus = document.getElementById('btn-refresh-status');
  if (btnRefreshStatus) {
    btnRefreshStatus.addEventListener('click', loadLiveStatusBoard);
  }

  // Check auth session on startup
  checkSession();
  
  initChart();
  lucide.createIcons();
});

// --- MATH PARSING FUNCTION (EXCEL-STYLE SUMMING) ---

function parseMathExpression(val) {
  if (val === undefined || val === null || val === '') return 0;
  if (typeof val === 'number') return val;
  
  const parts = val.toString().split('+');
  let sum = 0;
  parts.forEach(p => {
    const cleaned = p.replace(/[^0-9.]/g, '');
    const num = parseFloat(cleaned);
    if (!isNaN(num)) {
      sum += num;
    }
  });
  return sum;
}

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
  
  // Explicitly close settings on refresh/startup
  toggleSettingsView(false);

  const roleLabel = currentUser.role === 'admin' ? 'Admin' : 'User';
  userDisplayName.textContent = `${currentUser.username} (${roleLabel})`;
  
  if (currentUser.role === 'admin') {
    btnSettingsToggle.style.display = '';
    btnSettingsToggle.classList.remove('hidden');
  } else {
    btnSettingsToggle.style.display = 'none';
    btnSettingsToggle.classList.add('hidden');
  }
  
  // Initialize view states
  if (activeTab === 'live') {
    toggleWorkspaceView('live');
  } else {
    toggleWorkspaceView('workspace');
    resetAppInputs();
    loadDataFromServer();
  }
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
  const compButtons = companyTabsContainer.querySelectorAll('.company-tab');
  compButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      compButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeCompany = btn.getAttribute('data-company');
      
      toggleSettingsView(false);
      
      // Update active company indicator text
      const compName = activeCompany === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';
      const companyIndicator = document.getElementById('active-company-indicator');
      if (companyIndicator) {
        companyIndicator.className = 'active-company-indicator';
        if (activeCompany === 'ws_hospitality') {
          companyIndicator.classList.add('indicator-orange');
          companyIndicator.innerHTML = `<i data-lucide="building"></i> Active Workspace: <strong>${compName}</strong>`;
        } else {
          companyIndicator.classList.add('indicator-yellow');
          companyIndicator.innerHTML = `<i data-lucide="hotel"></i> Active Workspace: <strong>${compName}</strong>`;
        }
      }
      lucide.createIcons();

      if (activeTab !== 'live') {
        resetAppInputs();
        loadDataFromServer();
      }
      showToast(`Switched workspace to ${btn.textContent}`, 'info');
    });
  });

  const subButtons = subTabsContainer.querySelectorAll('.sub-tab');
  subButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      subButtons.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      activeTab = btn.getAttribute('data-tab');

      toggleSettingsView(false);

      if (activeTab === 'live') {
        toggleWorkspaceView('live');
      } else {
        toggleWorkspaceView('workspace');
        resetAppInputs();
        loadDataFromServer();
      }
    });
  });
}

function resetAppInputs() {
  activeLoadedReportId = null;
  if (selectLoadHistory) selectLoadHistory.value = '';

  hotelColumns = [];
  restaurantColumns = [];
  
  // Reset dynamic categories to single-line default configurations
  hotelCategories = getInitialCategories();
  restaurantCategories = getInitialCategories();

  const seed = Date.now();
  bankPostings = {
    visa: [{ id: `visa_${seed}_0`, value: '' }],
    mc: [{ id: `mc_${seed}_0`, value: '' }],
    discover: [{ id: `discover_${seed}_0`, value: '' }],
    debit1: [{ id: `debit1_${seed}_0`, value: '' }],
    debit2: [{ id: `debit2_${seed}_0`, value: '' }],
    amex: [{ id: `amex_${seed}_0`, value: '' }]
  };
  
  if (activeTab === 'cards') {
    bankBadgeTitle.textContent = "Bank Settled (Visa/MC/Discover/Debit)";
  } else {
    bankBadgeTitle.textContent = "Bank Settled (AMEX)";
  }
  
  renderTbLabels(hotelLabelsContainer, true);
  renderTbLabels(restaurantLabelsContainer, false);
  renderBankInputsList();
  
  addTbColumn(true);
  addTbColumn(false);

  calculateReconciliation();
}

function renderTbLabels(container, isHotel) {
  container.innerHTML = '';
  
  const headerCell = document.createElement('div');
  headerCell.className = 'sheet-label-cell header-cell';
  headerCell.textContent = 'TB Date';
  container.appendChild(headerCell);

  const catsObj = isHotel ? hotelCategories[activeTab] : restaurantCategories[activeTab];
  Object.keys(catsObj).forEach(catId => {
    const cat = catsObj[catId];
    
    // 1. Category Main Header row with dynamic "+ Add Line" button
    const catHeaderCell = document.createElement('div');
    catHeaderCell.className = 'sheet-label-cell cat-header-cell';
    catHeaderCell.innerHTML = `
      <span>${cat.name}</span>
      <button type="button" class="btn-add-sub-line" onclick="addTbLine(${isHotel}, '${catId}')" title="Add Line">
        <i data-lucide="plus"></i>
      </button>
    `;
    container.appendChild(catHeaderCell);

    // 2. Render individual dynamic sub-lines with trash delete buttons
    cat.lines.forEach(line => {
      const lineCell = document.createElement('div');
      lineCell.className = 'sheet-label-cell';
      lineCell.style.paddingLeft = '24px';
      lineCell.style.display = 'flex';
      lineCell.style.justifyContent = 'space-between';
      lineCell.style.alignItems = 'center';
      
      let deleteBtnHtml = '';
      if (cat.lines.length > 1) {
        deleteBtnHtml = `
          <button type="button" class="btn-del-col" onclick="deleteTbLine(${isHotel}, '${catId}', '${line.id}')" title="Delete Line" style="padding: 2px;">
            <i data-lucide="trash-2" style="width: 12px; height: 12px;"></i>
          </button>
        `;
      }
      
      lineCell.innerHTML = `
        <span style="font-weight: normal; font-size: 0.75rem; color: var(--text-secondary);">${line.label}</span>
        ${deleteBtnHtml}
      `;
      container.appendChild(lineCell);
    });
  });
  
  lucide.createIcons();
}

window.addTbLine = function(isHotel, catId) {
  const cats = isHotel ? hotelCategories[activeTab] : restaurantCategories[activeTab];
  const cat = cats[catId];
  if (!cat) return;

  const newId = `${catId}_${Date.now()}_${cat.lines.length}`;
  cat.lines.push({
    id: newId,
    label: `Line ${cat.lines.length + 1}`
  });

  // Expand value dictionary for all columns in this spreadsheet
  const cols = isHotel ? hotelColumns : restaurantColumns;
  cols.forEach(col => {
    col.values[newId] = '';
  });

  // Rerender sheet layout
  if (isHotel) {
    renderTbLabels(hotelLabelsContainer, true);
    renderGridColumns(hotelColumnsContainer, hotelColumns, true);
  } else {
    renderTbLabels(restaurantLabelsContainer, false);
    renderGridColumns(restaurantColumnsContainer, restaurantColumns, false);
  }

  calculateReconciliation();
};

window.deleteTbLine = function(isHotel, catId, lineId) {
  const cats = isHotel ? hotelCategories[activeTab] : restaurantCategories[activeTab];
  const cat = cats[catId];
  if (!cat) return;
  if (cat.lines.length <= 1) {
    showToast('Cannot delete the only remaining line for this category.', 'error');
    return;
  }

  // Remove cell
  cat.lines = cat.lines.filter(l => l.id !== lineId);
  // Re-label lines sequentially
  cat.lines.forEach((l, index) => {
    l.label = `Line ${index + 1}`;
  });

  // Rerender sheet layout
  if (isHotel) {
    renderTbLabels(hotelLabelsContainer, true);
    renderGridColumns(hotelColumnsContainer, hotelColumns, true);
  } else {
    renderTbLabels(restaurantLabelsContainer, false);
    renderGridColumns(restaurantColumnsContainer, restaurantColumns, false);
  }

  calculateReconciliation();
};

function renderBankInputsList() {
  bankLabelsContainer.innerHTML = '';
  bankColumnsContainer.innerHTML = '';

  const categories = activeTab === 'cards'
    ? [
        { id: 'visa', name: 'Visa Settled' },
        { id: 'mc', name: 'MasterCard (MC) Settled' },
        { id: 'discover', name: 'Discover Settled' },
        { id: 'debit1', name: 'Debit 1 Settled' },
        { id: 'debit2', name: 'Debit 2 Settled' }
      ]
    : [
        { id: 'amex', name: 'AMEX Settled' }
      ];

  // --- 1. RENDER LABELS COLUMN ---
  const headerLabelCell = document.createElement('div');
  headerLabelCell.className = 'sheet-label-cell header-cell';
  headerLabelCell.innerHTML = 'Bank Category';
  bankLabelsContainer.appendChild(headerLabelCell);

  categories.forEach(cat => {
    // Category Header row
    const catRow = document.createElement('div');
    catRow.className = 'sheet-label-cell cat-header-cell';
    catRow.innerHTML = `
      <span>${cat.name}</span>
      <button type="button" class="btn-add-sub-line" onclick="addBankPostingRow('${cat.id}')" title="Add Line">
        <i data-lucide="plus"></i>
      </button>
    `;
    bankLabelsContainer.appendChild(catRow);

    // Dynamic line rows
    const postings = bankPostings[cat.id] || [];
    postings.forEach((post, index) => {
      const lineRow = document.createElement('div');
      lineRow.className = 'sheet-label-cell';
      lineRow.style.fontWeight = 'normal';
      lineRow.style.fontSize = '0.75rem';
      lineRow.style.paddingLeft = '18px';
      lineRow.style.color = 'var(--text-muted)';
      lineRow.style.display = 'flex';
      lineRow.style.justifyContent = 'space-between';
      lineRow.style.alignItems = 'center';

      let deleteBtnHtml = '';
      if (postings.length > 1) {
        deleteBtnHtml = `
          <button type="button" class="btn-del-col" onclick="deleteBankPostingRow('${cat.id}', '${post.id}')" title="Delete Line" style="padding: 1px;">
            <i data-lucide="trash-2" style="width: 10px; height: 10px;"></i>
          </button>
        `;
      }

      lineRow.innerHTML = `
        <span>Line #${index + 1}</span>
        ${deleteBtnHtml}
      `;
      bankLabelsContainer.appendChild(lineRow);
    });
  });

  // --- 2. RENDER SINGLE VALUE COLUMN ---
  const col = document.createElement('div');
  col.className = 'spreadsheet-col';
  col.style.flex = '1';

  // Header value cell
  const headerValCell = document.createElement('div');
  headerValCell.className = 'sheet-value-cell header-cell';
  headerValCell.style.justifyContent = 'center';
  
  const dateInput = document.createElement('input');
  dateInput.type = 'date';
  dateInput.id = 'bank-date';
  dateInput.required = true;
  
  const savedDateInput = document.querySelector('.bank-card input[type="date"]');
  const savedDate = savedDateInput ? savedDateInput.value : '';
  dateInput.value = savedDate || formatDate(new Date());
  
  dateInput.addEventListener('change', calculateReconciliation);
  headerValCell.appendChild(dateInput);
  col.appendChild(headerValCell);

  categories.forEach(cat => {
    // Spacer row for Category Header
    const catSpacer = document.createElement('div');
    catSpacer.className = 'sheet-value-cell cat-header-spacer';
    col.appendChild(catSpacer);

    // Input fields row
    const postings = bankPostings[cat.id] || [];
    postings.forEach((post, index) => {
      const inputCell = document.createElement('div');
      inputCell.className = 'sheet-value-cell';
      inputCell.innerHTML = `
        <div class="input-prefix">
          <span>$</span>
          <input type="text" id="bank-post-${post.id}" placeholder="0.00" value="${post.value}">
        </div>
      `;
      col.appendChild(inputCell);

      const inputField = inputCell.querySelector('input');
      inputField.addEventListener('input', (e) => {
        post.value = e.target.value;
        calculateReconciliation();
      });
    });
  });

  bankColumnsContainer.appendChild(col);
  lucide.createIcons();
}

window.addBankPostingRow = function(catId) {
  if (!bankPostings[catId]) bankPostings[catId] = [];
  const seed = Date.now();
  bankPostings[catId].push({ id: `${catId}_${seed}_${bankPostings[catId].length}`, value: '' });
  renderBankInputsList();
  calculateReconciliation();
};

window.deleteBankPostingRow = function(catId, postId) {
  if (!bankPostings[catId] || bankPostings[catId].length <= 1) return;
  bankPostings[catId] = bankPostings[catId].filter(p => p.id !== postId);
  renderBankInputsList();
  calculateReconciliation();
};

function addTbColumn(isHotel, initialValues = null) {
  const defaultDate = formatDate(new Date());
  const cats = isHotel ? hotelCategories[activeTab] : restaurantCategories[activeTab];
  
  const defaultValues = {};
  Object.keys(cats).forEach(catId => {
    cats[catId].lines.forEach(line => {
      defaultValues[line.id] = initialValues ? (initialValues[line.id] || '') : '';
    });
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
  const catsObj = isHotel ? hotelCategories[activeTab] : restaurantCategories[activeTab];

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

    // Loop categories to build cell rows aligned perfectly with left labels
    Object.keys(catsObj).forEach(catId => {
      const cat = catsObj[catId];
      
      // 1. Spacing row matching the category header label
      const spacerCell = document.createElement('div');
      spacerCell.className = 'sheet-value-cell cat-header-spacer';
      colDiv.appendChild(spacerCell);

      // 2. Dynamic sub-line rows containing text input cells
      cat.lines.forEach(line => {
        const valCell = document.createElement('div');
        valCell.className = 'sheet-value-cell';

        const inputPrefix = document.createElement('div');
        inputPrefix.className = 'input-prefix';

        const dollarSpan = document.createElement('span');
        dollarSpan.textContent = '$';
        inputPrefix.appendChild(dollarSpan);

        const input = document.createElement('input');
        input.type = 'text'; // supports formulas e.g. 10+20
        input.placeholder = '0.00';
        
        if (col.values[line.id] === undefined) {
          col.values[line.id] = '';
        }
        input.value = col.values[line.id];
        
        input.addEventListener('input', (e) => {
          col.values[line.id] = e.target.value;
          calculateReconciliation();
        });

        inputPrefix.appendChild(input);
        valCell.appendChild(inputPrefix);
        colDiv.appendChild(valCell);
      });
    });

    container.appendChild(colDiv);
  });
  
  lucide.createIcons();
}

// --- CORE RECONCILIATION CALCULATION LOGIC ---

function sumCategory(cols, catId, isHotel) {
  let sum = 0;
  const catsObj = isHotel ? hotelCategories[activeTab] : restaurantCategories[activeTab];
  const cat = catsObj[catId];
  if (!cat) return 0;
  
  cols.forEach(col => {
    cat.lines.forEach(line => {
      const val = col.values[line.id];
      sum += parseMathExpression(val);
    });
  });
  return sum;
}

function runReconciliationLogic() {
  const result = {
    tbSums: {}, // Combined sum of Hotel + Restaurant category sums
    bank: {},
    rows: [],
    totalLedger: 0,
    totalBank: 0,
    netDiscrepancy: 0
  };

  // 1. Gather Bank Statement Inputs (summing across postings arrays)
  const activeKeys = activeTab === 'cards' ? ['visa', 'mc', 'discover', 'debit1', 'debit2'] : ['amex'];
  activeKeys.forEach(key => {
    let sum = 0;
    const postings = bankPostings[key] || [];
    postings.forEach(p => {
      sum += parseMathExpression(p.value);
    });
    result.bank[key] = sum;
  });

  // 2. Sum Trial Balance categories (Combined Hotel + Restaurant category sums)
  const rows = activeTab === 'cards' ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(r => {
    const hotelSum = sumCategory(hotelColumns, r.id, true);
    const restaurantSum = sumCategory(restaurantColumns, r.id, false);
    result.tbSums[r.id] = hotelSum + restaurantSum;
  });

  // 3. Map values and calculate discrepancies
  if (activeTab === 'cards') {
    // Visa
    const visaLedger = result.tbSums['visa'] + result.tbSums['visapos'];
    const visaBank = result.bank['visa'];
    const visaDiff = visaLedger - visaBank;
    result.rows.push({ name: 'Visa (Sales + POS)', ledger: visaLedger, bank: visaBank, diff: visaDiff });

    // MC
    const mcLedger = result.tbSums['mc'] + result.tbSums['mcpos'];
    const mcBank = result.bank['mc'];
    const mcDiff = mcLedger - mcBank;
    result.rows.push({ name: 'MasterCard (Sales + POS)', ledger: mcLedger, bank: mcBank, diff: mcDiff });

    // Discover
    const discLedger = result.tbSums['discover'] + result.tbSums['diner'];
    const discBank = result.bank['discover'];
    const discDiff = discLedger - discBank;
    result.rows.push({ name: 'Discover (Discover + Diner)', ledger: discLedger, bank: discBank, diff: discDiff });

    // Debit 1
    const d1Ledger = result.tbSums['debit1'];
    const d1Bank = result.bank['debit1'];
    const d1Diff = d1Ledger - d1Bank;
    result.rows.push({ name: 'Debit 1', ledger: d1Ledger, bank: d1Bank, diff: d1Diff });

    // Debit 2
    const d2Ledger = result.tbSums['debit2'];
    const d2Bank = result.bank['debit2'];
    const d2Diff = d2Ledger - d2Bank;
    result.rows.push({ name: 'Debit 2', ledger: d2Ledger, bank: d2Bank, diff: d2Diff });

  } else {
    // AMEX Reconciliation
    const amexLedger = result.tbSums['amex'] + result.tbSums['amexpos'];
    const amexBank = result.bank['amex'];
    const amexDiff = amexLedger - amexBank;
    result.rows.push({ name: 'American Express (AMEX)', ledger: amexLedger, bank: amexBank, diff: amexDiff });
  }

  // 4. Calculate Totals
  result.rows.forEach(r => {
    result.totalLedger += r.ledger;
    result.totalBank += r.bank;
  });
  result.netDiscrepancy = result.totalLedger - result.totalBank;

  return result;
}

function calculateReconciliation() {
  const result = runReconciliationLogic();

  // Save state globally for exports
  bankValues = result.bank;

  // Update Live Summary date range labels
  const liveSummaryDates = document.getElementById('live-summary-dates');
  const summaryTbDateVal = document.getElementById('summary-tb-date-val');
  const summaryBankDateVal = document.getElementById('summary-bank-date-val');

  const hotelDates = hotelColumns.filter(col => {
    return Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
  }).map(c => c.date);
  
  const restaurantDates = restaurantColumns.filter(col => {
    return Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
  }).map(c => c.date);
  
  let allDates = [...hotelDates, ...restaurantDates].sort();
  if (allDates.length === 0) {
    allDates = [...hotelColumns, ...restaurantColumns].map(c => c.date).sort();
  }
  const sortedUniqueDates = [...new Set(allDates)].filter(Boolean);
  
  let dateRangeStr = '';
  if (sortedUniqueDates.length === 1) {
    const options = { month: 'short', day: 'numeric' };
    dateRangeStr = new Date(sortedUniqueDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
  } else if (sortedUniqueDates.length > 1) {
    const options = { month: 'short', day: 'numeric' };
    const startFmt = new Date(sortedUniqueDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
    const endFmt = new Date(sortedUniqueDates[sortedUniqueDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
    dateRangeStr = `${startFmt} - ${endFmt}`;
  }

  const isAllZero = result.totalLedger === 0 && result.totalBank === 0;

  // Toggle meta dates visibility
  const metaContainer = document.querySelector('.recon-summary-meta');
  if (metaContainer) {
    metaContainer.style.display = isAllZero ? 'none' : 'flex';
  }

  if (liveSummaryDates) {
    liveSummaryDates.textContent = (!isAllZero && dateRangeStr) ? `(${dateRangeStr})` : '';
  }

  if (summaryTbDateVal) {
    summaryTbDateVal.textContent = (!isAllZero && dateRangeStr) ? dateRangeStr : 'N/A';
  }

  if (summaryBankDateVal) {
    const bankDateInput = document.getElementById('bank-date');
    if (bankDateInput && bankDateInput.value && !isAllZero) {
      const options = { month: 'short', day: 'numeric', year: 'numeric' };
      summaryBankDateVal.textContent = new Date(bankDateInput.value + 'T00:00:00').toLocaleDateString('en-US', options);
    } else {
      summaryBankDateVal.textContent = 'N/A';
    }
  }

  // Dynamically update headers/labels based on Tab
  const theadEl = document.getElementById('recon-thead');
  if (theadEl) {
    if (activeTab === 'amex') {
      theadEl.innerHTML = `
        <tr>
          <th>Category</th>
          <th class="num-col">Ledger Total (CB)</th>
          <th class="num-col">Bank Statement</th>
          <th class="num-col">Fee (%)</th>
          <th class="num-col">Fee2 (${amexFeeRateSetting}%)</th>
          <th>Status</th>
        </tr>
      `;
    } else {
      theadEl.innerHTML = `
        <tr>
          <th>Category</th>
          <th class="num-col">Ledger Total (CB)</th>
          <th class="num-col">Bank Statement</th>
          <th class="num-col" id="recon-diff-header">Discrepancy</th>
          <th>Status</th>
        </tr>
      `;
    }
  }

  const discrepancyLabelText = document.getElementById('discrepancy-label-text');
  if (discrepancyLabelText) {
    discrepancyLabelText.textContent = activeTab === 'amex' ? 'Fee' : 'Net Discrepancy';
  }

  // Render to Live Table
  reconTbody.innerHTML = '';
  result.rows.forEach(r => {
    const row = document.createElement('tr');
    
    if (activeTab === 'amex') {
      // AMEX layout: Category | Ledger | Bank | Fee (%) | Fee2 | Status
      const calcFee = r.ledger - r.bank;
      const calcPercent = r.ledger > 0.005 ? ((calcFee / r.ledger) * 100) : 0;
      const expectedFee = r.ledger * (amexFeeRateSetting / 100);
      
      let statusText = '';
      if (!isAllZero) {
        if (calcPercent > amexThresholdRateSetting) {
          statusText = '<span class="status-pill status-discrepant" style="background-color: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.25);"><i data-lucide="alert-circle"></i> Fee Exceeds Max</span>';
        } else if (calcFee > expectedFee + 0.005) {
          statusText = '<span class="status-pill status-discrepant" style="background-color: rgba(245,158,11,0.1); color: var(--accent-yellow); border-color: rgba(245,158,11,0.25);"><i data-lucide="alert-triangle"></i> Fee Warning</span>';
        } else {
          statusText = '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Reconciled</span>';
        }
      }
      
      row.innerHTML = `
        <td><strong>${r.name}</strong></td>
        <td class="num-col">${formatCurrency(r.ledger)}</td>
        <td class="num-col">${formatCurrency(r.bank)}</td>
        <td class="num-col val-neutral">${formatCurrency(calcFee)} (${calcPercent.toFixed(2)}%)</td>
        <td class="num-col val-neutral">${formatCurrency(expectedFee)}</td>
        <td>${statusText}</td>
      `;
    } else {
      // Cards layout: standard columns
      const diffClass = r.diff > 0.005 ? 'val-positive' : (r.diff < -0.005 ? 'val-negative' : 'val-neutral');
      let statusText = '';
      if (!isAllZero) {
        statusText = Math.abs(r.diff) <= 0.005 
          ? '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Reconciled</span>' 
          : '<span class="status-pill status-discrepant"><i data-lucide="alert-triangle"></i> Discrepant</span>';
      }

      row.innerHTML = `
        <td><strong>${r.name}</strong></td>
        <td class="num-col">${formatCurrency(r.ledger)}</td>
        <td class="num-col">${formatCurrency(r.bank)}</td>
        <td class="num-col ${diffClass}">${r.diff > 0.005 ? '+' : ''}${formatCurrency(r.diff)}</td>
        <td>${statusText}</td>
      `;
    }
    reconTbody.appendChild(row);
  });

  // Render Summary Bottom Row
  const totalRow = document.createElement('tr');
  totalRow.style.fontWeight = 'bold';
  totalRow.style.borderTop = '2px solid var(--border-color)';
  
  if (activeTab === 'amex') {
    const totalCalcFee = result.totalLedger - result.totalBank;
    const totalCalcPercent = result.totalLedger > 0.005 ? ((totalCalcFee / result.totalLedger) * 100) : 0;
    const totalExpectedFee = result.totalLedger * (amexFeeRateSetting / 100);
    
    let netStatus = '';
    if (!isAllZero) {
      if (totalCalcPercent > amexThresholdRateSetting) {
        netStatus = '<span class="status-pill status-discrepant" style="background-color: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.25);"><i data-lucide="alert-circle"></i> Out of Limit</span>';
      } else if (totalCalcFee > totalExpectedFee + 0.005) {
        netStatus = '<span class="status-pill status-discrepant" style="background-color: rgba(245,158,11,0.1); color: var(--accent-yellow); border-color: rgba(245,158,11,0.25);"><i data-lucide="alert-triangle"></i> Fee Warning</span>';
      } else {
        netStatus = '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Balanced</span>';
      }
    }

    totalRow.innerHTML = `
      <td>TOTALS</td>
      <td class="num-col">${formatCurrency(result.totalLedger)}</td>
      <td class="num-col">${formatCurrency(result.totalBank)}</td>
      <td class="num-col val-neutral">${formatCurrency(totalCalcFee)} (${totalCalcPercent.toFixed(2)}%)</td>
      <td class="num-col val-neutral">${formatCurrency(totalExpectedFee)}</td>
      <td>${netStatus}</td>
    `;
    reconTbody.appendChild(totalRow);

    // Update Summary displays
    totalLedgerDisplay.textContent = formatCurrency(result.totalLedger);
    totalBankDisplay.textContent = formatCurrency(result.totalBank);
    netDiscrepancyDisplay.textContent = formatCurrency(totalCalcFee);

    const discCard = document.getElementById('card-discrepancy');
    const isWarning = totalCalcFee > totalExpectedFee + 0.005;
    const isExceeded = totalCalcPercent > amexThresholdRateSetting;

    if (isAllZero) {
      netDiscrepancyDisplay.className = 'val-neutral';
      discrepancyIcon.setAttribute('data-lucide', 'check-circle-2');
      discrepancyIconContainer.style.setProperty('--icon-color', 'var(--accent-green)');
      discCard.style.boxShadow = 'none';
    } else if (isExceeded) {
      netDiscrepancyDisplay.className = 'val-negative';
      discrepancyIcon.setAttribute('data-lucide', 'alert-circle');
      discrepancyIconContainer.style.setProperty('--icon-color', 'var(--accent-red)');
      discCard.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.15)';
    } else if (isWarning) {
      netDiscrepancyDisplay.className = 'val-neutral';
      discrepancyIcon.setAttribute('data-lucide', 'alert-triangle');
      discrepancyIconContainer.style.setProperty('--icon-color', 'var(--accent-yellow)');
      discCard.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.15)';
    } else {
      netDiscrepancyDisplay.className = 'val-neutral';
      discrepancyIcon.setAttribute('data-lucide', 'check-circle-2');
      discrepancyIconContainer.style.setProperty('--icon-color', 'var(--accent-green)');
      discCard.style.boxShadow = 'none';
    }
  } else {
    // Standard cards layout
    const netClass = result.netDiscrepancy > 0.005 ? 'val-positive' : (result.netDiscrepancy < -0.005 ? 'val-negative' : 'val-neutral');
    let netStatus = '';
    if (!isAllZero) {
      netStatus = Math.abs(result.netDiscrepancy) <= 0.005 
        ? '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Balanced</span>' 
        : '<span class="status-pill status-discrepant"><i data-lucide="alert-circle"></i> Out of Balance</span>';
    }

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
      populateHistoryDropdown();
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

  // Create range label for history
  let tbDateLabel = '';
  const hotelDates = hotelColumns.filter(col => {
    return Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
  }).map(c => c.date);
  
  const restaurantDates = restaurantColumns.filter(col => {
    return Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
  }).map(c => c.date);
  
  let allDates = [...hotelDates, ...restaurantDates].sort();
  if (allDates.length === 0) {
    allDates = [...hotelColumns, ...restaurantColumns].map(c => c.date).sort();
  }
  const sortedUniqueDates = [...new Set(allDates)].filter(Boolean);

  if (sortedUniqueDates.length === 1) {
    const options = { month: 'short', day: 'numeric' };
    tbDateLabel = new Date(sortedUniqueDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
  } else if (sortedUniqueDates.length > 1) {
    const options = { month: 'short', day: 'numeric' };
    const startFmt = new Date(sortedUniqueDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
    const endFmt = new Date(sortedUniqueDates[sortedUniqueDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
    tbDateLabel = `${startFmt} - ${endFmt}`;
  } else {
    tbDateLabel = 'No Dates';
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
    hotelColumns: JSON.parse(JSON.stringify(hotelColumns)),
    restaurantColumns: JSON.parse(JSON.stringify(restaurantColumns)),
    // Store categories structure inside report for history reload layout preservation
    hotelCategories: JSON.parse(JSON.stringify(hotelCategories)),
    restaurantCategories: JSON.parse(JSON.stringify(restaurantCategories)),
    bankPostings: JSON.parse(JSON.stringify(bankPostings)),
    bank: calculation.bank, 
    totalLedger: calculation.totalLedger,
    totalBank: calculation.totalBank,
    netDiscrepancy: calculation.netDiscrepancy,
    timestamp: new Date().getTime()
  };

  showToast('Saving report to database...', 'info');

  const performSave = () => {
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
        resetAppInputs();
        loadDataFromServer();
        
        // Switch active tab to LIVE status dashboard
        activeTab = 'live';
        const subButtons = subTabsContainer.querySelectorAll('.sub-tab');
        subButtons.forEach(btn => {
          btn.classList.toggle('active', btn.getAttribute('data-tab') === 'live');
        });
        toggleWorkspaceView('live');
      })
      .catch(err => {
        console.error(err);
        showToast('Error saving report to server', 'error');
      });
  };

  // If editing and the date is modified, delete the old ID key first to prevent duplicates!
  if (activeLoadedReportId && activeLoadedReportId !== reportId) {
    fetch(`/api/history/${activeLoadedReportId}`, { method: 'DELETE' })
      .then(res => {
        if (!res.ok) console.warn('Could not delete old record key during edit update');
        performSave();
      })
      .catch(err => {
        console.error(err);
        performSave();
      });
  } else {
    performSave();
  }
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
    activeLoadedReportId = id;
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

    // Load dynamic categories layout from saved report, or fallback to default single lines
    if (report.hotelCategories) {
      hotelCategories = JSON.parse(JSON.stringify(report.hotelCategories));
      restaurantCategories = JSON.parse(JSON.stringify(report.restaurantCategories || report.hotelCategories));
    } else {
      hotelCategories = getInitialCategories();
      restaurantCategories = getInitialCategories();
    }

    // Load columns
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

    // Backwards compatibility remapping: if values are at category key names (e.g. 'visa'), remap them to first line ID (e.g. 'visa_0')
    const colsList = [...hotelColumns, ...restaurantColumns];
    colsList.forEach(col => {
      const legacyIds = ['visa', 'mc', 'discover', 'debit1', 'debit2', 'visapos', 'mcpos', 'diner', 'amex', 'amexpos'];
      legacyIds.forEach(id => {
        if (col.values[id] !== undefined && col.values[`${id}_0`] === undefined) {
          col.values[`${id}_0`] = col.values[id];
        }
      });
    });

    // Rerender sheet grids
    renderTbLabels(hotelLabelsContainer, true);
    renderTbLabels(restaurantLabelsContainer, false);

    renderGridColumns(hotelColumnsContainer, hotelColumns, true);
    renderGridColumns(restaurantColumnsContainer, restaurantColumns, false);

    const bankDateInput = document.getElementById('bank-date');
    if (bankDateInput) bankDateInput.value = report.bankDate;

    // Load bank statement postings list
    if (report.bankPostings) {
      bankPostings = JSON.parse(JSON.stringify(report.bankPostings));
    } else if (report.bank) {
      bankPostings = {
        visa: [{ id: 'visa_loaded', value: report.bank['visa'] || '' }],
        mc: [{ id: 'mc_loaded', value: report.bank['mc'] || '' }],
        discover: [{ id: 'discover_loaded', value: report.bank['discover'] || '' }],
        debit1: [{ id: 'debit1_loaded', value: report.bank['debit1'] || '' }],
        debit2: [{ id: 'debit2_loaded', value: report.bank['debit2'] || '' }],
        amex: [{ id: 'amex_loaded', value: report.bank['amex'] || '' }]
      };
    } else {
      const seed = Date.now();
      bankPostings = {
        visa: [{ id: `visa_${seed}`, value: '' }],
        mc: [{ id: `mc_${seed}`, value: '' }],
        discover: [{ id: `discover_${seed}`, value: '' }],
        debit1: [{ id: `debit1_${seed}`, value: '' }],
        debit2: [{ id: `debit2_${seed}`, value: '' }],
        amex: [{ id: `amex_${seed}`, value: '' }]
      };
    }

    renderBankInputsList();

    calculateReconciliation();
    toggleSettingsView(false);
    populateHistoryDropdown();
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
  
  // Sort the filtered array
  const sorted = [...filtered];
  sorted.sort((a, b) => {
    let valA = a[historySortColumn];
    let valB = b[historySortColumn];

    if (historySortColumn === 'status') {
      const getStatusLabel = (item) => {
        if (activeTab === 'amex') {
          const calcFee = item.totalLedger - item.totalBank;
          const calcPercent = item.totalLedger > 0.005 ? ((calcFee / item.totalLedger) * 100) : 0;
          const expectedFee = item.totalLedger * (amexFeeRateSetting / 100);
          if (calcPercent > amexThresholdRateSetting) return 'z-exceeded';
          if (calcFee > expectedFee + 0.005) return 'y-warning';
          return 'x-balanced';
        } else {
          return Math.abs(item.netDiscrepancy) <= 0.005 ? 'balanced' : 'discrepant';
        }
      };
      valA = getStatusLabel(a);
      valB = getStatusLabel(b);
    }

    if (valA === undefined || valA === null) valA = '';
    if (valB === undefined || valB === null) valB = '';

    if (typeof valA === 'string') {
      return historySortAscending ? valA.localeCompare(valB) : valB.localeCompare(valA);
    } else {
      return historySortAscending ? valA - valB : valB - valA;
    }
  });

  // Rebuild the history table head dynamically based on Tab type
  const historyTheadEl = document.getElementById('history-thead');
  if (historyTheadEl) {
    if (activeTab === 'amex') {
      historyTheadEl.innerHTML = `
        <tr>
          <th onclick="sortHistory('tbDateLabel')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            TB Range / Date <span id="sort-icon-tbDateLabel" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('bankDate')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Bank Date <span id="sort-icon-bankDate" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('totalLedger')" class="num-col" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Total Ledger Receipts <span id="sort-icon-totalLedger" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('totalBank')" class="num-col" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Total Bank Deposits <span id="sort-icon-totalBank" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('netDiscrepancy')" class="num-col" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Fee (%) <span id="sort-icon-netDiscrepancy" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th class="num-col" style="user-select: none; white-space: nowrap;">
            Fee2 (${amexFeeRateSetting}%)
          </th>
          <th onclick="sortHistory('status')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Status <span id="sort-icon-status" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('timestamp')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Saved Time <span id="sort-icon-timestamp" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th class="actions-col">Actions</th>
        </tr>
      `;
    } else {
      historyTheadEl.innerHTML = `
        <tr>
          <th onclick="sortHistory('tbDateLabel')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            TB Range / Date <span id="sort-icon-tbDateLabel" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('bankDate')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Bank Date <span id="sort-icon-bankDate" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('totalLedger')" class="num-col" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Total Ledger Receipts <span id="sort-icon-totalLedger" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('totalBank')" class="num-col" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Total Bank Deposits <span id="sort-icon-totalBank" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('netDiscrepancy')" class="num-col" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Net Discrepancy <span id="sort-icon-netDiscrepancy" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('status')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Status <span id="sort-icon-status" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th onclick="sortHistory('timestamp')" style="cursor: pointer; user-select: none; white-space: nowrap;">
            Saved Time <span id="sort-icon-timestamp" style="font-size: 0.7rem; margin-left: 4px;"></span>
          </th>
          <th class="actions-col">Actions</th>
        </tr>
      `;
    }
  }

  // Update sort icons in DOM
  const columnsList = ['tbDateLabel', 'bankDate', 'totalLedger', 'totalBank', 'netDiscrepancy', 'status', 'timestamp'];
  columnsList.forEach(col => {
    const indicator = document.getElementById(`sort-icon-${col}`);
    if (indicator) {
      if (historySortColumn === col) {
        indicator.innerHTML = historySortAscending ? '▲' : '▼';
        indicator.style.color = 'var(--accent-blue)';
      } else {
        indicator.innerHTML = '⇅';
        indicator.style.color = 'var(--text-muted)';
      }
    }
  });

  historyTbody.innerHTML = '';
  historyCount.textContent = `${sorted.length} report${sorted.length === 1 ? '' : 's'}`;

  if (sorted.length === 0) {
    noHistoryMessage.classList.remove('hidden');
    return;
  }
  noHistoryMessage.classList.add('hidden');

  sorted.forEach(r => {
    const row = document.createElement('tr');
    const timeStr = r.timestamp 
      ? new Date(r.timestamp).toLocaleString('en-US', { dateStyle: 'short', timeStyle: 'short' }) 
      : 'N/A';

    if (activeTab === 'amex') {
      const calcFee = r.totalLedger - r.totalBank;
      const calcPercent = r.totalLedger > 0.005 ? ((calcFee / r.totalLedger) * 100) : 0;
      const expectedFee = r.totalLedger * (amexFeeRateSetting / 100);

      let statusText = '';
      if (calcPercent > amexThresholdRateSetting) {
        statusText = '<span class="status-pill status-discrepant" style="background-color: rgba(239,68,68,0.1); color: var(--accent-red); border-color: rgba(239,68,68,0.25);"><i data-lucide="alert-circle"></i> Fee Exceeds Max</span>';
      } else if (calcFee > expectedFee + 0.005) {
        statusText = '<span class="status-pill status-discrepant" style="background-color: rgba(245,158,11,0.1); color: var(--accent-yellow); border-color: rgba(245,158,11,0.25);"><i data-lucide="alert-triangle"></i> Fee Warning</span>';
      } else {
        statusText = '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Reconciled</span>';
      }

      row.innerHTML = `
        <td><strong>${computeReportDateLabel(r)}</strong></td>
        <td>${r.bankDate}</td>
        <td class="num-col">${formatCurrency(r.totalLedger)}</td>
        <td class="num-col">${formatCurrency(r.totalBank)}</td>
        <td class="num-col val-neutral">${formatCurrency(calcFee)} (${calcPercent.toFixed(2)}%)</td>
        <td class="num-col val-neutral">${formatCurrency(expectedFee)}</td>
        <td>${statusText}</td>
        <td style="font-size: 0.75rem; color: var(--text-secondary);">${timeStr}</td>
        <td class="actions-col">
          <div class="action-icon-buttons">
            <button class="btn-table-action" onclick="editReportRecord('${r.id}')" title="Edit / Load"><i data-lucide="edit"></i></button>
            <button class="btn-table-action" onclick="exportReportToPDF('${r.id}')" title="Download PDF"><i data-lucide="file-down"></i></button>
            <button class="btn-table-action delete admin-only" onclick="deleteReportRecord('${r.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      `;
    } else {
      const diffClass = r.netDiscrepancy > 0.005 ? 'val-positive' : (r.netDiscrepancy < -0.005 ? 'val-negative' : 'val-neutral');
      const statusText = Math.abs(r.netDiscrepancy) <= 0.005 
        ? '<span class="status-pill status-reconciled"><i data-lucide="check"></i> Reconciled</span>' 
        : '<span class="status-pill status-discrepant"><i data-lucide="alert-triangle"></i> Discrepant</span>';

      row.innerHTML = `
        <td><strong>${computeReportDateLabel(r)}</strong></td>
        <td>${r.bankDate}</td>
        <td class="num-col">${formatCurrency(r.totalLedger)}</td>
        <td class="num-col">${formatCurrency(r.totalBank)}</td>
        <td class="num-col ${diffClass}">${r.netDiscrepancy > 0.005 ? '+' : ''}${formatCurrency(r.netDiscrepancy)}</td>
        <td>${statusText}</td>
        <td style="font-size: 0.75rem; color: var(--text-secondary);">${timeStr}</td>
        <td class="actions-col">
          <div class="action-icon-buttons">
            <button class="btn-table-action" onclick="editReportRecord('${r.id}')" title="Edit / Load"><i data-lucide="edit"></i></button>
            <button class="btn-table-action" onclick="exportReportToPDF('${r.id}')" title="Download PDF"><i data-lucide="file-down"></i></button>
            <button class="btn-table-action delete admin-only" onclick="deleteReportRecord('${r.id}')" title="Delete"><i data-lucide="trash-2"></i></button>
          </div>
        </td>
      `;
    }
    
    if (currentUser && currentUser.role !== 'admin') {
      const delBtn = row.querySelector('.btn-table-action.delete');
      if (delBtn) delBtn.style.display = 'none';
    }

    historyTbody.appendChild(row);
  });

  lucide.createIcons();
}

window.sortHistory = function(column) {
  if (historySortColumn === column) {
    historySortAscending = !historySortAscending;
  } else {
    historySortColumn = column;
    historySortAscending = false;
  }
  renderHistoryTable();
};

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
  
  if (isCards) {
    csvContent += `TB Date Range,Bank Date,Total Ledger Receipts,Total Bank Deposits,Net Discrepancy,Reconciliation Status\n`;
  } else {
    csvContent += `TB Date Range,Bank Date,Total Ledger Receipts,Total Bank Deposits,Calculated Fee,Calculated Fee %,Expected Fee (Fee2),Reconciliation Status\n`;
  }

  let totalLedgerSum = 0;
  let totalBankSum = 0;
  let totalNetDiff = 0;
  let totalCalcFeeSum = 0;
  let totalExpectedFeeSum = 0;

  filtered.forEach(r => {
    totalLedgerSum += r.totalLedger;
    totalBankSum += r.totalBank;
    totalNetDiff += r.netDiscrepancy;

    const tbLabel = computeReportDateLabel(r);

    if (isCards) {
      const status = Math.abs(r.netDiscrepancy) <= 0.005 ? 'Reconciled' : 'Discrepant';
      csvContent += `"${r.tbDateLabel}",${r.bankDate},${r.totalLedger.toFixed(2)},${r.totalBank.toFixed(2)},${r.netDiscrepancy.toFixed(2)},${status}\n`;
    } else {
      const calcFee = r.totalLedger - r.totalBank;
      const calcPercent = r.totalLedger > 0.005 ? ((calcFee / r.totalLedger) * 100) : 0;
      const expectedFee = r.totalLedger * (amexFeeRateSetting / 100);
      
      totalCalcFeeSum += calcFee;
      totalExpectedFeeSum += expectedFee;

      let status = 'Reconciled';
      if (calcPercent > amexThresholdRateSetting) {
        status = 'Fee Exceeds Max';
      } else if (calcFee > expectedFee + 0.005) {
        status = 'Fee Warning';
      }

      csvContent += `"${tbLabel}",${r.bankDate},${r.totalLedger.toFixed(2)},${r.totalBank.toFixed(2)},${calcFee.toFixed(2)},${calcPercent.toFixed(2)}%,${expectedFee.toFixed(2)},${status}\n`;
    }
  });

  if (isCards) {
    csvContent += `\n"ROLL-UP PERIOD SUMS",,${totalLedgerSum.toFixed(2)},${totalBankSum.toFixed(2)},${totalNetDiff.toFixed(2)},${Math.abs(totalNetDiff) <= 0.005 ? 'Balanced' : 'Out of Balance'}\n`;
  } else {
    const totalCalcPercent = totalLedgerSum > 0.005 ? ((totalCalcFeeSum / totalLedgerSum) * 100) : 0;
    let rollUpStatus = 'Balanced';
    if (totalCalcPercent > amexThresholdRateSetting) {
      rollUpStatus = 'Out of Limit';
    } else if (totalCalcFeeSum > totalExpectedFeeSum + 0.005) {
      rollUpStatus = 'Fee Warning';
    }
    csvContent += `\n"ROLL-UP PERIOD SUMS",,${totalLedgerSum.toFixed(2)},${totalBankSum.toFixed(2)},${totalCalcFeeSum.toFixed(2)},${totalCalcPercent.toFixed(2)}%,${totalExpectedFeeSum.toFixed(2)},${rollUpStatus}\n`;
  }

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
  doc.text("Bank Statement Date: " + bankDateStr, 14, 28);
  doc.text("Trial Balance Range: " + tbDatesStr, 14, 34);
  doc.text("Report Generated: " + new Date().toLocaleString(), 140, 28);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 38, 196, 38);

  const result = runReconciliationLogic();

  const breakdownHeaders = isCards 
    ? [["Reconciliation Category", "Ledger Total (CB)", "Bank Statement", "Discrepancy", "Status"]]
    : [["Reconciliation Category", "Ledger Total (CB)", "Bank Statement", "Fee (%)", `Fee2 (${amexFeeRateSetting}%)`, "Status"]];

  const breakdownRows = [];
  if (isCards) {
    result.rows.forEach(r => {
      breakdownRows.push([
        r.name,
        formatCurrency(r.ledger),
        formatCurrency(r.bank),
        (r.diff > 0.005 ? '+' : '') + formatCurrency(r.diff),
        Math.abs(r.diff) <= 0.005 ? "Reconciled" : "Discrepant"
      ]);
    });
    breakdownRows.push([
      "TOTALS",
      formatCurrency(result.totalLedger),
      formatCurrency(result.totalBank),
      formatCurrency(result.netDiscrepancy),
      Math.abs(result.netDiscrepancy) <= 0.005 ? "Balanced" : "Out of Balance"
    ]);
  } else {
    result.rows.forEach(r => {
      const calcFee = r.ledger - r.bank;
      const calcPercent = r.ledger > 0.005 ? ((calcFee / r.ledger) * 100) : 0;
      const expectedFee = r.ledger * (amexFeeRateSetting / 100);
      
      let statusText = 'Reconciled';
      if (calcPercent > amexThresholdRateSetting) {
        statusText = 'Fee Exceeds Max';
      } else if (calcFee > expectedFee + 0.005) {
        statusText = 'Fee Warning';
      }

      breakdownRows.push([
        r.name,
        formatCurrency(r.ledger),
        formatCurrency(r.bank),
        `${formatCurrency(calcFee)} (${calcPercent.toFixed(2)}%)`,
        formatCurrency(expectedFee),
        statusText
      ]);
    });

    const totalCalcFee = result.totalLedger - result.totalBank;
    const totalCalcPercent = result.totalLedger > 0.005 ? ((totalCalcFee / result.totalLedger) * 100) : 0;
    const totalExpectedFee = result.totalLedger * (amexFeeRateSetting / 100);
    
    let rollUpStatus = 'Balanced';
    if (totalCalcPercent > amexThresholdRateSetting) {
      rollUpStatus = 'Out of Limit';
    } else if (totalCalcFee > totalExpectedFee + 0.005) {
      rollUpStatus = 'Fee Warning';
    }

    breakdownRows.push([
      "TOTALS",
      formatCurrency(result.totalLedger),
      formatCurrency(result.totalBank),
      `${formatCurrency(totalCalcFee)} (${totalCalcPercent.toFixed(2)}%)`,
      formatCurrency(totalExpectedFee),
      rollUpStatus
    ]);
  }

  doc.autoTable({
    startY: 44,
    head: breakdownHeaders,
    body: breakdownRows,
    theme: 'striped',
    headStyles: { fillStyle: 'F', fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: isCards ? {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    } : {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.row.index === breakdownRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        
        if (isCards && data.column.index === 3) {
          if (result.netDiscrepancy > 0.005) data.cell.styles.textColor = [16, 185, 129];
          if (result.netDiscrepancy < -0.005) data.cell.styles.textColor = [239, 68, 68];
        } else if (!isCards && data.column.index === 3) {
          const totalCalcFee = result.totalLedger - result.totalBank;
          const totalCalcPercent = result.totalLedger > 0.005 ? ((totalCalcFee / result.totalLedger) * 100) : 0;
          if (totalCalcPercent > amexThresholdRateSetting) {
            data.cell.styles.textColor = [239, 68, 68];
          } else if (totalCalcFee > (result.totalLedger * (amexFeeRateSetting / 100)) + 0.005) {
            data.cell.styles.textColor = [245, 158, 11];
          }
        }
      } else {
        if (isCards && data.column.index === 3) {
          const val = result.rows[data.row.index].diff;
          if (val > 0.005) data.cell.styles.textColor = [16, 185, 129];
          if (val < -0.005) data.cell.styles.textColor = [239, 68, 68];
        } else if (!isCards && data.column.index === 3) {
          const r = result.rows[data.row.index];
          const calcFee = r.ledger - r.bank;
          const calcPercent = r.ledger > 0.005 ? ((calcFee / r.ledger) * 100) : 0;
          const expectedFee = r.ledger * (amexFeeRateSetting / 100);
          if (calcPercent > amexThresholdRateSetting) {
            data.cell.styles.textColor = [239, 68, 68];
          } else if (calcFee > expectedFee + 0.005) {
            data.cell.styles.textColor = [245, 158, 11];
          }
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
  doc.text("Total Ledger Receipts: " + formatCurrency(result.totalLedger), 20, currentY + 18);
  doc.text("Total Bank Deposits:   " + formatCurrency(result.totalBank), 20, currentY + 26);

  const netVal = isCards ? result.netDiscrepancy : (result.totalLedger - result.totalBank);
  const isBalanced = isCards 
    ? (Math.abs(result.netDiscrepancy) <= 0.005)
    : ((result.totalLedger - result.totalBank) <= (result.totalLedger * (amexFeeRateSetting / 100)) + 0.005 && ((result.totalLedger - result.totalBank) / result.totalLedger * 100) <= amexThresholdRateSetting);

  if (isBalanced) {
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(isCards ? "RECONCILED" : "BALANCED", 132, currentY + 15);
    doc.setFontSize(9);
    doc.text(isCards ? "Zero Net Difference" : "Fee Within Limits", 132, currentY + 21);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(isCards ? "OUT OF BALANCE" : "FEE WARNING", 126, currentY + 15);
    doc.setFontSize(9);
    doc.text(isCards ? "Difference: " + formatCurrency(netVal) : "Fee Out of Limit: " + formatCurrency(netVal), 126, currentY + 21);
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
  doc.text("Bank Statement Date: " + report.bankDate, 14, 28);
  doc.text("Trial Balance Range: " + computeReportDateLabel(report), 14, 34);
  doc.text("Saved Date: " + new Date(report.timestamp).toLocaleString(), 130, 28);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 38, 196, 38);

  const breakdownHeaders = isCards 
    ? [["Reconciliation Category", "Ledger Total (CB)", "Bank Statement", "Discrepancy", "Status"]]
    : [["Reconciliation Category", "Ledger Total (CB)", "Bank Statement", "Fee (%)", `Fee2 (${amexFeeRateSetting}%)`, "Status"]];

  const breakdownRows = [];
  
  // Calculate category sums on the fly from saved report data
  const tbSums = {};
  const rows = isCards ? CARD_ROWS : AMEX_ROWS;
  rows.forEach(r => {
    let hotelSum = 0;
    let restaurantSum = 0;
    
    const savedHotelCats = report.hotelCategories || getInitialCategories();
    const savedRestaurantCats = report.restaurantCategories || report.hotelCategories || getInitialCategories();
    
    const hotelCat = savedHotelCats[report.reconType][r.id];
    if (hotelCat && report.hotelColumns) {
      report.hotelColumns.forEach(col => {
        hotelCat.lines.forEach(line => {
          const val = col.values[line.id] !== undefined ? col.values[line.id] : col.values[r.id];
          hotelSum += parseMathExpression(val);
        });
      });
    }

    const restCat = savedRestaurantCats[report.reconType][r.id];
    if (restCat && report.restaurantColumns) {
      report.restaurantColumns.forEach(col => {
        restCat.lines.forEach(line => {
          const val = col.values[line.id] !== undefined ? col.values[line.id] : col.values[r.id];
          restaurantSum += parseMathExpression(val);
        });
      });
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

    breakdownRows.push([
      "TOTALS",
      formatCurrency(report.totalLedger),
      formatCurrency(report.totalBank),
      formatCurrency(report.netDiscrepancy),
      Math.abs(report.netDiscrepancy) <= 0.005 ? "Balanced" : "Out of Balance"
    ]);
  } else {
    const amexLedger = tbSums['amex'] + tbSums['amexpos'];
    const amexBank = report.bank['amex'] || 0;
    const calcFee = amexLedger - amexBank;
    const calcPercent = amexLedger > 0.005 ? ((calcFee / amexLedger) * 100) : 0;
    const expectedFee = amexLedger * (amexFeeRateSetting / 100);

    let statusText = 'Reconciled';
    if (calcPercent > amexThresholdRateSetting) {
      statusText = 'Fee Exceeds Max';
    } else if (calcFee > expectedFee + 0.005) {
      statusText = 'Fee Warning';
    }

    breakdownRows.push([
      'American Express (AMEX)', 
      formatCurrency(amexLedger), 
      formatCurrency(amexBank), 
      `${formatCurrency(calcFee)} (${calcPercent.toFixed(2)}%)`, 
      formatCurrency(expectedFee), 
      statusText
    ]);

    const totalCalcFee = report.totalLedger - report.totalBank;
    const totalCalcPercent = report.totalLedger > 0.005 ? ((totalCalcFee / report.totalLedger) * 100) : 0;
    const totalExpectedFee = report.totalLedger * (amexFeeRateSetting / 100);

    let rollUpStatus = 'Balanced';
    if (totalCalcPercent > amexThresholdRateSetting) {
      rollUpStatus = 'Out of Limit';
    } else if (totalCalcFee > totalExpectedFee + 0.005) {
      rollUpStatus = 'Fee Warning';
    }

    breakdownRows.push([
      "TOTALS",
      formatCurrency(report.totalLedger),
      formatCurrency(report.totalBank),
      `${formatCurrency(totalCalcFee)} (${totalCalcPercent.toFixed(2)}%)`,
      formatCurrency(totalExpectedFee),
      rollUpStatus
    ]);
  }

  doc.autoTable({
    startY: 44,
    head: breakdownHeaders,
    body: breakdownRows,
    theme: 'striped',
    headStyles: { fillStyle: 'F', fillColor: [71, 85, 105], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: isCards ? {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'center' }
    } : {
      0: { fontStyle: 'bold' },
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.row.index === breakdownRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        
        if (isCards && data.column.index === 3) {
          if (report.netDiscrepancy > 0.005) data.cell.styles.textColor = [16, 185, 129];
          if (report.netDiscrepancy < -0.005) data.cell.styles.textColor = [239, 68, 68];
        } else if (!isCards && data.column.index === 3) {
          const totalCalcFee = report.totalLedger - report.totalBank;
          const totalCalcPercent = report.totalLedger > 0.005 ? ((totalCalcFee / report.totalLedger) * 100) : 0;
          if (totalCalcPercent > amexThresholdRateSetting) {
            data.cell.styles.textColor = [239, 68, 68];
          } else if (totalCalcFee > (report.totalLedger * (amexFeeRateSetting / 100)) + 0.005) {
            data.cell.styles.textColor = [245, 158, 11];
          }
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
  doc.text("Total Ledger Receipts: " + formatCurrency(report.totalLedger), 20, currentY + 18);
  doc.text("Total Bank Deposits:   " + formatCurrency(report.totalBank), 20, currentY + 26);

  const netVal = isCards ? report.netDiscrepancy : (report.totalLedger - report.totalBank);
  const isBalanced = isCards 
    ? (Math.abs(report.netDiscrepancy) <= 0.005)
    : ((report.totalLedger - report.totalBank) <= (report.totalLedger * (amexFeeRateSetting / 100)) + 0.005 && ((report.totalLedger - report.totalBank) / report.totalLedger * 100) <= amexThresholdRateSetting);

  if (isBalanced) {
    doc.setFillColor(209, 250, 229);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(5, 150, 105);
    doc.text(isCards ? "RECONCILED" : "BALANCED", 132, currentY + 15);
    doc.setFontSize(9);
    doc.text(isCards ? "Zero Net Difference" : "Fee Within Limits", 132, currentY + 21);
  } else {
    doc.setFillColor(254, 226, 226);
    doc.roundedRect(120, currentY + 6, 68, 22, 2, 2, 'F');
    doc.setFont("Helvetica", "bold");
    doc.setTextColor(220, 38, 38);
    doc.text(isCards ? "OUT OF BALANCE" : "FEE WARNING", 126, currentY + 15);
    doc.setFontSize(9);
    doc.text(isCards ? "Difference: " + formatCurrency(netVal) : "Fee Out of Limit: " + formatCurrency(netVal), 126, currentY + 21);
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
  doc.text("Company Name: " + companyName, 14, 28);
  doc.text("Recon Type: " + tabName + " Accounts", 14, 34);
  doc.text("Generated: " + new Date().toLocaleString(), 130, 28);

  const fromVal = historyFromDate.value || 'Beginning';
  const toVal = historyToDate.value || 'Today';
  doc.text("Date Filters: " + fromVal + " to " + toVal, 14, 40);

  doc.setDrawColor(226, 232, 240);
  doc.line(14, 44, 196, 44);

  const summaryHeaders = isCards
    ? [["TB Date Range", "Bank Date", "Ledger Total (CB)", "Bank Total (Col I)", "Net Discrepancy", "Status"]]
    : [["TB Date Range", "Bank Date", "Ledger Total (CB)", "Bank Total (Col I)", "Fee (%)", `Fee2 (${amexFeeRateSetting}%)`, "Status"]];
    
  let totalLedgerSum = 0;
  let totalBankSum = 0;
  let totalNetDiff = 0;
  let totalCalcFeeSum = 0;
  let totalExpectedFeeSum = 0;

  const summaryRows = filtered.map(r => {
    totalLedgerSum += r.totalLedger;
    totalBankSum += r.totalBank;
    totalNetDiff += r.netDiscrepancy;

    const tbLabel = computeReportDateLabel(r);

    if (isCards) {
      return [
        tbLabel,
        r.bankDate,
        formatCurrency(r.totalLedger),
        formatCurrency(r.totalBank),
        (r.netDiscrepancy > 0.005 ? '+' : '') + formatCurrency(r.netDiscrepancy),
        Math.abs(r.netDiscrepancy) <= 0.005 ? "Balanced" : "Discrepant"
      ];
    } else {
      const calcFee = r.totalLedger - r.totalBank;
      const calcPercent = r.totalLedger > 0.005 ? ((calcFee / r.totalLedger) * 100) : 0;
      const expectedFee = r.totalLedger * (amexFeeRateSetting / 100);

      totalCalcFeeSum += calcFee;
      totalExpectedFeeSum += expectedFee;

      let status = 'Reconciled';
      if (calcPercent > amexThresholdRateSetting) {
        status = 'Fee Exceeds Max';
      } else if (calcFee > expectedFee + 0.005) {
        status = 'Fee Warning';
      }

      return [
        tbLabel,
        r.bankDate,
        formatCurrency(r.totalLedger),
        formatCurrency(r.totalBank),
        `${formatCurrency(calcFee)} (${calcPercent.toFixed(2)}%)`,
        formatCurrency(expectedFee),
        status
      ];
    }
  });

  if (isCards) {
    summaryRows.push([
      "ROLL-UP TOTALS",
      "",
      formatCurrency(totalLedgerSum),
      formatCurrency(totalBankSum),
      (totalNetDiff > 0.005 ? '+' : '') + formatCurrency(totalNetDiff),
      Math.abs(totalNetDiff) <= 0.005 ? "Balanced" : "Out of Balance"
    ]);
  } else {
    const totalCalcPercent = totalLedgerSum > 0.005 ? ((totalCalcFeeSum / totalLedgerSum) * 100) : 0;
    let rollUpStatus = 'Balanced';
    if (totalCalcPercent > amexThresholdRateSetting) {
      rollUpStatus = 'Out of Limit';
    } else if (totalCalcFeeSum > totalExpectedFeeSum + 0.005) {
      rollUpStatus = 'Fee Warning';
    }

    summaryRows.push([
      "ROLL-UP TOTALS",
      "",
      formatCurrency(totalLedgerSum),
      formatCurrency(totalBankSum),
      `${formatCurrency(totalCalcFeeSum)} (${totalCalcPercent.toFixed(2)}%)`,
      formatCurrency(totalExpectedFeeSum),
      rollUpStatus
    ]);
  }

  doc.autoTable({
    startY: 50,
    head: summaryHeaders,
    body: summaryRows,
    theme: 'striped',
    headStyles: { fillStyle: 'F', fillColor: [100, 116, 139], textColor: [255, 255, 255], fontStyle: 'bold' },
    columnStyles: isCards ? {
      0: { fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'center' }
    } : {
      0: { fontStyle: 'bold' },
      2: { halign: 'right' },
      3: { halign: 'right' },
      4: { halign: 'right' },
      5: { halign: 'right' },
      6: { halign: 'center' }
    },
    didParseCell: function (data) {
      if (data.row.index === summaryRows.length - 1) {
        data.cell.styles.fontStyle = 'bold';
        data.cell.styles.fillColor = [241, 245, 249];
        
        if (isCards && data.column.index === 4) {
          if (totalNetDiff > 0.005) data.cell.styles.textColor = [16, 185, 129];
          if (totalNetDiff < -0.005) data.cell.styles.textColor = [239, 68, 68];
        } else if (!isCards && data.column.index === 4) {
          const totalCalcPercent = totalLedgerSum > 0.005 ? ((totalCalcFeeSum / totalLedgerSum) * 100) : 0;
          if (totalCalcPercent > amexThresholdRateSetting) {
            data.cell.styles.textColor = [239, 68, 68];
          } else if (totalCalcFeeSum > totalExpectedFeeSum + 0.005) {
            data.cell.styles.textColor = [245, 158, 11];
          }
        }
      }
    }
  });

  const compFileStr = activeCompany === 'ws_hospitality' ? 'WS_Hospitality' : 'WS_Hotels';
  doc.save("Reconciliation_Summary_" + compFileStr + "_" + tabName + "_" + formatDate(new Date()) + ".pdf");
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

function computeReportDateLabel(report) {
  if (!report) return 'No Dates';
  const hotelCols = report.hotelColumns || [];
  const restaurantCols = report.restaurantColumns || [];
  
  const hotelDates = hotelCols.filter(col => {
    return col.values && Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
  }).map(c => c.date);
  
  const restaurantDates = restaurantCols.filter(col => {
    return col.values && Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
  }).map(c => c.date);
  
  let allDates = [...hotelDates, ...restaurantDates].sort();
  if (allDates.length === 0) {
    allDates = [...hotelCols, ...restaurantCols].map(c => c.date).sort();
  }
  const sortedUniqueDates = [...new Set(allDates)].filter(Boolean);
  
  if (sortedUniqueDates.length === 1) {
    const options = { month: 'short', day: 'numeric' };
    return new Date(sortedUniqueDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
  } else if (sortedUniqueDates.length > 1) {
    const options = { month: 'short', day: 'numeric' };
    const startFmt = new Date(sortedUniqueDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
    const endFmt = new Date(sortedUniqueDates[sortedUniqueDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
    return `${startFmt} - ${endFmt}`;
  }
  return report.tbDateLabel || 'No Dates';
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

// Helper to sum all entered values for summary clipboard formatting
function sumColCategoryGroup(cols, catId, isHotel) {
  let sum = 0;
  const catsObj = isHotel ? hotelCategories[activeTab] : restaurantCategories[activeTab];
  const cat = catsObj[catId];
  if (!cat) return 0;
  cols.forEach(col => {
    cat.lines.forEach(line => {
      sum += parseMathExpression(col.values[line.id]);
    });
  });
  return sum;
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
  
  if (activeTab === 'amex') {
    result.rows.forEach(r => {
      const calcFee = r.ledger - r.bank;
      const calcPercent = r.ledger > 0.005 ? ((calcFee / r.ledger) * 100) : 0;
      const expectedFee = r.ledger * (amexFeeRateSetting / 100);
      text += `${r.name}: Ledger ${formatCurrency(r.ledger)} | Bank ${formatCurrency(r.bank)} | Fee: ${formatCurrency(calcFee)} (${calcPercent.toFixed(2)}%) | Expected Fee2: ${formatCurrency(expectedFee)}\n`;
    });
    text += `=========================================\n`;
    const totalCalcFee = result.totalLedger - result.totalBank;
    const totalCalcPercent = result.totalLedger > 0.005 ? ((totalCalcFee / result.totalLedger) * 100) : 0;
    const totalExpectedFee = result.totalLedger * (amexFeeRateSetting / 100);
    let status = 'Balanced';
    if (totalCalcPercent > amexThresholdRateSetting) {
      status = 'Fee Exceeds Max';
    } else if (totalCalcFee > totalExpectedFee + 0.005) {
      status = 'Fee Warning';
    }
    text += `AMEX FEE SUMMARY: Calculated Fee ${formatCurrency(totalCalcFee)} (${totalCalcPercent.toFixed(2)}%) | Expected Fee2 ${formatCurrency(totalExpectedFee)} (${status})\n`;
  } else {
    result.rows.forEach(r => {
      text += `${r.name}: Ledger Total ${formatCurrency(r.ledger)} | Bank Total ${formatCurrency(r.bank)} | Diff: ${(r.diff > 0 ? '+' : '')}${formatCurrency(r.diff)}\n`;
    });
    text += `=========================================\n`;
    text += `NET DISCREPANCY: ${formatCurrency(result.netDiscrepancy)} (${Math.abs(result.netDiscrepancy) <= 0.005 ? 'Balanced' : 'Out of Balance'})\n`;
  }

  navigator.clipboard.writeText(text)
    .then(() => showToast('Summary copied to clipboard!', 'success'))
    .catch(() => showToast('Failed to copy summary to clipboard.', 'error'));
}

// --- LIVE DASHBOARD VIEW CONTROLLERS ---

function toggleWorkspaceView(mode) {
  const liveSection = document.getElementById('live-dashboard-section');
  const dashboardView = document.getElementById('dashboard-view');
  const summaryCards = document.getElementById('dashboard-summary-cards');
  const historyView = document.getElementById('history-view');
  const companyIndicator = document.getElementById('active-company-indicator');

  if (mode === 'live') {
    if (liveSection) {
      liveSection.style.display = '';
      liveSection.classList.remove('hidden');
    }
    
    if (dashboardView) {
      dashboardView.style.display = 'none';
      dashboardView.classList.add('hidden');
    }
    
    if (summaryCards) {
      summaryCards.style.display = 'none';
      summaryCards.classList.add('hidden');
    }
    
    if (historyView) {
      historyView.style.display = 'none';
      historyView.classList.add('hidden');
    }

    if (companyIndicator) {
      companyIndicator.style.display = 'none';
      companyIndicator.classList.add('hidden');
    }
    
    if (companyTabsContainer) {
      companyTabsContainer.style.display = 'none';
      companyTabsContainer.classList.add('hidden');
    }

    if (selectLoadHistory) {
      selectLoadHistory.style.display = 'none';
    }
    if (btnNewEntry) {
      btnNewEntry.style.display = 'none';
    }

    loadLiveStatusBoard();
  } else {
    if (liveSection) {
      liveSection.style.display = 'none';
      liveSection.classList.add('hidden');
    }
    
    if (dashboardView) {
      dashboardView.style.display = '';
      dashboardView.classList.remove('hidden');
    }
    
    if (summaryCards) {
      summaryCards.style.display = '';
      summaryCards.classList.remove('hidden');
    }
    
    if (historyView) {
      historyView.style.display = '';
      historyView.classList.remove('hidden');
    }

    if (companyIndicator) {
      companyIndicator.style.display = '';
      companyIndicator.classList.remove('hidden');
      companyIndicator.className = 'active-company-indicator';
      
      const compName = activeCompany === 'ws_hospitality' ? 'WS Hospitality' : 'WS Hotels';
      if (activeCompany === 'ws_hospitality') {
        companyIndicator.classList.add('indicator-orange');
        companyIndicator.innerHTML = `<i data-lucide="building"></i> Active Workspace: <strong>${compName}</strong>`;
      } else {
        companyIndicator.classList.add('indicator-yellow');
        companyIndicator.innerHTML = `<i data-lucide="hotel"></i> Active Workspace: <strong>${compName}</strong>`;
      }
    }
    
    if (companyTabsContainer) {
      companyTabsContainer.style.display = '';
      companyTabsContainer.classList.remove('hidden');
    }

    if (selectLoadHistory) {
      selectLoadHistory.style.display = '';
      populateHistoryDropdown();
    }
    if (btnNewEntry) {
      btnNewEntry.style.display = 'inline-flex';
    }

    lucide.createIcons();
  }
}

window.loadLiveStatusBoard = function() {
  const container = document.getElementById('live-status-grid-container');
  if (!container) return;

  container.innerHTML = `
    <div class="empty-state">
      <i data-lucide="loader-2" class="empty-icon" style="animation: spin 1.5s linear infinite;"></i>
      <p>Loading status board...</p>
    </div>
  `;
  lucide.createIcons();

  fetch('/api/all-history')
    .then(res => res.json())
    .then(rawList => {
      container.innerHTML = '';
      
      const companies = [
        { id: 'ws_hospitality', title: 'WS Hospitality', icon: 'building' },
        { id: 'ws_hotels', title: 'WS Hotels', icon: 'hotel' }
      ];

      companies.forEach(company => {
        const companyCard = document.createElement('div');
        companyCard.className = 'status-board-card';
        companyCard.style.display = 'flex';
        companyCard.style.flexDirection = 'column';
        companyCard.style.gap = '12px';

        // Card Header
        const header = document.createElement('div');
        header.style.display = 'flex';
        header.style.alignItems = 'center';
        header.style.gap = '8px';
        header.style.borderBottom = '2px solid var(--border-color)';
        header.style.paddingBottom = '8px';
        header.style.marginBottom = '2px';
        const accentColor = company.id === 'ws_hospitality' ? '#f97316' : '#eab308';
        header.innerHTML = `
          <h3 style="margin: 0; font-size: 1.05rem; font-weight: 700; display: flex; align-items: center; gap: 6px;">
            <i data-lucide="${company.icon}" style="color: ${accentColor}; width: 18px; height: 18px;"></i>
            <span style="color: ${accentColor};">${company.title}</span>
          </h3>
        `;
        companyCard.appendChild(header);

        // Company-Specific Filters Container
        const filtersContainer = document.createElement('div');
        filtersContainer.className = 'live-company-filters';
        filtersContainer.style.display = 'flex';
        filtersContainer.style.flexWrap = 'wrap';
        filtersContainer.style.gap = '8px';
        filtersContainer.style.alignItems = 'center';
        filtersContainer.style.padding = '6px 10px';
        filtersContainer.style.backgroundColor = 'rgba(255,255,255,0.015)';
        filtersContainer.style.border = '1px solid var(--border-color)';
        filtersContainer.style.borderRadius = 'var(--border-radius-sm)';
        filtersContainer.style.marginBottom = '4px';

        // Gather unique bankDates for this company
        const companyHistory = rawList.filter(r => r.companyId === company.id);
        const uniqueHistoryDates = Array.from(new Set(companyHistory.map(r => r.bankDate).filter(Boolean)));
        uniqueHistoryDates.sort((a, b) => new Date(b) - new Date(a));
        let dropdownOptions = '<option value="" style="background-color: #0f172a !important; color: #f8fafc !important;">-- All History --</option>';
        uniqueHistoryDates.forEach(dateStr => {
          dropdownOptions += `<option value="${dateStr}" style="background-color: #0f172a !important; color: #f8fafc !important;">${dateStr}</option>`;
        });

        const activeFilters = companyFilters[company.id];

        filtersContainer.innerHTML = `
          <div style="display: flex; align-items: center; gap: 4px;">
            <label style="font-size: 0.7rem; color: var(--text-secondary);">From</label>
            <input type="date" class="live-from-input" value="${activeFilters.from}" style="padding: 1px 4px; font-size: 0.7rem; width: 105px; height: 20px; border-radius: 3px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
          </div>
          <div style="display: flex; align-items: center; gap: 4px;">
            <label style="font-size: 0.7rem; color: var(--text-secondary);">To</label>
            <input type="date" class="live-to-input" value="${activeFilters.to}" style="padding: 1px 4px; font-size: 0.7rem; width: 105px; height: 20px; border-radius: 3px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary);">
          </div>
          <div style="display: flex; align-items: center; gap: 4px; margin-left: auto;">
            <label style="font-size: 0.7rem; color: var(--text-secondary);">History</label>
            <select class="live-run-select" style="padding: 1px 4px; font-size: 0.7rem; width: 110px; height: 20px; border-radius: 3px; border: 1px solid var(--border-color); background: var(--bg-card); color: var(--text-primary); color-scheme: dark;">
              ${dropdownOptions}
            </select>
          </div>
          <button type="button" class="btn btn-secondary btn-sm live-clear-btn" style="padding: 1px 6px; font-size: 0.65rem; height: 20px; line-height: 1;">Clear</button>
        `;

        // Set active dropdown value
        const selectEl = filtersContainer.querySelector('.live-run-select');
        selectEl.value = activeFilters.selectedRun;

        // Register filter event listeners
        filtersContainer.querySelector('.live-from-input').addEventListener('change', (e) => {
          companyFilters[company.id].from = e.target.value;
          companyFilters[company.id].selectedRun = ''; // clear dropdown
          loadLiveStatusBoard();
        });
        filtersContainer.querySelector('.live-to-input').addEventListener('change', (e) => {
          companyFilters[company.id].to = e.target.value;
          companyFilters[company.id].selectedRun = ''; // clear dropdown
          loadLiveStatusBoard();
        });
        selectEl.addEventListener('change', (e) => {
          companyFilters[company.id].selectedRun = e.target.value;
          companyFilters[company.id].from = ''; // clear range
          companyFilters[company.id].to = ''; // clear range
          loadLiveStatusBoard();
        });
        filtersContainer.querySelector('.live-clear-btn').addEventListener('click', () => {
          companyFilters[company.id].from = '';
          companyFilters[company.id].to = '';
          companyFilters[company.id].selectedRun = '';
          loadLiveStatusBoard();
        });

        companyCard.appendChild(filtersContainer);

        // Sections: Cards & AMEX
        const types = [
          { key: 'cards', title: 'Cards Reconciliation' },
          { key: 'amex', title: 'AMEX Reconciliation' }
        ];

        types.forEach((type, idx) => {
          let matches = rawList.filter(r => r.companyId === company.id && r.reconType === type.key);

          // Apply filters
          if (activeFilters.selectedRun) {
            matches = matches.filter(r => r.bankDate === activeFilters.selectedRun);
          } else {
            if (activeFilters.from) {
              matches = matches.filter(r => r.bankDate >= activeFilters.from);
            }
            if (activeFilters.to) {
              matches = matches.filter(r => r.bankDate <= activeFilters.to);
            }
          }

          const section = document.createElement('div');
          section.style.display = 'flex';
          section.style.flexDirection = 'column';
          section.style.gap = '6px';
          section.style.marginTop = '4px';

          const secTitle = document.createElement('div');
          secTitle.style.fontSize = '0.8rem';
          secTitle.style.fontWeight = '700';
          secTitle.style.color = 'var(--text-primary)';
          secTitle.style.display = 'flex';
          secTitle.style.justifyContent = 'space-between';
          secTitle.style.alignItems = 'center';
          secTitle.innerHTML = `<span>${type.title}</span>`;
          section.appendChild(secTitle);

          let metricsHtml = '';
          let statusBadge = '';
          let dateStr = 'N/A';

          if (matches.length > 0) {
            // Sort matches chronologically by bankDate to calculate ranges
            matches.sort((a, b) => new Date(a.bankDate) - new Date(b.bankDate));

            const totalLedger = matches.reduce((sum, r) => sum + (r.totalLedger || 0), 0);
            const totalBank = matches.reduce((sum, r) => sum + (r.totalBank || 0), 0);
            const netDiscrepancy = totalLedger - totalBank;

            const isBalanced = Math.abs(netDiscrepancy) <= 0.005;
            statusBadge = isBalanced 
              ? '<span class="status-pill status-reconciled" style="padding: 1px 6px; font-size: 0.65rem;"><i data-lucide="check" style="width: 8px; height: 8px;"></i> Balanced</span>'
              : '<span class="status-pill status-discrepant" style="padding: 1px 6px; font-size: 0.65rem;"><i data-lucide="alert-triangle" style="width: 8px; height: 8px;"></i> Out of Balance</span>';
            
            const diffClass = netDiscrepancy > 0.005 ? 'val-positive' : (netDiscrepancy < -0.005 ? 'val-negative' : 'val-neutral');
            
            // Format Bank Date range in the same style as TB Period (adding the year on the end)
            const earliestBank = matches[0].bankDate;
            const latestBank = matches[matches.length - 1].bankDate;
            let bankDateRange = '';
            
            if (earliestBank === latestBank) {
              const options = { month: 'short', day: 'numeric', year: 'numeric' };
              bankDateRange = new Date(earliestBank + 'T00:00:00').toLocaleDateString('en-US', options);
            } else {
              const options = { month: 'short', day: 'numeric' };
              const startFmt = new Date(earliestBank + 'T00:00:00').toLocaleDateString('en-US', options);
              const endFmt = new Date(latestBank + 'T00:00:00').toLocaleDateString('en-US', options);
              const yearStr = new Date(latestBank + 'T00:00:00').getFullYear();
              bankDateRange = `${startFmt} - ${endFmt}, ${yearStr}`;
            }

            // Calculate Trial Balance Date range across all matched columns
            const tbDates = [];
            matches.forEach(r => {
              const hotelCols = r.hotelColumns || [];
              const restaurantCols = r.restaurantColumns || [];
              
              hotelCols.filter(col => {
                return col.values && Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
              }).forEach(c => tbDates.push(c.date));
              
              restaurantCols.filter(col => {
                return col.values && Object.values(col.values).some(v => v !== '' && parseFloat(v) !== 0);
              }).forEach(c => tbDates.push(c.date));
            });

            let sortedTbDates = [...new Set(tbDates)].sort();
            if (sortedTbDates.length === 0) {
              matches.forEach(r => {
                (r.hotelColumns || []).forEach(c => sortedTbDates.push(c.date));
                (r.restaurantColumns || []).forEach(c => sortedTbDates.push(c.date));
              });
              sortedTbDates = [...new Set(sortedTbDates)].sort();
            }

            const sortedUniqueTbDates = sortedTbDates.filter(Boolean);
            let tbPeriodRange = 'No Dates';
            if (sortedUniqueTbDates.length === 1) {
              const options = { month: 'short', day: 'numeric', year: 'numeric' };
              tbPeriodRange = new Date(sortedUniqueTbDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
            } else if (sortedUniqueTbDates.length > 1) {
              const options = { month: 'short', day: 'numeric' };
              const startFmtStr = new Date(sortedUniqueTbDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
              const endFmtStr = new Date(sortedUniqueTbDates[sortedUniqueTbDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
              const yearStr = new Date(sortedUniqueTbDates[sortedUniqueTbDates.length - 1] + 'T00:00:00').getFullYear();
              tbPeriodRange = `${startFmtStr} - ${endFmtStr}, ${yearStr}`;
            }

            dateStr = new Date(matches[matches.length - 1].timestamp).toLocaleDateString();

            metricsHtml = `
              <div class="status-board-card-metrics" style="padding-left: 8px; border-left: 2px solid ${isBalanced ? 'var(--accent-green)' : 'var(--accent-red)'};">
                <div><span>TB Period:</span> <span>${tbPeriodRange}</span></div>
                <div><span>Bank Date:</span> <span>${bankDateRange}</span></div>
                <div><span>Ledger Total:</span> <span>${formatCurrency(totalLedger)}</span></div>
                <div><span>Bank Total:</span> <span>${formatCurrency(totalBank)}</span></div>
                <div style="font-weight: bold; border-top: 1px dashed var(--border-color); padding-top: 2px; margin-top: 2px;">
                  <span>Discrepancy:</span> <span class="${diffClass}">${netDiscrepancy > 0.005 ? '+' : ''}${formatCurrency(netDiscrepancy)}</span>
                </div>
              </div>
            `;
          } else {
            statusBadge = '<span class="status-pill status-discrepant" style="background-color: rgba(245,158,11,0.1); color: var(--accent-yellow); border-color: rgba(245,158,11,0.2); padding: 1px 6px; font-size: 0.65rem;"><i data-lucide="help-circle" style="width: 8px; height: 8px;"></i> No Data</span>';
            metricsHtml = `
              <p style="font-size: 0.75rem; color: var(--text-muted); font-style: italic; margin: 4px 0 4px 8px;">No reconciliation reports saved yet.</p>
            `;
          }

          secTitle.innerHTML += statusBadge;
          section.appendChild(document.createRange().createContextualFragment(metricsHtml));

          const secFooter = document.createElement('div');
          secFooter.style.fontSize = '0.7rem';
          secFooter.style.color = 'var(--text-muted)';
          secFooter.style.textAlign = 'right';
          secFooter.style.marginTop = '2px';
          secFooter.innerHTML = `Saved: ${dateStr}`;
          section.appendChild(secFooter);

          companyCard.appendChild(section);

          if (idx === 0) {
            const hr = document.createElement('hr');
            hr.style.border = 'none';
            hr.style.borderTop = '1px dotted var(--border-color)';
            hr.style.margin = '6px 0';
            companyCard.appendChild(hr);
          }
        });

        container.appendChild(companyCard);
      });
      lucide.createIcons();
    })
    .catch(err => {
      console.error(err);
      container.innerHTML = '<div class="empty-state"><p class="val-negative">Error loading status board details.</p></div>';
    });
};

function populateHistoryDropdown() {
  if (!selectLoadHistory) return;
  selectLoadHistory.innerHTML = '';
  
  const defaultOption = document.createElement('option');
  defaultOption.value = '';
  defaultOption.textContent = '-- Load Saved Report --';
  selectLoadHistory.appendChild(defaultOption);

  // Filter local history array for activeCompany and activeTab
  const filtered = history.filter(r => r.companyId === activeCompany && r.reconType === activeTab);
  // Sort chronologically descending
  filtered.sort((a, b) => b.timestamp - a.timestamp);

  filtered.forEach(r => {
    const opt = document.createElement('option');
    opt.value = r.id;
    opt.textContent = `${r.bankDate} (${r.tbDateLabel})`;
    selectLoadHistory.appendChild(opt);
  });
  
  if (activeLoadedReportId) {
    selectLoadHistory.value = activeLoadedReportId;
  }
}
