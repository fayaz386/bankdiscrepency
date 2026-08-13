/**
 * ReconcileFlow - Backend Server (Enhanced)
 * Supports User Authentication, User Directory Admin, Multi-Company, and segmented reports.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;

// Database Files
const DATA_DIR = path.join(__dirname, 'data');
const HISTORY_FILE = path.join(DATA_DIR, 'history.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');

// Ensure database folders and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR);
}
if (!fs.existsSync(HISTORY_FILE)) {
  fs.writeFileSync(HISTORY_FILE, JSON.stringify([]), 'utf8');
}
if (!fs.existsSync(USERS_FILE)) {
  // Create default admin account
  const defaultAdmin = [{ username: 'admin', password: 'admin123', role: 'admin' }];
  fs.writeFileSync(USERS_FILE, JSON.stringify(defaultAdmin, null, 2), 'utf8');
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname));

// --- FILE DB HELPERS ---

function readJSON(filePath) {
  try {
    const raw = fs.readFileSync(filePath, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error(`Error reading file ${filePath}: `, err);
    return [];
  }
}

// Ensure database folders and files exist
function writeJSON(filePath, data) {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error(`Error writing file ${filePath}: `, err);
    return false;
  }
}

// --- AUTH & USER MANAGEMENT APIs ---

// Login Endpoint
app.post('/api/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase() && u.password === password);

  if (user) {
    res.json({
      message: 'Login successful!',
      user: {
        username: user.username,
        role: user.role
      }
    });
  } else {
    res.status(401).json({ error: 'Invalid username or password' });
  }
});

// Get all users (Admin only)
app.get('/api/users', (req, res) => {
  const users = readJSON(USERS_FILE).map(u => ({ username: u.username, role: u.role }));
  res.json(users);
});

// Add new user (Admin only)
app.post('/api/users', (req, res) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' });
  }

  const users = readJSON(USERS_FILE);
  const exists = users.some(u => u.username.toLowerCase() === username.toLowerCase());

  if (exists) {
    return res.status(400).json({ error: 'Username already exists' });
  }

  users.push({ username, password, role });
  if (writeJSON(USERS_FILE, users)) {
    res.json({ message: `User account '${username}' created successfully!` });
  } else {
    res.status(500).json({ error: 'Failed to write user database to disk' });
  }
});

// Change user password (Admin only)
app.post('/api/users/password', (req, res) => {
  const { username, newPassword } = req.body;
  if (!username || !newPassword) {
    return res.status(400).json({ error: 'Username and new password are required' });
  }

  const users = readJSON(USERS_FILE);
  const user = users.find(u => u.username.toLowerCase() === username.toLowerCase());

  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }

  user.password = newPassword;
  if (writeJSON(USERS_FILE, users)) {
    res.json({ message: `Password for user '${username}' updated successfully!` });
  } else {
    res.status(500).json({ error: 'Failed to update user password on disk' });
  }
});

// Delete user (Admin only)
app.delete('/api/users/:username', (req, res) => {
  const { username } = req.params;
  const users = readJSON(USERS_FILE);

  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'Cannot delete the default administrator account' });
  }

  const filtered = users.filter(u => u.username.toLowerCase() !== username.toLowerCase());
  if (users.length === filtered.length) {
    return res.status(404).json({ error: 'User not found' });
  }

  if (writeJSON(USERS_FILE, filtered)) {
    res.json({ message: `User account '${username}' deleted successfully!` });
  } else {
    res.status(500).json({ error: 'Failed to update user database on disk' });
  }
});

// --- SEGMENTED RECONCILIATION APIs ---

// Get history filtered by companyId and reconType
app.get('/api/history', (req, res) => {
  const { companyId, reconType } = req.query;
  if (!companyId || !reconType) {
    return res.status(400).json({ error: 'companyId and reconType are required parameters' });
  }

  const history = readJSON(HISTORY_FILE);
  // Filter only items matching company and type
  const filtered = history.filter(r => r.companyId === companyId && r.reconType === reconType);
  res.json(filtered);
});

// Get latest status for both companies and recon categories
app.get('/api/latest-status', (req, res) => {
  const history = readJSON(HISTORY_FILE);
  const combos = [
    { companyId: 'ws_hospitality', reconType: 'cards', title: 'WS Hospitality - Cards' },
    { companyId: 'ws_hospitality', reconType: 'amex', title: 'WS Hospitality - AMEX' },
    { companyId: 'ws_hotels', reconType: 'cards', title: 'WS Hotels - Cards' },
    { companyId: 'ws_hotels', reconType: 'amex', title: 'WS Hotels - AMEX' }
  ];
  
  const result = combos.map(c => {
    const matches = history.filter(r => r.companyId === c.companyId && r.reconType === c.reconType);
    matches.sort((a, b) => b.timestamp - a.timestamp); // latest first
    if (matches.length > 0) {
      const r = matches[0];
      return {
        companyId: c.companyId,
        reconType: c.reconType,
        title: c.title,
        hasReport: true,
        bankDate: r.bankDate,
        tbDateLabel: r.tbDateLabel,
        totalLedger: r.totalLedger,
        totalBank: r.totalBank,
        netDiscrepancy: r.netDiscrepancy,
        timestamp: r.timestamp
      };
    } else {
      return {
        companyId: c.companyId,
        reconType: c.reconType,
        title: c.title,
        hasReport: false
      };
    }
  });
  res.json(result);
});

// Get all history records across all companies and categories
app.get('/api/all-history', (req, res) => {
  const history = readJSON(HISTORY_FILE);
  res.json(history);
});

// Save or update a segmented report
app.post('/api/history', (req, res) => {
  const report = req.body;
  if (!report || !report.id || !report.companyId || !report.reconType) {
    return res.status(400).json({ error: 'Invalid report payload (missing id, companyId, or reconType)' });
  }

  const history = readJSON(HISTORY_FILE);
  const index = history.findIndex(r => r.id === report.id);

  if (index !== -1) {
    // Update existing report
    history[index] = report;
  } else {
    // Save new report
    history.push(report);
  }

  // Sort history chronologically by bankDate
  history.sort((a, b) => new Date(a.bankDate) - new Date(b.bankDate));

  if (writeJSON(HISTORY_FILE, history)) {
    res.json({ message: 'Report saved to server database!', report });
  } else {
    res.status(500).json({ error: 'Failed to write history database to disk' });
  }
});

// Delete a report
app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const history = readJSON(HISTORY_FILE);
  const filtered = history.filter(r => r.id !== id);

  if (writeJSON(HISTORY_FILE, filtered)) {
    res.json({ message: `Report deleted successfully!` });
  } else {
    res.status(500).json({ error: 'Failed to update history database on disk' });
  }
});

// --- DATABASE PATCH: Recalculate historical totals dynamically ---
function recalculateSavedHistory() {
  console.log('Running database patch/recalculation for history.json...');
  const history = readJSON(HISTORY_FILE);
  if (!Array.isArray(history) || history.length === 0) {
    console.log('No history records found to patch.');
    return;
  }

  // Same math helper logic as client-side to parse and evaluate inputs correctly
  function parseMathExpression(val) {
    if (val === undefined || val === null || val === '') return 0;
    if (typeof val === 'number') return val;
    const cleanStr = val.toString().replace(/[^0-9.+-]/g, '');
    const matches = cleanStr.match(/[+-]?(?:[0-9]+(?:\.[0-9]+)?|\.[0-9]+)/g);
    if (!matches) return 0;
    let sum = 0;
    matches.forEach(m => {
      const num = parseFloat(m);
      if (!isNaN(num)) sum += num;
    });
    return sum;
  }

  const CARD_ROWS = [
    { id: 'visa', name: 'Visa' },
    { id: 'visapos', name: 'Visa POS' },
    { id: 'mc', name: 'MasterCard' },
    { id: 'mcpos', name: 'MC POS' },
    { id: 'discover', name: 'Discover' },
    { id: 'diner', name: 'Diner' },
    { id: 'debit1', name: 'Debit 1' },
    { id: 'debit2', name: 'Debit 2' }
  ];

  const AMEX_ROWS = [
    { id: 'amex', name: 'AMEX' },
    { id: 'amexpos', name: 'AMEX POS' }
  ];

  let patchedCount = 0;

  history.forEach(r => {
    // We only recalculate if the columns exist (hotelColumns, restaurantColumns, etc.)
    if (!r.hotelColumns || !r.restaurantColumns) return;

    const isCards = r.reconType === 'cards';
    const rows = isCards ? CARD_ROWS : AMEX_ROWS;

    // Calculate category sums
    const tbSums = {};
    rows.forEach(row => {
      let hotelSum = 0;
      let restaurantSum = 0;

      const savedHotelCats = r.hotelCategories || {
        cards: {
          visa: { name: 'Visa', lines: [{ id: 'visa_0', name: 'Line 1' }] },
          mc: { name: 'MasterCard', lines: [{ id: 'mc_0', name: 'Line 1' }] },
          discover: { name: 'Discover', lines: [{ id: 'discover_0', name: 'Line 1' }] },
          debit1: { name: 'Debit 1', lines: [{ id: 'debit1_0', name: 'Line 1' }] },
          debit2: { name: 'Debit 2', lines: [{ id: 'debit2_0', name: 'Line 1' }] }
        },
        amex: {
          amex: { name: 'AMEX', lines: [{ id: 'amex_0', name: 'Line 1' }] }
        }
      };
      
      const savedRestaurantCats = r.restaurantCategories || savedHotelCats;

      const hotelCat = savedHotelCats[r.reconType]?.[row.id];
      if (hotelCat && r.hotelColumns) {
        r.hotelColumns.forEach(col => {
          (hotelCat.lines || []).forEach(line => {
            const val = col.values[line.id] !== undefined ? col.values[line.id] : col.values[row.id];
            hotelSum += parseMathExpression(val);
          });
        });
      }

      const restCat = savedRestaurantCats[r.reconType]?.[row.id];
      if (restCat && r.restaurantColumns) {
        r.restaurantColumns.forEach(col => {
          (restCat.lines || []).forEach(line => {
            const val = col.values[line.id] !== undefined ? col.values[line.id] : col.values[row.id];
            restaurantSum += parseMathExpression(val);
          });
        });
      }

      tbSums[row.id] = hotelSum + restaurantSum;
    });

    // Calculate bank values from raw bankPostings if present, otherwise fallback to r.bank
    const bankSums = {};
    const activeKeys = isCards ? ['visa', 'mc', 'discover', 'debit1', 'debit2'] : ['amex'];
    activeKeys.forEach(key => {
      let sum = 0;
      const postings = (r.bankPostings && r.bankPostings[key]) || [];
      if (postings.length > 0) {
        postings.forEach(p => {
          sum += parseMathExpression(p.value);
        });
      } else {
        sum = parseMathExpression(r.bank ? r.bank[key] : 0);
      }
      bankSums[key] = sum;
    });

    let calculatedTotalLedger = 0;
    let calculatedTotalBank = 0;

    if (isCards) {
      const visaLedger = (tbSums['visa'] || 0) + (tbSums['visapos'] || 0);
      const visaBank = bankSums['visa'] || 0;
      const mcLedger = (tbSums['mc'] || 0) + (tbSums['mcpos'] || 0);
      const mcBank = bankSums['mc'] || 0;
      const discLedger = (tbSums['discover'] || 0) + (tbSums['diner'] || 0);
      const discBank = bankSums['discover'] || 0;
      const d1Ledger = tbSums['debit1'] || 0;
      const d1Bank = bankSums['debit1'] || 0;
      const d2Ledger = tbSums['debit2'] || 0;
      const d2Bank = bankSums['debit2'] || 0;

      calculatedTotalLedger = visaLedger + mcLedger + discLedger + d1Ledger + d2Ledger;
      calculatedTotalBank = visaBank + mcBank + discBank + d1Bank + d2Bank;
    } else {
      const amexLedger = (tbSums['amex'] || 0) + (tbSums['amexpos'] || 0);
      const amexBank = bankSums['amex'] || 0;
      calculatedTotalLedger = amexLedger;
      calculatedTotalBank = amexBank;
    }

    const netDiscrepancy = calculatedTotalBank - calculatedTotalLedger;

    // Check if the old totals differ from the new ones
    if (
      Math.abs(r.totalLedger - calculatedTotalLedger) > 0.005 ||
      Math.abs(r.totalBank - calculatedTotalBank) > 0.005 ||
      Math.abs(r.netDiscrepancy - netDiscrepancy) > 0.005
    ) {
      r.bank = bankSums; // Correct the saved bank object too!
      r.totalLedger = calculatedTotalLedger;
      r.totalBank = calculatedTotalBank;
      r.netDiscrepancy = netDiscrepancy;
      patchedCount++;
    }
  });

  if (patchedCount > 0) {
    writeJSON(HISTORY_FILE, history);
    console.log(`Successfully patched and saved ${patchedCount} records in history.json.`);
  } else {
    console.log('All historical records are already up to date.');
  }
}

// Run the database patch on startup
recalculateSavedHistory();

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` ReconcileFlow Multi-Company Server is running!`);
  console.log(` Local Access:     http://localhost:${PORT}`);
  console.log(` Network Access:   http://10.0.0.180:${PORT}`);
  console.log(` Database Directory: ${DATA_DIR}`);
  console.log(`====================================================`);
});
