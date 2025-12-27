const express = require('express');
const router = express.Router();
const { db } = require('../data/db');
const { getClientUser } = require('../middleware/auth');

// Helper function to check for duplicate patients
function checkDuplicatePatient(fullName, email, phone) {
  const normalizedFullName = String(fullName || '').trim().toLowerCase();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPhone = String(phone || '').trim();
  
  const rows = db.prepare('SELECT username, full_name, email, phone FROM patient_profiles').all();
  for (const row of rows) {
    const username = row.username;
    const profile = { fullName: row.full_name, email: row.email, phone: row.phone };
    // Check full name match
    if (normalizedFullName && profile.fullName) {
      const existingFullName = String(profile.fullName).trim().toLowerCase();
      if (existingFullName === normalizedFullName) {
        return { duplicate: true, field: 'fullName', value: profile.fullName, username };
      }
    }
    
    // Check email match (if both are provided)
    if (normalizedEmail && profile.email) {
      const existingEmail = String(profile.email).trim().toLowerCase();
      if (existingEmail === normalizedEmail) {
        return { duplicate: true, field: 'email', value: profile.email, username };
      }
    }
    
    // Check phone match (if both are provided)
    if (normalizedPhone && profile.phone) {
      const existingPhone = String(profile.phone).trim();
      if (existingPhone === normalizedPhone) {
        return { duplicate: true, field: 'phone', value: profile.phone, username };
      }
    }
  }
  
  return { duplicate: false };
}

// POST /api/users/patients (nurse or doctor creates patient)
router.post('/patients', (req, res) => {
  const { username: userUsername, role } = getClientUser(req);
  const { username, password, fullName, email, phone } = req.body || {};
  if (!userUsername || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse' && role !== 'doctor') return res.status(403).json({ error: 'Only nurses or doctors can create patient accounts' });
  
  const cleanUsername = String(username || '').trim();
  const cleanPassword = String(password || '').trim();
  const cleanFullName = String(fullName || '').trim();
  const cleanEmail = String(email || '').trim();
  const cleanPhone = String(phone || '').trim();
  
  if (!cleanUsername || !cleanPassword) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(cleanUsername)) {
    return res.status(400).json({ error: 'Username must be 3-32 chars: letters, numbers, _ . -' });
  }
  if (cleanPassword.length < 6 || cleanPassword.length > 72) {
    return res.status(400).json({ error: 'Password must be 6-72 characters long' });
  }
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(cleanUsername);
  if (exists) return res.status(409).json({ error: 'User already exists' });
  
  // Check for duplicate patient data
  if (cleanFullName || cleanEmail || cleanPhone) {
    const duplicateCheck = checkDuplicatePatient(cleanFullName, cleanEmail, cleanPhone);
    if (duplicateCheck.duplicate) {
      const fieldName = duplicateCheck.field === 'fullName' ? 'Full name' : 
                       duplicateCheck.field === 'email' ? 'Email' : 'Phone number';
      return res.status(409).json({ 
        error: `Patient with this ${fieldName.toLowerCase()} already exists`,
        duplicateField: duplicateCheck.field,
        duplicateValue: duplicateCheck.value,
        existingUsername: duplicateCheck.username
      });
    }
  }
  
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(cleanUsername, cleanPassword, 'patient');
  // Ensure patient profile row exists
  db.prepare('INSERT OR IGNORE INTO patient_profiles (username) VALUES (?)').run(cleanUsername);
  return res.status(201).json({ username: cleanUsername, role: 'patient' });
});

// POST /api/users (admin, nurse, or doctor can create users)
router.post('/', (req, res) => {
  const { role } = getClientUser(req);
  const { username, password, newRole } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  
  // Role-based permissions for user creation
  if (role === 'doctor') {
    // Doctors can only create other doctor accounts
    if (newRole !== 'doctor') {
      return res.status(403).json({ error: 'Doctors can only create doctor accounts' });
    }
  } else if (role === 'nurse') {
    // Nurses can create doctor or nurse accounts
    if (!['doctor', 'nurse'].includes(newRole)) {
      return res.status(403).json({ error: 'Nurses can only create doctor or nurse accounts' });
    }
  } else if (role === 'admin') {
    // Admins can create any role
    if (!['doctor', 'nurse'].includes(newRole)) {
      return res.status(400).json({ error: 'Invalid role' });
    }
  } else {
    return res.status(403).json({ error: 'Only admins, nurses, or doctors can create users' });
  }
  
  if (!username || !password || !newRole) return res.status(400).json({ error: 'username, password, newRole required' });
  const exists2 = db.prepare('SELECT 1 FROM users WHERE username = ?').get(username);
  if (exists2) return res.status(409).json({ error: 'User already exists' });
  db.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)').run(username, password, newRole);
  return res.status(201).json({ username, role: newRole });
});

// GET /api/users (admin)
router.get('/', (req, res) => {
  const { role } = getClientUser(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'admin') return res.status(403).json({ error: 'Only admins can list users' });
  const list = db.prepare('SELECT username, role FROM users ORDER BY username ASC').all();
  return res.json(list);
});

// PUT /api/users/:username/role (admin)
router.put('/:username/role', (req, res) => {
  const { role } = getClientUser(req);
  const { username } = req.params;
  const { newRole } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'admin') return res.status(403).json({ error: 'Only admins can update roles' });
  const user = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
  if (!user) return res.status(404).json({ error: 'User not found' });
  if (!['doctor', 'nurse'].includes(newRole)) return res.status(400).json({ error: 'Invalid role' });
  db.prepare('UPDATE users SET role = ? WHERE username = ?').run(newRole, username);
  return res.json({ username, role: newRole });
});

module.exports = router;


