/**
 * ReconcileFlow - Frontend Logic
 * Dynamic multi-day spreadsheet reconciliation, Charting, localStorage, and exports.
 */

// --- STATE MANAGEMENT ---
let history = [];
let chartInstance = null;
let tbColumns = []; // Array of Trial Balance day columns

// --- CONFIGURATION ---
const RECON_CATEGORIES = [
  { id: 'visa', name: 'Visa', formula: 'TB Visa + Visa POS' },
  { id: 'mc', name: 'MasterCard (MC)', formula: 'TB MC + MC POS' },
  { id: 'discover', name: 'Discover', formula: 'TB Discover + Diner' },
  { id: 'debit1', name: 'Debit 1', formula: 'TB Debit 1' },
  { id: 'debit2', name: 'Debit 2', formula: 'TB Debit 2' }
];

const TB_ROWS = [
  { key: 'visa', label: 'Visa' },
  { key: 'mc', label: 'MasterCard (MC)' },
  { key: 'discover', label: 'Discover' },
  { key: 'debit1', label: 'Debit 1' },
  { key: 'debit2', label: 'Debit 2' },
  { key: 'visaPos', label: 'Visa POS' },
  { key: 'mcPos', label: 'MC POS' },
  { key: 'diner', label: 'Diner' }
];

// --- DOM ELEMENTS ---
const form = document.getElementById('reconcile-form');
const bankDateInput = document.getElementById('bank-date');
const tbColumnsContainer = document.getElementById('tb-columns-container');

// Bank Inputs
const bankInputIds = ['bank-visa', 'bank-mc', 'bank-discover', 'bank-debit1', 'bank-debit2'];

// Displays
const totalLedgerDisplay = document.getElementById('total-ledger-display');
const totalBankDisplay = document.getElementById('total-bank-display');
const netDiscrepancyDisplay = document.getElementById('net-discrepancy-display');
const discrepancyCardIconContainer = document.getElementById('discrepancy-icon-container');
const discrepancyIcon = document.getElementById('discrepancy-icon');

// Tables
const reconTbody = document.getElementById('recon-tbody');
const historyTbody = document.getElementById('history-tbody');
const historyCount = document.getElementById('history-count');
const noHistoryMessage = document.getElementById('no-history-message');

// Filters/Controls
const historyFromDate = document.getElementById('history-from-date');
const historyToDate = document.getElementById('history-to-date');
const filterSelect = document.getElementById('history-status-filter');
const btnSampleData = document.getElementById('btn-sample-data');
const btnClear = document.getElementById('btn-clear');
const btnCopySummary = document.getElementById('btn-copy-summary');
const btnPrintReport = document.getElementById('btn-print-report');
const btnDownloadPdf = document.getElementById('btn-download-pdf');
const btnExportCsv = document.getElementById('btn-export-csv');
const btnExportSummaryPdf = document.getElementById('btn-export-summary-pdf');
const themeToggle = document.getElementById('theme-toggle');
const btnAddTbCol = document.getElementById('btn-add-tb-col');

// Toast
const toastEl = document.getElementById('toast');
const toastMessageEl = document.getElementById('toast-message');
const toastIconEl = document.getElementById('toast-icon');

// --- INITIALIZATION ---
document.addEventListener('DOMContentLoaded', () => {
  initDates();
  initTheme();
  loadLocalStorage();

  // Initialize with 1 Trial Balance day column by default
  resetTbColumns();

  // Listeners
  btnAddTbCol.addEventListener('click', () => addTbColumn());
  form.addEventListener('submit', handleSaveReport);
  btnClear.addEventListener('click', clearInputs);
  btnSampleData.addEventListener('click', loadSampleData);
  btnCopySummary.addEventListener('click', copySummaryToClipboard);
  btnPrintReport.addEventListener('click', () => window.print());
  btnDownloadPdf.addEventListener('click', downloadCurrentReportPDF);
  btnExportCsv.addEventListener('click', exportCSV);
  btnExportSummaryPdf.addEventListener('click', downloadSummaryPDF);
  themeToggle.addEventListener('click', toggleTheme);
  
  historyFromDate.addEventListener('change', renderHistoryTable);
  historyToDate.addEventListener('change', renderHistoryTable);

  // Bank input live calculation
  bankInputIds.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('input', calculateReconciliation);
    }
  });

  // History table filters
  searchInput.addEventListener('input', renderHistoryTable);
  filterSelect.addEventListener('change', renderHistoryTable);

  initChart();
  lucide.createIcons();
});

// --- HELPER FUNCTIONS ---

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function formatCurrency(amount) {
  if (amount === 0 || amount === null || isNaN(amount)) {
    return '$ -';
  }
  const formatted = Math.abs(amount).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return amount < 0 ? `-$ ${formatted}` : `$ ${formatted}`;
}

function getVal(id) {
  const el = document.getElementById(id);
  if (!el || !el.value) return 0;
  const val = parseFloat(el.value);
  return isNaN(val) ? 0 : val;
}

function initDates() {
  const today = new Date();
  bankDateInput.value = formatDate(today);
}

function resetTbColumns() {
  tbColumns = [];
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  addTbColumn({
    date: formatDate(yesterday),
    visa: 0,
    visaPos: 0,
    mc: 0,
    mcPos: 0,
    discover: 0,
    diner: 0,
    debit1: 0,
    debit2: 0
  });
}

// --- DYNAMIC COLUMNS MANAGEMENT ---

function addTbColumn(initialValues = null) {
  let newDate = '';
  if (tbColumns.length > 0 && !initialValues) {
    const lastDateStr = tbColumns[tbColumns.length - 1].date;
    if (lastDateStr) {
      const lastDate = new Date(lastDateStr + 'T00:00:00');
      lastDate.setDate(lastDate.getDate() + 1);
      newDate = formatDate(lastDate);
    }
  } else if (!initialValues) {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    newDate = formatDate(yesterday);
  }

  const newCol = initialValues || {
    date: newDate,
    visa: 0,
    visaPos: 0,
    mc: 0,
    mcPos: 0,
    discover: 0,
    diner: 0,
    debit1: 0,
    debit2: 0
  };

  tbColumns.push(newCol);
  renderTbColumns();
  calculateReconciliation();
}

function deleteTbColumn(index) {
  if (tbColumns.length <= 1) {
    showToast('You must have at least one Trial Balance day!', 'error');
    return;
  }
  tbColumns.splice(index, 1);
  renderTbColumns();
  calculateReconciliation();
  showToast('Trial Balance column removed.', 'info');
}

function renderTbColumns() {
  tbColumnsContainer.innerHTML = '';

  tbColumns.forEach((col, index) => {
    const colDiv = document.createElement('div');
    colDiv.className = 'spreadsheet-col';
    colDiv.dataset.index = index;

    // Header cell
    const headerCell = document.createElement('div');
    headerCell.className = 'sheet-value-cell header-cell';
    
    const dateInput = document.createElement('input');
    dateInput.type = 'date';
    dateInput.value = col.date;
    dateInput.title = `TB Date for Day ${index + 1}`;
    dateInput.addEventListener('change', (e) => {
      tbColumns[index].date = e.target.value;
      calculateReconciliation();
    });

    headerCell.appendChild(dateInput);

    // Only show delete button if we have more than 1 column
    if (tbColumns.length > 1) {
      const delBtn = document.createElement('button');
      delBtn.type = 'button';
      delBtn.className = 'btn-del-col';
      delBtn.title = 'Remove this day';
      delBtn.innerHTML = '<i data-lucide="trash-2"></i>';
      delBtn.addEventListener('click', () => deleteTbColumn(index));
      headerCell.appendChild(delBtn);
    }

    colDiv.appendChild(headerCell);

    // Dynamic inputs rows for each key
    TB_ROWS.forEach(rowInfo => {
      const cell = document.createElement('div');
      cell.className = 'sheet-value-cell';

      const inputPrefix = document.createElement('div');
      inputPrefix.className = 'input-prefix';

      const symbol = document.createElement('span');
      symbol.textContent = '$';

      const input = document.createElement('input');
      input.type = 'number';
      input.step = '0.01';
      input.placeholder = '0.00';
      input.value = col[rowInfo.key] || '';
      input.addEventListener('input', (e) => {
        const val = parseFloat(e.target.value);
        tbColumns[index][rowInfo.key] = isNaN(val) ? 0 : val;
        calculateReconciliation();
      });

      inputPrefix.appendChild(symbol);
      inputPrefix.appendChild(input);
      cell.appendChild(inputPrefix);
      colDiv.appendChild(cell);
    });

    tbColumnsContainer.appendChild(colDiv);
  });

  lucide.createIcons();
}

// --- CALCULATIONS ENGINE ---

function runReconciliationLogic() {
  // Aggregate TB values across all columns
  const aggregatedTB = {
    visa: 0,
    visaPos: 0,
    mc: 0,
    mcPos: 0,
    discover: 0,
    diner: 0,
    debit1: 0,
    debit2: 0
  };

  tbColumns.forEach(col => {
    aggregatedTB.visa += col.visa || 0;
    aggregatedTB.visaPos += col.visaPos || 0;
    aggregatedTB.mc += col.mc || 0;
    aggregatedTB.mcPos += col.mcPos || 0;
    aggregatedTB.discover += col.discover || 0;
    aggregatedTB.diner += col.diner || 0;
    aggregatedTB.debit1 += col.debit1 || 0;
    aggregatedTB.debit2 += col.debit2 || 0;
  });

  // Capture bank inputs
  const bank = {
    visa: getVal('bank-visa'),
    mc: getVal('bank-mc'),
    discover: getVal('bank-discover'),
    debit1: getVal('bank-debit1'),
    debit2: getVal('bank-debit2')
  };

  // Perform Ledger mappings
  const ledger = {
    visa: Math.round((aggregatedTB.visa + aggregatedTB.visaPos) * 100) / 100,
    mc: Math.round((aggregatedTB.mc + aggregatedTB.mcPos) * 100) / 100,
    discover: Math.round((aggregatedTB.discover + aggregatedTB.diner) * 100) / 100,
    debit1: Math.round(aggregatedTB.debit1 * 100) / 100,
    debit2: Math.round(aggregatedTB.debit2 * 100) / 100
  };

  // Discrepancy calculations (Bank - CB Total)
  const discrepancies = {
    visa: Math.round((bank.visa - ledger.visa) * 100) / 100,
    mc: Math.round((bank.mc - ledger.mc) * 100) / 100,
    discover: Math.round((bank.discover - ledger.discover) * 100) / 100,
    debit1: Math.round((bank.debit1 - ledger.debit1) * 100) / 100,
    debit2: Math.round((bank.debit2 - ledger.debit2) * 100) / 100
  };

  // Totals
  const totalLedger = Math.round((ledger.visa + ledger.mc + ledger.discover + ledger.debit1 + ledger.debit2) * 100) / 100;
  const totalBank = Math.round((bank.visa + bank.mc + bank.discover + bank.debit1 + bank.debit2) * 100) / 100;
  const netDiscrepancy = Math.round((totalBank - totalLedger) * 100) / 100;

  return { aggregatedTB, bank, ledger, discrepancies, totalLedger, totalBank, netDiscrepancy };
}

function calculateReconciliation() {
  const result = runReconciliationLogic();

  // Update Header Metric Displays
  totalLedgerDisplay.textContent = formatCurrency(result.totalLedger);
  totalBankDisplay.textContent = formatCurrency(result.totalBank);
  netDiscrepancyDisplay.textContent = formatCurrency(result.netDiscrepancy);

  // Update Status Card
  if (result.netDiscrepancy === 0) {
    discrepancyCardIconContainer.style.setProperty('--icon-color', 'var(--accent-green)');
    discrepancyIcon.setAttribute('data-lucide', 'check-circle-2');
  } else {
    discrepancyCardIconContainer.style.setProperty('--icon-color', 'var(--accent-red)');
    discrepancyIcon.setAttribute('data-lucide', 'alert-circle');
  }
  lucide.createIcons();

  // Populate Reconciliation Table
  reconTbody.innerHTML = '';
  RECON_CATEGORIES.forEach(cat => {
    const ledgerVal = result.ledger[cat.id];
    const bankVal = result.bank[cat.id];
    const discVal = result.discrepancies[cat.id];

    let discClass = 'val-neutral';
    let statusPill = '';
    
    if (discVal > 0) {
      discClass = 'val-positive';
      statusPill = `<span class="status-pill status-discrepant">+${formatCurrency(discVal)} Over</span>`;
    } else if (discVal < 0) {
      discClass = 'val-negative';
      statusPill = `<span class="status-pill status-discrepant">${formatCurrency(discVal)} Short</span>`;
    } else {
      statusPill = '<span class="status-pill status-reconciled">Matched</span>';
    }

    const row = document.createElement('tr');
    row.innerHTML = `
      <td>
        <div style="font-weight: 600; color: var(--text-primary);">${cat.name}</div>
        <div style="font-size: 0.75rem; color: var(--text-muted);">${cat.formula}</div>
      </td>
      <td class="num-col">${formatCurrency(ledgerVal)}</td>
      <td class="num-col">${formatCurrency(bankVal)}</td>
      <td class="num-col ${discClass}">${formatCurrency(discVal)}</td>
      <td>${statusPill}</td>
    `;
    reconTbody.appendChild(row);
  });

  // Final summary row
  const totalRow = document.createElement('tr');
  totalRow.style.fontWeight = 'bold';
  totalRow.style.borderTop = '2px solid var(--border-color)';
  
  let netClass = 'val-neutral';
  let netStatus = '<span class="status-pill status-reconciled">Reconciled</span>';
  if (result.netDiscrepancy !== 0) {
    netClass = result.netDiscrepancy > 0 ? 'val-positive' : 'val-negative';
    netStatus = '<span class="status-pill status-discrepant">Discrepancy</span>';
  }

  totalRow.innerHTML = `
    <td>TOTALS</td>
    <td class="num-col">${formatCurrency(result.totalLedger)}</td>
    <td class="num-col">${formatCurrency(result.totalBank)}</td>
    <td class="num-col ${netClass}">${formatCurrency(result.netDiscrepancy)}</td>
    <td>${netStatus}</td>
  `;
  reconTbody.appendChild(totalRow);
}

// --- DATABASE PERSISTENCE ---

function loadLocalStorage() {
  fetch('/api/history')
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
      console.error("Failed to load history from server: ", err);
      showToast("Error loading history from server", "error");
    });
}

function handleSaveReport(e) {
  e.preventDefault();
  
  const bankDate = bankDateInput.value;
  if (!bankDate) {
    showToast('Bank date is required to save report!', 'error');
    return;
  }

  // Ensure all columns have dates
  const missingDateIndex = tbColumns.findIndex(col => !col.date);
  if (missingDateIndex !== -1) {
    showToast(`Trial Balance day #${missingDateIndex + 1} has no date filled!`, 'error');
    return;
  }

  const calculation = runReconciliationLogic();

  // Create range label for history (e.g. "2026-08-04 - 2026-08-06" or just "2026-08-04")
  let tbDateLabel = '';
  const sortedDates = tbColumns.map(c => c.date).sort();
  if (sortedDates.length === 1) {
    tbDateLabel = sortedDates[0];
  } else {
    // Pretty show start to end dates
    const options = { month: 'short', day: 'numeric' };
    const startFmt = new Date(sortedDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
    const endFmt = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
    tbDateLabel = `${startFmt} - ${endFmt}`;
  }

  // Unique ID keyed on the combination of first TB date + bankDate
  const reportId = `${sortedDates[0]}_${bankDate}`;

  const report = {
    id: reportId,
    tbDateLabel,
    primaryTbDate: sortedDates[0],
    bankDate,
    tbColumns: JSON.parse(JSON.stringify(tbColumns)), // Deep clone state
    bank: calculation.bank,
    totalLedger: calculation.totalLedger,
    totalBank: calculation.totalBank,
    netDiscrepancy: calculation.netDiscrepancy,
    timestamp: new Date().getTime()
  };

  showToast('Saving report to server...', 'info');

  fetch('/api/history', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(report)
  })
    .then(res => {
      if (!res.ok) throw new Error('Failed to save');
      return res.json();
    })
    .then(data => {
      showToast(data.message || 'Report saved successfully!', 'success');
      loadLocalStorage(); // Refresh list from server
    })
    .catch(err => {
      console.error("Failed to save report: ", err);
      showToast("Error saving report to server", "error");
    });
}

function deleteReport(id) {
  if (confirm(`Delete reconciliation report for record ${id}?`)) {
    showToast('Deleting report...', 'info');
    fetch(`/api/history/${id}`, {
      method: 'DELETE'
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to delete');
        return res.json();
      })
      .then(data => {
        showToast(data.message || 'Report deleted.', 'success');
        loadLocalStorage(); // Refresh list from server
      })
      .catch(err => {
        console.error("Failed to delete report: ", err);
        showToast("Error deleting report from server", "error");
      });
  }
}

function editReport(id) {
  const report = history.find(r => r.id === id);
  if (report) {
    bankDateInput.value = report.bankDate;
    
    // Load dynamic columns state
    tbColumns = JSON.parse(JSON.stringify(report.tbColumns));
    renderTbColumns();

    // Load bank inputs
    Object.keys(report.bank).forEach(key => {
      const input = document.getElementById(`bank-${key}`);
      if (input) input.value = report.bank[key] || '';
    });

    calculateReconciliation();
    
    document.getElementById('reconcile-form').scrollIntoView({ behavior: 'smooth' });
    showToast(`Loaded report details into the spreadsheet form.`, 'info');
  }
}

function clearInputs() {
  bankInputIds.forEach(id => {
    const input = document.getElementById(id);
    if (input) input.value = '';
  });
  initDates();
  resetTbColumns();
  calculateReconciliation();
  showToast('Form inputs cleared.', 'info');
}

// Load the 3-day weekend spreadsheet data (Screenshot 2)
function loadSampleData() {
  clearInputs();

  // Bank settlement date
  bankDateInput.value = '2026-08-06';

  // Define the 3 weekend TB columns
  tbColumns = [
    {
      date: '2026-08-04',
      visa: 10561.37,
      visaPos: 154.50,
      mc: 20843.78,
      mcPos: 0,
      discover: 0,
      diner: 0,
      debit1: 687.01,
      debit2: 0
    },
    {
      date: '2026-08-05',
      visa: 12771.89,
      visaPos: 1609.86,
      mc: 16985.01,
      mcPos: 0,
      discover: 178.13,
      diner: 0,
      debit1: 1478.67,
      debit2: 0
    },
    {
      date: '2026-08-06',
      visa: 5232.48,
      visaPos: 4.50,
      mc: 14420.87,
      mcPos: 308.42,
      discover: 0,
      diner: 0,
      debit1: 200.54,
      debit2: 0
    }
  ];

  renderTbColumns();

  // Bank values
  document.getElementById('bank-visa').value = 30325.60;
  document.getElementById('bank-mc').value = 52790.22;
  document.getElementById('bank-discover').value = 178.13;
  document.getElementById('bank-debit1').value = 2375.22;
  document.getElementById('bank-debit2').value = '';

  calculateReconciliation();
  showToast('Loaded 3-day weekend reconciliation example!', 'success');
}

function getFilteredHistory() {
  const fromVal = historyFromDate.value;
  const toVal = historyToDate.value;
  const filterVal = filterSelect.value;
  
  return history.filter(r => {
    let matchesStatus = true;
    if (filterVal === 'reconciled') matchesStatus = r.netDiscrepancy === 0;
    else if (filterVal === 'discrepant') matchesStatus = r.netDiscrepancy !== 0;

    let matchesFrom = true;
    if (fromVal) matchesFrom = r.bankDate >= fromVal;

    let matchesTo = true;
    if (toVal) matchesTo = r.bankDate <= toVal;

    return matchesStatus && matchesFrom && matchesTo;
  });
}

function renderHistoryTable() {
  const filtered = getFilteredHistory();

  historyCount.textContent = `${filtered.length} reports`;
  historyTbody.innerHTML = '';
  
  if (filtered.length === 0) {
    noHistoryMessage.style.display = 'flex';
  } else {
    noHistoryMessage.style.display = 'none';

    // Show newest first in history
    const displayList = [...filtered].reverse();
    
    displayList.forEach(report => {
      const row = document.createElement('tr');
      
      const discVal = report.netDiscrepancy;
      let discClass = 'val-neutral';
      let statusHtml = '<span class="status-pill status-reconciled">Reconciled</span>';
      
      if (discVal > 0) {
        discClass = 'val-positive';
        statusHtml = `<span class="status-pill status-discrepant">+${formatCurrency(discVal)}</span>`;
      } else if (discVal < 0) {
        discClass = 'val-negative';
        statusHtml = `<span class="status-pill status-discrepant">${formatCurrency(discVal)}</span>`;
      }

      // Pretty date for Bank Statement
      const options = { month: 'short', day: 'numeric' };
      const bankFmt = new Date(report.bankDate + 'T00:00:00').toLocaleDateString('en-US', options);

      row.innerHTML = `
        <td style="font-weight:600;">${report.tbDateLabel}</td>
        <td style="font-weight:600;">${bankFmt} <span style="font-size:0.75rem; color:var(--text-muted); font-weight:400; display:block;">${report.bankDate}</span></td>
        <td class="num-col">${formatCurrency(report.totalLedger)}</td>
        <td class="num-col">${formatCurrency(report.totalBank)}</td>
        <td class="num-col ${discClass}">${formatCurrency(discVal)}</td>
        <td>${statusHtml}</td>
        <td class="actions-col">
          <div class="action-icon-buttons">
            <button class="btn-table-action" onclick="exportReportToPDF('${report.id}')" title="Download PDF">
              <i data-lucide="file-text"></i>
            </button>
            <button class="btn-table-action" onclick="editReport('${report.id}')" title="Edit Report">
              <i data-lucide="edit-3"></i>
            </button>
            <button class="btn-table-action delete" onclick="deleteReport('${report.id}')" title="Delete Report">
              <i data-lucide="trash-2"></i>
            </button>
          </div>
        </td>
      `;
      historyTbody.appendChild(row);
    });
    
    lucide.createIcons();
  }
}

window.editReport = editReport;
window.deleteReport = deleteReport;
window.exportReportToPDF = exportReportToPDF;

// --- CHART MANAGEMENT ---

function initChart() {
  const ctx = document.getElementById('trendChart').getContext('2d');
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#9ca3af' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';

  const chartData = getChartData();

  chartInstance = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: chartData.labels,
      datasets: [{
        label: 'Net Discrepancy Amount ($)',
        data: chartData.values,
        backgroundColor: chartData.colors,
        borderRadius: 6,
        borderWidth: 0,
        barThickness: 16
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: isDark ? '#151c2c' : '#ffffff',
          titleColor: isDark ? '#ffffff' : '#0f172a',
          bodyColor: isDark ? '#f3f4f6' : '#475569',
          borderColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
          borderWidth: 1,
          displayColors: false,
          callbacks: {
            label: function(context) {
              return `Net Discrepancy: ${formatCurrency(context.raw)}`;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { display: false },
          ticks: {
            color: textColor,
            font: { family: 'Plus Jakarta Sans', size: 10 }
          }
        },
        y: {
          grid: { color: gridColor },
          ticks: {
            color: textColor,
            font: { family: 'JetBrains Mono', size: 10 },
            callback: function(value) { return '$' + value; }
          }
        }
      }
    }
  });
}

function getChartData() {
  const sortedHistory = [...history].sort((a, b) => new Date(a.bankDate) - new Date(b.bankDate));
  const subset = sortedHistory.slice(-15);
  
  const labels = [];
  const values = [];
  const colors = [];

  subset.forEach(r => {
    const options = { month: 'short', day: 'numeric' };
    const label = new Date(r.bankDate + 'T00:00:00').toLocaleDateString('en-US', options);
    labels.push(label);
    values.push(r.netDiscrepancy);
    
    if (r.netDiscrepancy === 0) {
      colors.push('#10b981');
    } else {
      colors.push('#ef4444');
    }
  });

  if (labels.length === 0) {
    return {
      labels: ['No Data'],
      values: [0],
      colors: ['rgba(156, 163, 175, 0.2)']
    };
  }

  return { labels, values, colors };
}

function updateChart() {
  if (!chartInstance) return;

  const chartData = getChartData();
  chartInstance.data.labels = chartData.labels;
  chartInstance.data.datasets[0].data = chartData.values;
  chartInstance.data.datasets[0].backgroundColor = chartData.colors;
  
  const isDark = document.body.classList.contains('dark-theme');
  const textColor = isDark ? '#9ca3af' : '#475569';
  const gridColor = isDark ? 'rgba(255, 255, 255, 0.05)' : 'rgba(0, 0, 0, 0.05)';
  
  chartInstance.options.scales.x.ticks.color = textColor;
  chartInstance.options.scales.y.ticks.color = textColor;
  chartInstance.options.scales.y.grid.color = gridColor;
  chartInstance.options.plugins.tooltip.backgroundColor = isDark ? '#151c2c' : '#ffffff';
  chartInstance.options.plugins.tooltip.titleColor = isDark ? '#ffffff' : '#0f172a';
  chartInstance.options.plugins.tooltip.bodyColor = isDark ? '#f3f4f6' : '#475569';
  chartInstance.options.plugins.tooltip.borderColor = isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';

  chartInstance.update();
}

// --- UTILITIES & EXPORTS ---

function copySummaryToClipboard() {
  const result = runReconciliationLogic();
  const bankDate = bankDateInput.value;

  if (!bankDate) {
    showToast('Reconciliation date must be filled!', 'error');
    return;
  }

  // Dates string
  const sortedDates = tbColumns.map(c => c.date).sort();
  const tbDatesStr = sortedDates.join(', ');

  let text = `Daily Bank Reconciliation Summary\n`;
  text += `Trial Balance (TB) Dates: [${tbDatesStr}] | Bank Deposit Date: ${bankDate}\n`;
  text += `===========================================================\n`;
  text += `Category       CB Ledger (TB)    Bank Statement    Discrepancy\n`;
  text += `-----------------------------------------------------------\n`;

  RECON_CATEGORIES.forEach(cat => {
    const namePad = cat.name.padEnd(14, ' ');
    const ledgerFmt = formatCurrency(result.ledger[cat.id]).padStart(17, ' ');
    const bankFmt = formatCurrency(result.bank[cat.id]).padStart(18, ' ');
    const discFmt = formatCurrency(result.discrepancies[cat.id]).padStart(14, ' ');
    text += `${namePad}${ledgerFmt}${bankFmt}${discFmt}\n`;
  });

  text += `-----------------------------------------------------------\n`;
  const netText = result.netDiscrepancy === 0 ? 'RECONCILED (0.00 Difference)' : `UNRECONCILED (${formatCurrency(result.netDiscrepancy)} Difference)`;
  text += `TOTALS:       ${formatCurrency(result.totalLedger).padStart(17, ' ')}${formatCurrency(result.totalBank).padStart(18, ' ')}${formatCurrency(result.netDiscrepancy).padStart(14, ' ')}\n`;
  text += `Status:       ${netText}\n`;
  text += `===========================================================\n`;
  text += `Report generated via ReconcileFlow on ${new Date().toLocaleDateString()}`;

  navigator.clipboard.writeText(text).then(() => {
    showToast('Summary copied to clipboard!', 'success');
  }).catch(() => {
    showToast('Failed to copy summary.', 'error');
  });
}

function exportCSV() {
  const filtered = getFilteredHistory();
  if (filtered.length === 0) {
    showToast('No saved history reports match the selected filters.', 'error');
    return;
  }

  let csvContent = 'data:text/csv;charset=utf-8,';
  
  // Headers
  csvContent += 'TB Dates / Range,Bank Date,Total Ledger Receipts,Total Bank Deposits,Net Discrepancy,Status\n';

  let sumLedger = 0;
  let sumBank = 0;
  let sumDisc = 0;

  filtered.forEach(r => {
    sumLedger += r.totalLedger || 0;
    sumBank += r.totalBank || 0;
    sumDisc += r.netDiscrepancy || 0;

    const statusText = r.netDiscrepancy === 0 ? 'Reconciled' : (r.netDiscrepancy > 0 ? 'Over' : 'Short');
    const rowValues = [
      `"${r.tbDateLabel}"`,
      r.bankDate,
      r.totalLedger,
      r.totalBank,
      r.netDiscrepancy,
      statusText
    ];
    csvContent += rowValues.join(',') + '\n';
  });

  // Calculate clean float sums
  sumLedger = Math.round(sumLedger * 100) / 100;
  sumBank = Math.round(sumBank * 100) / 100;
  sumDisc = Math.round(sumDisc * 100) / 100;

  const totalStatus = sumDisc === 0 ? 'Reconciled' : 'Discrepancy';
  const summaryRow = [
    'SUMS',
    '',
    sumLedger,
    sumBank,
    sumDisc,
    totalStatus
  ];
  csvContent += summaryRow.join(',') + '\n';

  // Determine date ranges for filename
  const fromVal = historyFromDate.value || 'All';
  const toVal = historyToDate.value || 'All';

  const encodedUri = encodeURI(csvContent);
  const link = document.createElement('a');
  link.setAttribute('href', encodedUri);
  link.setAttribute('download', `Reconciliation_Summary_${fromVal}_to_${toVal}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showToast('Exported Excel Summary successfully!', 'success');
}

function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'dark';
  if (savedTheme === 'light') {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
  }
}

function toggleTheme() {
  if (document.body.classList.contains('dark-theme')) {
    document.body.classList.remove('dark-theme');
    document.body.classList.add('light-theme');
    localStorage.setItem('theme', 'light');
    showToast('Theme switched to Light Mode', 'info');
  } else {
    document.body.classList.remove('light-theme');
    document.body.classList.add('dark-theme');
    localStorage.setItem('theme', 'dark');
    showToast('Theme switched to Dark Mode', 'info');
  }
  updateChart();
}

let toastTimeout = null;
function showToast(message, type = 'info') {
  clearTimeout(toastTimeout);
  toastMessageEl.textContent = message;
  toastEl.className = `toast show ${type}`;
  
  let iconName = 'info';
  if (type === 'success') iconName = 'check-circle';
  if (type === 'error') iconName = 'alert-triangle';
  
  toastIconEl.setAttribute('data-lucide', iconName);
  lucide.createIcons();

  toastTimeout = setTimeout(() => {
    toastEl.classList.remove('show');
  }, 3500);
}

// --- PDF GENERATION ENGINE ---

function downloadCurrentReportPDF() {
  const bankDateStr = bankDateInput.value;
  if (!bankDateStr) {
    showToast('Reconciliation date must be filled!', 'error');
    return;
  }

  // Check if dates are filled
  const missingDate = tbColumns.findIndex(col => !col.date);
  if (missingDate !== -1) {
    showToast(`Trial Balance day #${missingDate + 1} has no date filled!`, 'error');
    return;
  }

  const sortedDates = tbColumns.map(c => c.date).sort();
  let tbDatesStr = '';
  if (sortedDates.length === 1) {
    tbDatesStr = sortedDates[0];
  } else {
    const options = { month: 'short', day: 'numeric' };
    const startFmt = new Date(sortedDates[0] + 'T00:00:00').toLocaleDateString('en-US', options);
    const endFmt = new Date(sortedDates[sortedDates.length - 1] + 'T00:00:00').toLocaleDateString('en-US', options);
    tbDatesStr = `${startFmt} - ${endFmt} (${sortedDates[0]} to ${sortedDates[sortedDates.length - 1]})`;
  }

  const bankValues = {
    visa: getVal('bank-visa'),
    mc: getVal('bank-mc'),
    discover: getVal('bank-discover'),
    debit1: getVal('bank-debit1'),
    debit2: getVal('bank-debit2')
  };

  showToast('Generating PDF report...', 'info');
  generateReconciliationPDF(tbDatesStr, bankDateStr, tbColumns, bankValues);
}

function exportReportToPDF(id) {
  const report = history.find(r => r.id === id);
  if (!report) {
    showToast('Report not found in history!', 'error');
    return;
  }

  showToast(`Generating PDF report for Bank date ${report.bankDate}...`, 'info');
  generateReconciliationPDF(report.tbDateLabel, report.bankDate, report.tbColumns, report.bank);
}

function generateReconciliationPDF(tbDatesStr, bankDateStr, tbCols, bankValues) {
  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Helper to format currency for PDF
    const fmt = (val) => {
      if (val === 0 || val === null || isNaN(val)) return '$ -';
      const formatted = Math.abs(val).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return val < 0 ? `-$ ${formatted}` : `$ ${formatted}`;
    };

    // 1. Header Banner
    doc.setFillColor(15, 23, 42); // slate 900
    doc.rect(0, 0, 210, 42, 'F');
    
    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ReconcileFlow", 15, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184); // slate-400
    doc.text("DAILY BANK DISCREPANCY RECONCILIATION REPORT", 15, 30);
    
    // 2. Metadata Block
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Reconciliation Details", 15, 54);
    
    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240); // light gray line
    doc.line(15, 57, 195, 57);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);
    
    doc.setFont("helvetica", "bold");
    doc.text("Bank Settlement Date:", 15, 66);
    doc.setFont("helvetica", "normal");
    doc.text(bankDateStr, 58, 66);
    
    doc.setFont("helvetica", "bold");
    doc.text("Trial Balance Range:", 15, 73);
    doc.setFont("helvetica", "normal");
    doc.text(tbDatesStr, 58, 73);

    doc.setFont("helvetica", "bold");
    doc.text("Generated On:", 120, 66);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleString(), 150, 66);

    // 3. Recalculate values for the PDF
    const aggregatedTB = { visa: 0, visaPos: 0, mc: 0, mcPos: 0, discover: 0, diner: 0, debit1: 0, debit2: 0 };
    tbCols.forEach(col => {
      aggregatedTB.visa += col.visa || 0;
      aggregatedTB.visaPos += col.visaPos || 0;
      aggregatedTB.mc += col.mc || 0;
      aggregatedTB.mcPos += col.mcPos || 0;
      aggregatedTB.discover += col.discover || 0;
      aggregatedTB.diner += col.diner || 0;
      aggregatedTB.debit1 += col.debit1 || 0;
      aggregatedTB.debit2 += col.debit2 || 0;
    });

    const ledger = {
      visa: Math.round((aggregatedTB.visa + aggregatedTB.visaPos) * 100) / 100,
      mc: Math.round((aggregatedTB.mc + aggregatedTB.mcPos) * 100) / 100,
      discover: Math.round((aggregatedTB.discover + aggregatedTB.diner) * 100) / 100,
      debit1: Math.round(aggregatedTB.debit1 * 100) / 100,
      debit2: Math.round(aggregatedTB.debit2 * 100) / 100
    };

    const bank = {
      visa: bankValues.visa || 0,
      mc: bankValues.mc || 0,
      discover: bankValues.discover || 0,
      debit1: bankValues.debit1 || 0,
      debit2: bankValues.debit2 || 0
    };

    const discrepancies = {
      visa: Math.round((bank.visa - ledger.visa) * 100) / 100,
      mc: Math.round((bank.mc - ledger.mc) * 100) / 100,
      discover: Math.round((bank.discover - ledger.discover) * 100) / 100,
      debit1: Math.round((bank.debit1 - ledger.debit1) * 100) / 100,
      debit2: Math.round((bank.debit2 - ledger.debit2) * 100) / 100
    };

    const totalLedger = Math.round((ledger.visa + ledger.mc + ledger.discover + ledger.debit1 + ledger.debit2) * 100) / 100;
    const totalBank = Math.round((bank.visa + bank.mc + bank.discover + bank.debit1 + bank.debit2) * 100) / 100;
    const netDiscrepancy = Math.round((totalBank - totalLedger) * 100) / 100;

    // 4. Detailed Table using jsPDF-AutoTable
    const bodyRows = RECON_CATEGORIES.map(cat => {
      const lVal = ledger[cat.id];
      const bVal = bank[cat.id];
      const dVal = discrepancies[cat.id];
      let statusText = 'Matched';
      if (dVal > 0) statusText = `Over (+${fmt(dVal)})`;
      if (dVal < 0) statusText = `Short (${fmt(dVal)})`;

      return [
        cat.name,
        fmt(lVal),
        fmt(bVal),
        fmt(dVal),
        statusText
      ];
    });

    // Add totals row
    let netStatus = 'Reconciled';
    if (netDiscrepancy !== 0) {
      netStatus = netDiscrepancy > 0 ? 'Discrepancy (Over)' : 'Discrepancy (Short)';
    }
    bodyRows.push([
      'TOTALS',
      fmt(totalLedger),
      fmt(totalBank),
      fmt(netDiscrepancy),
      netStatus
    ]);

    doc.autoTable({
      startY: 82,
      head: [['Category', 'Ledger Total (CB)', 'Bank Statement', 'Discrepancy', 'Status']],
      body: bodyRows,
      theme: 'striped',
      headStyles: {
        fillColor: [30, 41, 59], // Slate-700
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        1: { halign: 'right' },
        2: { halign: 'right' },
        3: { halign: 'right' }
      },
      didParseCell: function (data) {
        // Bold the totals row
        if (data.row.index === bodyRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249]; // Light grey background
          if (data.column.index === 3) {
            // Color code net discrepancy total
            if (netDiscrepancy > 0) data.cell.styles.textColor = [16, 185, 129]; // Green
            if (netDiscrepancy < 0) data.cell.styles.textColor = [239, 68, 68]; // Red
          }
        } else {
          // Color code individual discrepancy columns
          if (data.column.index === 3) {
            const val = discrepancies[RECON_CATEGORIES[data.row.index].id];
            if (val > 0) data.cell.styles.textColor = [16, 185, 129];
            if (val < 0) data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    });

    // 5. Summary Info Callout
    const finalY = doc.lastAutoTable.finalY + 12;
    
    doc.setFillColor(248, 250, 252); // grey-50
    doc.setDrawColor(226, 232, 240); // slate-200
    doc.rect(15, finalY, 180, 32, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Reconciliation Summary Status", 20, finalY + 8);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Ledger Receipts Total:   ${fmt(totalLedger)}`, 20, finalY + 16);
    doc.text(`Bank Statement Total:   ${fmt(totalBank)}`, 20, finalY + 23);
    
    // Large status callout
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    if (netDiscrepancy === 0) {
      doc.setTextColor(16, 185, 129); // Green
      doc.text("RECONCILED", 130, finalY + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Zero Net Discrepancy", 130, finalY + 20);
    } else {
      doc.setTextColor(239, 68, 68); // Red
      doc.text(`DISCREPANCY: ${fmt(netDiscrepancy)}`, 110, finalY + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Ledger and Bank amounts mismatch", 110, finalY + 20);
    }

    // Footer page marker
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("ReconcileFlow - Daily Bank Discrepancy reconciliation", 15, 285);
    doc.text("Page 1 of 1", 185, 285);

    // Save report file
    const filename = `Reconciliation_Report_Bank_${bankDateStr}.pdf`;
    doc.save(filename);
    showToast('PDF downloaded successfully!', 'success');
  } catch (err) {
    console.error("PDF generation failed: ", err);
    showToast('Failed to generate PDF. Make sure CDNs loaded correctly.', 'error');
  }
}

function downloadSummaryPDF() {
  const filtered = getFilteredHistory();
  if (filtered.length === 0) {
    showToast('No saved history reports match the selected filters.', 'error');
    return;
  }

  showToast('Generating summary PDF report...', 'info');

  try {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();

    // Helper to format currency
    const fmt = (val) => {
      if (val === 0 || val === null || isNaN(val)) return '$ -';
      const formatted = Math.abs(val).toLocaleString('en-US', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      });
      return val < 0 ? `-$ ${formatted}` : `$ ${formatted}`;
    };

    // 1. Header Banner
    doc.setFillColor(30, 41, 59); // slate-800
    doc.rect(0, 0, 210, 42, 'F');

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(22);
    doc.text("ReconcileFlow", 15, 20);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(203, 213, 225); // slate-300
    doc.text("DAILY RECONCILIATION SUMMARY REPORT - ROLL-UP", 15, 30);

    // 2. Metadata Block
    doc.setTextColor(15, 23, 42);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.text("Summary Period Details", 15, 54);

    doc.setLineWidth(0.5);
    doc.setDrawColor(226, 232, 240);
    doc.line(15, 57, 195, 57);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.setTextColor(71, 85, 105);

    const fromVal = historyFromDate.value || 'Beginning of Log';
    const toVal = historyToDate.value || 'Present';
    const filterVal = filterSelect.value;
    let statusLabel = 'All Saved Records';
    if (filterVal === 'reconciled') statusLabel = 'Reconciled Reports Only';
    else if (filterVal === 'discrepant') statusLabel = 'Discrepant Reports Only';

    doc.setFont("helvetica", "bold");
    doc.text("Date Range Select:", 15, 66);
    doc.setFont("helvetica", "normal");
    doc.text(`${fromVal} to ${toVal}`, 55, 66);

    doc.setFont("helvetica", "bold");
    doc.text("Filtered Status Type:", 15, 73);
    doc.setFont("helvetica", "normal");
    doc.text(statusLabel, 55, 73);

    doc.setFont("helvetica", "bold");
    doc.text("Generated On:", 120, 66);
    doc.setFont("helvetica", "normal");
    doc.text(new Date().toLocaleString(), 150, 66);

    doc.setFont("helvetica", "bold");
    doc.text("Report Count:", 120, 73);
    doc.setFont("helvetica", "normal");
    doc.text(`${filtered.length} days reconciled`, 150, 73);

    // 3. Aggregate totals
    let sumLedger = 0;
    let sumBank = 0;
    let sumDisc = 0;

    // 4. Construct table body
    const bodyRows = filtered.map(r => {
      sumLedger += r.totalLedger || 0;
      sumBank += r.totalBank || 0;
      sumDisc += r.netDiscrepancy || 0;

      const statusText = r.netDiscrepancy === 0 ? 'Reconciled' : (r.netDiscrepancy > 0 ? 'Over' : 'Short');

      return [
        r.tbDateLabel,
        r.bankDate,
        fmt(r.totalLedger),
        fmt(r.totalBank),
        fmt(r.netDiscrepancy),
        statusText
      ];
    });

    // Calculate rounded sums
    sumLedger = Math.round(sumLedger * 100) / 100;
    sumBank = Math.round(sumBank * 100) / 100;
    sumDisc = Math.round(sumDisc * 100) / 100;

    let aggregateStatus = 'Reconciled';
    if (sumDisc !== 0) {
      aggregateStatus = sumDisc > 0 ? 'Discrepancy (Over)' : 'Discrepancy (Short)';
    }

    // Add totals row to the bottom
    bodyRows.push([
      'ROLL-UP TOTALS',
      '',
      fmt(sumLedger),
      fmt(sumBank),
      fmt(sumDisc),
      aggregateStatus
    ]);

    doc.autoTable({
      startY: 82,
      head: [['TB Dates / Range', 'Bank Date', 'Total Ledger (CB)', 'Total Bank', 'Net Discrepancy', 'Status']],
      body: bodyRows,
      theme: 'striped',
      headStyles: {
        fillColor: [71, 85, 105], // Slate-600
        textColor: [255, 255, 255],
        fontStyle: 'bold',
        halign: 'left'
      },
      columnStyles: {
        2: { halign: 'right' },
        3: { halign: 'right' },
        4: { halign: 'right' }
      },
      didParseCell: function (data) {
        // Bold the summary totals row
        if (data.row.index === bodyRows.length - 1) {
          data.cell.styles.fontStyle = 'bold';
          data.cell.styles.fillColor = [241, 245, 249];
          
          if (data.column.index === 4) {
            // Net discrepancy totals colors
            if (sumDisc > 0) data.cell.styles.textColor = [16, 185, 129];
            if (sumDisc < 0) data.cell.styles.textColor = [239, 68, 68];
          }
        } else {
          // Highlight rows with discrepancies in red
          if (data.column.index === 4) {
            const val = filtered[data.row.index].netDiscrepancy;
            if (val > 0) data.cell.styles.textColor = [16, 185, 129];
            if (val < 0) data.cell.styles.textColor = [239, 68, 68];
          }
        }
      }
    });

    // 5. Final Roll-up Block
    const finalY = doc.lastAutoTable.finalY + 12;
    doc.setFillColor(248, 250, 252);
    doc.setDrawColor(226, 232, 240);
    doc.rect(15, finalY, 180, 28, 'FD');

    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(15, 23, 42);
    doc.text("Roll-up Summary Period Totals", 20, finalY + 8);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(71, 85, 105);
    doc.text(`Total Ledger Receipts: ${fmt(sumLedger)}`, 20, finalY + 16);
    doc.text(`Total Bank statement:  ${fmt(sumBank)}`, 20, finalY + 22);

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    if (sumDisc === 0) {
      doc.setTextColor(16, 185, 129);
      doc.text("BALANCED PERIOD", 130, finalY + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Zero Net Period Discrepancy", 130, finalY + 20);
    } else {
      doc.setTextColor(239, 68, 68);
      doc.text(`NET DISCREPANCY: ${fmt(sumDisc)}`, 110, finalY + 14);
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8);
      doc.setTextColor(100, 116, 139);
      doc.text("Discrepancies found within selected period", 110, finalY + 20);
    }

    // Page marker
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text("ReconcileFlow - Reconciliation Roll-up Summary Report", 15, 285);
    doc.text("Page 1 of 1", 185, 285);

    const fromFmt = fromVal.replace(/-/g, '');
    const toFmt = toVal.replace(/-/g, '');
    doc.save(`Reconciliation_Summary_${fromFmt}_to_${toFmt}.pdf`);
    showToast('Summary PDF downloaded successfully!', 'success');
  } catch (err) {
    console.error("Summary PDF generation failed: ", err);
    showToast('Failed to generate PDF summary report.', 'error');
  }
}
