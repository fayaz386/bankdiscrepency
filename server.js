/**
 * ReconcileFlow - Backend Server
 * Custom Express server with JSON file database persistence.
 */
const express = require('express');
const fs = require('fs');
const path = require('path');

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(__dirname, 'data', 'history.json');

// Ensure data folder and file exist
const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir);
}
if (!fs.existsSync(DATA_FILE)) {
  fs.writeFileSync(DATA_FILE, JSON.stringify([]), 'utf8');
}

// Middleware
app.use(express.json());
app.use(express.static(__dirname)); // Serve static files (index.html, styles.css, app.js)

// Helpers to read/write JSON database
function readData() {
  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error("Error reading database file: ", err);
    return [];
  }
}

function writeData(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf8');
    return true;
  } catch (err) {
    console.error("Error writing to database file: ", err);
    return false;
  }
}

// --- API ENDPOINTS ---

// Get all reconciliation reports
app.get('/api/history', (req, res) => {
  const history = readData();
  res.json(history);
});

// Save or Update a report
app.post('/api/history', (req, res) => {
  const report = req.body;
  if (!report || !report.id) {
    return res.status(400).json({ error: 'Invalid report data' });
  }

  const history = readData();
  const index = history.findIndex(r => r.id === report.id);

  if (index !== -1) {
    // Update existing
    history[index] = report;
  } else {
    // Insert new
    history.push(report);
  }

  // Sort history by Bank Date
  history.sort((a, b) => new Date(a.bankDate) - new Date(b.bankDate));

  if (writeData(history)) {
    res.json({ message: 'Report saved successfully!', report });
  } else {
    res.status(500).json({ error: 'Failed to write data to server disk' });
  }
});

// Delete a report
app.delete('/api/history/:id', (req, res) => {
  const { id } = req.params;
  const history = readData();
  const filtered = history.filter(r => r.id !== id);

  if (writeData(filtered)) {
    res.json({ message: `Report ${id} deleted successfully!` });
  } else {
    res.status(500).json({ error: 'Failed to delete report from server disk' });
  }
});

// Start Server
app.listen(PORT, '0.0.0.0', () => {
  console.log(`====================================================`);
  console.log(` ReconcileFlow Server is running!`);
  console.log(` Local Access:     http://localhost:${PORT}`);
  console.log(` Network Access:   http://10.0.0.180:${PORT}`);
  console.log(` Database Path:    ${DATA_FILE}`);
  console.log(`====================================================`);
});
