const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- DATABASE INITIALIZATION ---
const db = new sqlite3.Database('./kanban.db', (err) => {
  if (err) {
    console.error('Error opening database:', err.message);
  } else {
    console.log('>>> CONNECTED TO A FRESH SQLITE DATABASE <<<');
  }
});

// Create table with Auto-Incrementing Integer IDs
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS tasks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      status TEXT NOT NULL
    )
  `);

  // Seed initial tasks if table is empty
  db.get('SELECT COUNT(*) as count FROM tasks', [], (err, row) => {
    if (row && row.count === 0) {
      const stmt = db.prepare('INSERT INTO tasks (id, title, status) VALUES (?, ?, ?)');
      stmt.run(1, 'Study for Deep Learning Exam', 'To Do');
      stmt.run(2, 'Design PrepFlow app structure', 'In Progress');
      stmt.run(3, 'Review Anmol\'s C++ algorithm', 'In Progress');
      stmt.run(4, 'Publish Fiverr gig description', 'Done');
      stmt.finalize();
      console.log('>>> SYSTEM DATABASE SEEDED WITH CLEAN SEQUENTIAL IDS <<<');
    }
  });
});

// --- API ENDPOINTS ---

// 1. GET ALL TASKS
app.get('/api/tasks', (req, res) => {
  db.all('SELECT * FROM tasks', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    
    // Ensure all IDs are passed as strings to keep React hooks happy
    const formattedRows = rows.map(row => ({ ...row, id: row.id.toString() }));
    res.json(formattedRows);
  });
});

// 2. CREATE A NEW TASK (Auto-Incrementing Engine)
app.post('/api/tasks', (req, res) => {
  const { title } = req.body;
  if (!title) return res.status(400).json({ error: 'Title is required' });

  const defaultStatus = 'To Do';

  // We omit the ID field completely here; SQLite inserts the next sequential integer automatically
  db.run(
    'INSERT INTO tasks (title, status) VALUES (?, ?)',
    [title, defaultStatus],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      
      // "this.lastID" grabs the exact integer ID SQLite just assigned to this row
      res.json({ 
        id: this.lastID.toString(), // Cast to string for frontend compatibility
        title, 
        status: defaultStatus 
      });
    }
  );
});

// 3. UPDATE TASK STATUS
app.put('/api/tasks/:id', (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  db.run('UPDATE tasks SET status = ? WHERE id = ?', [status, id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Updated', changes: this.changes });
  });
});

// 4. DELETE A TASK
app.delete('/api/tasks/:id', (req, res) => {
  const { id } = req.params;

  db.run('DELETE FROM tasks WHERE id = ?', [id], function (err) {
    if (err) return res.status(500).json({ error: err.message });
    res.json({ message: 'Deleted', changes: this.changes });
  });
});

// Start Server
app.listen(PORT, () => {
  console.log(`\n>>> CYBER::FLOW BACKEND RUNNING ON PORT ${PORT} <<<`);
});