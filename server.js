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

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` ReconcileFlow Multi-Company Server is running!`);
  console.log(` Local Access:     http://localhost:${PORT}`);
  console.log(` Network Access:   http://10.0.0.180:${PORT}`);
  console.log(` Database Directory: ${DATA_DIR}`);
  console.log(`====================================================`);
});
