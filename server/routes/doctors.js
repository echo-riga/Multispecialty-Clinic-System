const express = require('express');
const router = express.Router();
const { db } = require('../data/db');
const { getClientUser } = require('../middleware/auth');
const { sanitizeString } = require('../utils/sanitize');

// GET /api/doctors
router.get('/', (req, res) => {
  const { role } = getClientUser(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse' && role !== 'doctor' && role !== 'admin') return res.status(403).json({ error: 'Forbidden' });
  const docs = db.prepare(`
    SELECT u.username AS name, dp.full_name AS fullName 
    FROM users u 
    LEFT JOIN doctor_profiles dp ON u.username = dp.username 
    WHERE u.role = 'doctor' 
    ORDER BY u.username ASC
  `).all();
  return res.json(docs);
});

// GET /api/doctors/me (doctor)
router.get('/me', (req, res) => {
  const { username, role } = getClientUser(req);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor') return res.status(403).json({ error: 'Forbidden' });
  const prof = db.prepare('SELECT full_name, abbreviations, license_number FROM doctor_profiles WHERE username = ?').get(username) || {};
  const fullName = sanitizeString(prof.full_name || '');
  const abbreviations = sanitizeString(prof.abbreviations || '');
  const licenseNumber = sanitizeString(prof.license_number || '');
  return res.json({ username, role: 'doctor', fullName, abbreviations, licenseNumber });
});

// PUT /api/doctors/me (doctor) - update own profile fields
router.put('/me', (req, res) => {
  const { username, role } = getClientUser(req);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor') return res.status(403).json({ error: 'Forbidden' });
  const body = req.body || {};
  const fullName = sanitizeString(body.fullName || '');
  const abbreviations = sanitizeString(body.abbreviations || '');
  const licenseNumber = sanitizeString(body.licenseNumber || '');
  if (!fullName || !abbreviations || !licenseNumber) {
    return res.status(400).json({ error: 'Full name, abbreviations, and license number are required' });
  }
  db.prepare('INSERT INTO doctor_profiles (username, full_name, abbreviations, license_number) VALUES (?, ?, ?, ?) ON CONFLICT(username) DO UPDATE SET full_name = excluded.full_name, abbreviations = excluded.abbreviations, license_number = excluded.license_number').run(username, fullName, abbreviations, licenseNumber);
  return res.json({ username, role: 'doctor', fullName, abbreviations, licenseNumber });
});

// PUT /api/doctors/me/username (doctor) - change username
router.put('/me/username', (req, res) => {
  const { username: currentUsername, role } = getClientUser(req);
  if (!currentUsername || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor') return res.status(403).json({ error: 'Forbidden' });

  const { newUsername, password } = req.body || {};
  if (!newUsername || !password) {
    return res.status(400).json({ error: 'New username and current password are required' });
  }

  const cleanNewUsername = String(newUsername || '').trim();
  if (!/^[A-Za-z0-9_.-]{3,32}$/.test(cleanNewUsername)) {
    return res.status(400).json({ error: 'Username must be 3-32 chars: letters, numbers, _ . -' });
  }

  // Verify current password
  const user = db.prepare('SELECT username, password FROM users WHERE username = ?').get(currentUsername);
  if (!user || user.password !== String(password)) {
    return res.status(401).json({ error: 'Invalid password' });
  }

  // Check if new username already exists
  const exists = db.prepare('SELECT 1 FROM users WHERE username = ?').get(cleanNewUsername);
  if (exists) {
    return res.status(409).json({ error: 'Username already exists' });
  }

  // Update username in all related tables using a transaction
  const updateUsers = db.prepare('UPDATE users SET username = ? WHERE username = ?');
  const updateProfiles = db.prepare('UPDATE doctor_profiles SET username = ? WHERE username = ?');
  const updateAppointments = db.prepare('UPDATE appointments SET doctor_name = ? WHERE doctor_name = ?');
  const updateDiagnoses = db.prepare('UPDATE diagnoses SET doctor_name = ? WHERE doctor_name = ?');
  const updateDocuments = db.prepare('UPDATE documents SET doctor_name = ? WHERE doctor_name = ?');
  const updateDocumentsUploader = db.prepare('UPDATE documents SET uploader_username = ? WHERE uploader_username = ? AND uploader_role = ?');
  const updatePatientPhysician = db.prepare('UPDATE patient_profiles SET physician = ? WHERE physician = ?');

  const updateAll = db.transaction(() => {
    updateUsers.run(cleanNewUsername, currentUsername);
    updateProfiles.run(cleanNewUsername, currentUsername);
    updateAppointments.run(cleanNewUsername, currentUsername);
    updateDiagnoses.run(cleanNewUsername, currentUsername);
    updateDocuments.run(cleanNewUsername, currentUsername);
    updateDocumentsUploader.run(cleanNewUsername, currentUsername, 'doctor');
    updatePatientPhysician.run(cleanNewUsername, currentUsername);
  });

  // Temporarily disable foreign keys to allow updating username across tables
  // even without ON UPDATE CASCADE
  // MUST be done outside the transaction in SQLite
  db.pragma('foreign_keys = OFF');

  try {
    updateAll();
    return res.json({ username: cleanNewUsername, message: 'Username updated successfully' });
  } catch (error) {
    return res.status(500).json({ error: 'Failed to update username' });
  } finally {
    // Always re-enable foreign keys
    db.pragma('foreign_keys = ON');
  }


});

// PUT /api/doctors/me/password (doctor) - change password
router.put('/me/password', (req, res) => {
  const { username, role } = getClientUser(req);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor') return res.status(403).json({ error: 'Forbidden' });

  const { currentPassword, newPassword } = req.body || {};
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: 'Current password and new password are required' });
  }

  // Validate new password
  const cleanNewPassword = String(newPassword || '').trim();
  if (cleanNewPassword.length < 6 || cleanNewPassword.length > 72) {
    return res.status(400).json({ error: 'Password must be 6-72 characters long' });
  }

  // Verify current password
  const user = db.prepare('SELECT username, password FROM users WHERE username = ?').get(username);
  if (!user || user.password !== String(currentPassword)) {
    return res.status(401).json({ error: 'Invalid current password' });
  }

  // Update password
  db.prepare('UPDATE users SET password = ? WHERE username = ?').run(cleanNewPassword, username);
  return res.json({ message: 'Password updated successfully' });
});

module.exports = router;
