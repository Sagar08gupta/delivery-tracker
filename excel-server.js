import express from 'express';
import * as XLSX from 'xlsx';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs/promises';
import { existsSync, statSync } from 'fs';
import { Worker } from 'worker_threads';
import dotenv from 'dotenv';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load env vars
dotenv.config({ path: path.join(__dirname, '.env') });
const API_TOKEN = process.env.VITE_API_TOKEN;

const app = express();
app.use(express.json({ limit: '10mb' }));

// Auth Middleware
const requireAuth = (req, res, next) => {
  const token = req.headers['authorization'];
  if (!API_TOKEN) {
    console.error('CRITICAL: VITE_API_TOKEN is missing. Rejecting request to prevent unauthenticated access.');
    return res.status(500).json({ error: 'Server misconfiguration: Authentication is unavailable.' });
  }
  if (!token || token.replace('Bearer ', '') !== API_TOKEN) {
    return res.status(401).json({ error: 'Unauthorized: Invalid API Token' });
  }
  next();
};

const EXCEL_FILE = path.join(__dirname, 'Deliverables_Master.xlsx');
const USERS_FILE = path.join(__dirname, 'src', 'users.json');

const HEADERS = [
  'Ticket ID', 'Client Name', 'Type of Deliverable', 'Comments',
  'Assigned To', 'Reviewer Name', 'Due Date', 'Status',
  'Region', 'Team', 'Delivery Date', 'Created At'
];

/**
 * Returns a tab name like "jul_2026_Personality" from a date and team.
 */
function getTabName(dateStr, team) {
  if (!dateStr || dateStr.split('-').length < 2) {
    return `other_period_${team === 'Personality' ? 'Personality' : 'Cog'}`;
  }
  const [year, month] = dateStr.split('-');
  const months = ['jan','feb','mar','apr','may','jun','jul','aug','sep','oct','nov','dec'];
  const mIndex = parseInt(month, 10) - 1;
  const monthName = (mIndex >= 0 && mIndex < 12) ? months[mIndex] : 'unknown';
  return `${monthName}_${year}_${team === 'Personality' ? 'Personality' : 'Cog'}`;
}

/**
 * POST /api/push-excel
 * Body: { tickets: Ticket[] }
 * Writes all tickets to Deliverables_Master.xlsx grouped by month-year tabs.
 */
app.post('/api/push-excel', requireAuth, async (req, res) => {
  try {
    const { tickets } = req.body;
    if (!tickets || !Array.isArray(tickets)) {
      return res.status(400).json({ error: 'Missing or invalid tickets array.' });
    }

    // Group tickets by tab name
    const grouped = {};
    tickets.forEach(ticket => {
      const dateToUse = (ticket.status === 'Complete' && ticket.deliveryDate)
        ? ticket.deliveryDate
        : ticket.dueDate;
      const tabName = getTabName(dateToUse, ticket.team);
      if (!grouped[tabName]) grouped[tabName] = [];
      grouped[tabName].push(ticket);
    });

    // Offload CPU-heavy workbook generation and writing to a Worker Thread
    // This completely frees the Node.js event loop from being blocked by XLSX.write
    await new Promise((resolve, reject) => {
      const workerCode = `
        const { parentPort, workerData } = require('worker_threads');
        const XLSX = require('xlsx');
        const fs = require('fs');
        
        try {
          const { grouped, HEADERS, EXCEL_FILE } = workerData;
          const workbook = XLSX.utils.book_new();

          if (Object.keys(grouped).length === 0) {
            const ws = XLSX.utils.aoa_to_sheet([HEADERS]);
            XLSX.utils.book_append_sheet(workbook, ws, 'No_Tickets');
          } else {
            const sortedTabs = Object.keys(grouped).sort((a, b) => b.localeCompare(a));
            sortedTabs.forEach(tabName => {
              const rows = grouped[tabName].map(t => [
                t.ticketId || '', t.clientName || '', t.deliverableType || '',
                t.comments || '', t.assignedTo || '', t.reviewerName || '',
                t.dueDate || '', t.status || '', t.region || '', t.team || '',
                t.deliveryDate || '', t.createdAt || ''
              ]);
              const ws = XLSX.utils.aoa_to_sheet([HEADERS, ...rows]);
              ws['!cols'] = [
                { wch: 12 }, { wch: 20 }, { wch: 25 }, { wch: 30 },
                { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 15 },
                { wch: 12 }, { wch: 15 }, { wch: 15 }, { wch: 20 }
              ];
              XLSX.utils.book_append_sheet(workbook, ws, tabName);
            });
          }

          const buf = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
          fs.writeFileSync(EXCEL_FILE, buf);
          parentPort.postMessage('done');
        } catch (err) {
          throw err;
        }
      `;
      const worker = new Worker(workerCode, { 
        eval: true, 
        workerData: { grouped, HEADERS, EXCEL_FILE } 
      });
      worker.on('message', resolve);
      worker.on('error', reject);
      worker.on('exit', (code) => {
        if (code !== 0) reject(new Error('Worker stopped with exit code ' + code));
      });
    });

    const tabCount = Object.keys(grouped).length;
    res.json({
      success: true,
      file: 'Deliverables_Master.xlsx',
      path: EXCEL_FILE,
      tabs: tabCount,
      tickets: tickets.length
    });
  } catch (err) {
    console.error('Error writing Excel:', err);
    res.status(500).json({ error: err.message || 'Failed to write Excel file.' });
  }
});

/**
 * POST /api/save-user
 * Appends a new user to src/users.json
 */
app.post('/api/save-user', requireAuth, async (req, res) => {
  try {
    const newUser = req.body;
    if (!newUser || !newUser.id) {
      return res.status(400).json({ error: 'Missing or invalid user object.' });
    }

    let users = [];
    if (existsSync(USERS_FILE)) {
      const data = await fs.readFile(USERS_FILE, 'utf8');
      users = JSON.parse(data);
    }
    
    // Check if user already exists
    const exists = users.find(u => u.id === newUser.id || u.empId === newUser.empId);
    if (!exists) {
      users.push(newUser);
      await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    }

    res.json({ success: true, totalUsers: users.length });
  } catch (err) {
    console.error('Error saving user to JSON:', err);
    res.status(500).json({ error: err.message || 'Failed to save user.' });
  }
});

/**
 * POST /api/sync-users
 * Overwrites src/users.json with the provided users array (handles deletions and updates)
 */
app.post('/api/sync-users', requireAuth, async (req, res) => {
  try {
    const { users } = req.body;
    if (!users || !Array.isArray(users)) {
      return res.status(400).json({ error: 'Missing or invalid users array.' });
    }

    await fs.writeFile(USERS_FILE, JSON.stringify(users, null, 2), 'utf8');
    res.json({ success: true, totalUsers: users.length });
  } catch (err) {
    console.error('Error syncing users to JSON:', err);
    res.status(500).json({ error: err.message || 'Failed to sync users.' });
  }
});

/**
 * GET /api/excel-status
 * Returns info about the current Excel file (exists, last modified, size).
 */
app.get('/api/excel-status', requireAuth, (req, res) => {
  try {
    if (existsSync(EXCEL_FILE)) {
      const stats = statSync(EXCEL_FILE);
      res.json({
        exists: true,
        file: 'Deliverables_Master.xlsx',
        path: EXCEL_FILE,
        size: stats.size,
        lastModified: stats.mtime.toISOString()
      });
    } else {
      res.json({ exists: false, file: 'Deliverables_Master.xlsx' });
    }
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`📁 Excel API server running at http://localhost:${PORT}`);
  console.log(`   Excel file location: ${EXCEL_FILE}`);
});
