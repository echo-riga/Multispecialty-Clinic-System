const express = require('express');
const router = express.Router();
const { db } = require('../data/db');

// POST /api/login
router.post('/login', (req, res) => {
  const { username, password } = req.body || {};
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  const row = db.prepare('SELECT username, password, role FROM users WHERE username = ?').get(String(username));
  if (!row || row.password !== String(password)) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }
  return res.json({ username: row.username, role: row.role });
});

module.exports = router;


