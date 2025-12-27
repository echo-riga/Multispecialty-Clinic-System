const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const { db } = require('../data/db');
const { getClientUser } = require('../middleware/auth');
const { doctorHasPatient, nurseConnectedToPatient, canViewPatientProfile } = require('../utils/permissions');
const { sanitizeString, sanitizeStringArray } = require('../utils/sanitize');
const { upload } = require('../services/upload');

// Helper function to check for duplicate patients (excluding current patient)
function checkDuplicatePatientExcluding(fullName, email, phone, excludeUsername) {
  const normalizedFullName = String(fullName || '').trim().toLowerCase();
  const normalizedEmail = String(email || '').trim().toLowerCase();
  const normalizedPhone = String(phone || '').trim();
  const rows = db.prepare('SELECT username, full_name, email, phone FROM patient_profiles').all();
  for (const row of rows) {
    const username = row.username;
    if (username === excludeUsername) continue;
    if (normalizedFullName && row.full_name) {
      const existingFullName = String(row.full_name).trim().toLowerCase();
      if (existingFullName === normalizedFullName) {
        return { duplicate: true, field: 'fullName', value: row.full_name, username };
      }
    }
    if (normalizedEmail && row.email) {
      const existingEmail = String(row.email).trim().toLowerCase();
      if (existingEmail === normalizedEmail) {
        return { duplicate: true, field: 'email', value: row.email, username };
      }
    }
    if (normalizedPhone && row.phone) {
      const existingPhone = String(row.phone).trim();
      if (existingPhone === normalizedPhone) {
        return { duplicate: true, field: 'phone', value: row.phone, username };
      }
    }
  }
  return { duplicate: false };
}

// Patient list (role-based)
router.get('/patients', (req, res) => {
  const { username, role } = getClientUser(req);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  const q = String(req.query.q || '').toLowerCase();
  const byPatient = new Map();
  if (role === 'doctor') {
    const appts = db.prepare('SELECT patient_name FROM appointments').all();
    for (const a of appts) {
      const key = a.patient_name;
      const entry = byPatient.get(key) || { name: key, totalAppointments: 0 };
      entry.totalAppointments += 1;
      byPatient.set(key, entry);
    }
    const profs = db.prepare('SELECT username FROM patient_profiles').all();
    for (const r of profs) {
      const key = r.username;
      if (!byPatient.has(key)) byPatient.set(key, { name: key, totalAppointments: 0 });
    }
  } else if (role === 'nurse') {
    const appts = db.prepare('SELECT patient_name FROM appointments').all();
    for (const a of appts) {
      const key = a.patient_name;
      const entry = byPatient.get(key) || { name: key, totalAppointments: 0 };
      entry.totalAppointments += 1;
      byPatient.set(key, entry);
    }
    const profs = db.prepare('SELECT username FROM patient_profiles').all();
    for (const r of profs) {
      const key = r.username;
      if (!byPatient.has(key)) byPatient.set(key, { name: key, totalAppointments: 0 });
    }
  } else if (role === 'patient') {
    const total = db.prepare('SELECT COUNT(*) AS c FROM appointments WHERE patient_name = ?').get(username).c;
    byPatient.set(username, { name: username, totalAppointments: total });
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
  let results = Array.from(byPatient.values());
  if (q) {
    const profMap = new Map(db.prepare('SELECT username, full_name FROM patient_profiles').all().map(r => [r.username, r.full_name || '']));
    results = results.filter(p => {
      const full = String(profMap.get(p.name) || '').toLowerCase();
      return p.name.toLowerCase().includes(q) || full.includes(q);
    });
  }
  results.sort((a, b) => a.name.localeCompare(b.name));
  return res.json(results);
});

// Get patient profile
router.get('/patients/:patientName', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  const patientExists = !!db.prepare('SELECT 1 FROM patient_profiles WHERE username = ?').get(patientName)
    || !!db.prepare('SELECT 1 FROM appointments WHERE patient_name = ? LIMIT 1').get(patientName)
    || !!db.prepare('SELECT 1 FROM users WHERE username = ? AND role = ?').get(patientName, 'patient');
  if (!patientExists) return res.status(404).json({ error: 'Patient not found' });
  // Allow nurses and doctors to view any patient profile to support onboarding without appointments
  if (role !== 'nurse' && role !== 'doctor' && !canViewPatientProfile(username, role, patientName)) {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const profile = db.prepare('SELECT * FROM patient_profiles WHERE username = ?').get(patientName) || {};
  const result = {
    username: patientName,
    fullName: sanitizeString(profile.full_name || ''),
    name: sanitizeString(profile.full_name || ''),
    email: sanitizeString(profile.email || ''),
    phone: sanitizeString(profile.phone || ''),
    address: sanitizeString(profile.address || ''),
    location: sanitizeString(profile.address || ''),
    dob: sanitizeString(profile.dob || ''),
    birthDate: sanitizeString(profile.dob || ''),
    gender: sanitizeString(profile.gender || ''),
    bloodType: sanitizeString(profile.blood_type || ''),
    blood: sanitizeString(profile.blood_type || ''),
    physician: sanitizeString(profile.physician || ''),
    allergies: safeParseJsonArray(profile.allergies_json),
    pastIllnesses: safeParseJsonArray(profile.past_illnesses_json),
    surgeryHistory: safeParseJsonArray(profile.surgery_history_json)
  };
  return res.json(result);
});

// Update patient profile
router.put('/patients/:patientName', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  const patientExists2 = !!db.prepare('SELECT 1 FROM patient_profiles WHERE username = ?').get(patientName)
    || !!db.prepare('SELECT 1 FROM appointments WHERE patient_name = ? LIMIT 1').get(patientName)
    || !!db.prepare('SELECT 1 FROM users WHERE username = ? AND role = ?').get(patientName, 'patient');
  if (!patientExists2) return res.status(404).json({ error: 'Patient not found' });
  const isSelf = role === 'patient' && username === patientName;
  const isAdmin = role === 'admin';
  // Allow nurses to update personal info for any patient (not only "connected")
  const nurseConnected = role === 'nurse' ? true : false;
  // Allow doctors to update personal info for any patient (not only "connected")
  const doctorConnected = role === 'doctor' ? true : false;
  if (!isSelf && !isAdmin && !nurseConnected && !doctorConnected) return res.status(403).json({ error: 'Forbidden' });

  const body = req.body || {};
  const existing = db.prepare('SELECT * FROM patient_profiles WHERE username = ?').get(patientName) || {};
  
  // Check for duplicate patient data (excluding current patient)
  const newFullName = body.fullName ?? body.name ?? (existing.full_name || '');
  const newEmail = body.email ?? (existing.email || '');
  const newPhone = body.phone ?? (existing.phone || '');
  
  if (newFullName || newEmail || newPhone) {
    const duplicateCheck = checkDuplicatePatientExcluding(newFullName, newEmail, newPhone, patientName);
    if (duplicateCheck.duplicate) {
      const fieldName = duplicateCheck.field === 'fullName' ? 'Full name' : 
                       duplicateCheck.field === 'email' ? 'Email' : 'Phone number';
      return res.status(409).json({ 
        error: `Another patient with this ${fieldName.toLowerCase()} already exists`,
        duplicateField: duplicateCheck.field,
        duplicateValue: duplicateCheck.value,
        existingUsername: duplicateCheck.username
      });
    }
  }
  
  let updated;
  if (isSelf || isAdmin || doctorConnected) {
    // Full edit of personal and medical fields
    updated = {
      fullName: sanitizeString(body.fullName ?? body.name ?? (existing.full_name || '')),
      email: sanitizeString(body.email ?? (existing.email || '')),
      phone: sanitizeString(body.phone ?? (existing.phone || '')),
      address: sanitizeString(body.address ?? body.location ?? (existing.address || '')),
      dob: sanitizeString(body.dob ?? body.birthDate ?? (existing.dob || '')),
      gender: sanitizeString(body.gender ?? (existing.gender || '')),
      bloodType: sanitizeString(body.bloodType ?? body.blood ?? (existing.blood_type || '')),
      physician: sanitizeString(body.physician ?? (existing.physician || '')),
      allergies: sanitizeStringArray(body.allergies ?? safeParseJsonArray(existing.allergies_json)),
      pastIllnesses: sanitizeStringArray(body.pastIllnesses ?? safeParseJsonArray(existing.past_illnesses_json)),
      surgeryHistory: sanitizeStringArray(body.surgeryHistory ?? safeParseJsonArray(existing.surgery_history_json))
    };
  } else if (nurseConnected) {
    // Nurses can edit personal (non-medical) fields for connected patients; medical arrays only via explicit fields
    updated = {
      fullName: sanitizeString(body.fullName ?? body.name ?? (existing.full_name || '')),
      email: sanitizeString(body.email ?? (existing.email || '')),
      phone: sanitizeString(body.phone ?? (existing.phone || '')),
      address: sanitizeString(body.address ?? body.location ?? (existing.address || '')),
      dob: sanitizeString(body.dob ?? body.birthDate ?? (existing.dob || '')),
      gender: sanitizeString(body.gender ?? (existing.gender || '')),
      bloodType: sanitizeString(body.bloodType ?? body.blood ?? (existing.blood_type || '')),
      physician: sanitizeString(body.physician ?? (existing.physician || '')),
      // For medical arrays, only update if provided; otherwise keep existing
      allergies: sanitizeStringArray(body.allergies ?? safeParseJsonArray(existing.allergies_json)),
      pastIllnesses: sanitizeStringArray(body.pastIllnesses ?? safeParseJsonArray(existing.past_illnesses_json)),
      surgeryHistory: sanitizeStringArray(body.surgeryHistory ?? safeParseJsonArray(existing.surgery_history_json))
    };
  } else {
    // Doctors connected to the patient: can edit only medical arrays
    updated = {
      fullName: sanitizeString(existing.full_name || ''),
      email: sanitizeString(existing.email || ''),
      phone: sanitizeString(existing.phone || ''),
      address: sanitizeString(existing.address || ''),
      dob: sanitizeString(existing.dob || ''),
      gender: sanitizeString(existing.gender || ''),
      bloodType: sanitizeString(existing.blood_type || ''),
      physician: sanitizeString(existing.physician || ''),
      allergies: sanitizeStringArray(body.allergies ?? safeParseJsonArray(existing.allergies_json)),
      pastIllnesses: sanitizeStringArray(body.pastIllnesses ?? safeParseJsonArray(existing.past_illnesses_json)),
      surgeryHistory: sanitizeStringArray(body.surgeryHistory ?? safeParseJsonArray(existing.surgery_history_json))
    };
  }
  // Persist to DB
  db.prepare('INSERT INTO patient_profiles (username) VALUES (?) ON CONFLICT(username) DO NOTHING').run(patientName);
  db.prepare(`UPDATE patient_profiles SET 
    full_name = ?, email = ?, phone = ?, address = ?, dob = ?, gender = ?, blood_type = ?, physician = ?,
    allergies_json = ?, past_illnesses_json = ?, surgery_history_json = ?
    WHERE username = ?
  `).run(
    updated.fullName, updated.email, updated.phone, updated.address, updated.dob, updated.gender, updated.bloodType, updated.physician,
    JSON.stringify(updated.allergies || []), JSON.stringify(updated.pastIllnesses || []), JSON.stringify(updated.surgeryHistory || []),
    patientName
  );

  const result = {
    username: patientName,
    fullName: updated.fullName,
    name: updated.fullName,
    email: updated.email,
    phone: updated.phone,
    address: updated.address,
    location: updated.address,
    dob: updated.dob,
    birthDate: updated.dob,
    gender: updated.gender,
    bloodType: updated.bloodType,
    blood: updated.bloodType,
    physician: updated.physician,
    allergies: Array.isArray(updated.allergies) ? updated.allergies : [],
    pastIllnesses: Array.isArray(updated.pastIllnesses) ? updated.pastIllnesses : [],
    surgeryHistory: Array.isArray(updated.surgeryHistory) ? updated.surgeryHistory : []
  };
  return res.json(result);
});

// Delete patient
router.delete('/patients/:patientName', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  
  // Only doctors and admins can delete patients
  if (role !== 'doctor' && role !== 'admin') {
    return res.status(403).json({ error: 'Only doctors and admins can delete patients' });
  }
  
  // Check if patient exists
  const patientExists = !!db.prepare('SELECT 1 FROM patient_profiles WHERE username = ?').get(patientName)
    || !!db.prepare('SELECT 1 FROM appointments WHERE patient_name = ? LIMIT 1').get(patientName)
    || !!db.prepare('SELECT 1 FROM users WHERE username = ? AND role = ?').get(patientName, 'patient');
  
  if (!patientExists) {
    return res.status(404).json({ error: 'Patient not found' });
  }
  
  try {
    // Start a transaction to ensure all deletions succeed or none do
    const deletePatient = db.transaction(() => {
      // Delete patient profile
      db.prepare('DELETE FROM patient_profiles WHERE username = ?').run(patientName);
      
      // Delete all appointments for this patient
      db.prepare('DELETE FROM appointments WHERE patient_name = ?').run(patientName);
      
      // Delete all diagnoses for this patient
      db.prepare('DELETE FROM diagnoses WHERE patient_name = ?').run(patientName);
      
      // Delete all documents for this patient
      const documents = db.prepare('SELECT * FROM documents WHERE patient_name = ?').all(patientName);
      for (const doc of documents) {
        try {
          if (doc.path && fs.existsSync(doc.path)) {
            fs.unlinkSync(doc.path);
          }
        } catch (e) {
          console.warn('Failed to delete document file:', doc.path, e);
        }
      }
      db.prepare('DELETE FROM documents WHERE patient_name = ?').run(patientName);
      
      // Delete user account
      db.prepare('DELETE FROM users WHERE username = ? AND role = ?').run(patientName, 'patient');
    });
    
    deletePatient();
    
    return res.json({ 
      success: true, 
      message: `Patient ${patientName} and all associated data have been deleted successfully` 
    });
    
  } catch (error) {
    console.error('Error deleting patient:', error);
    return res.status(500).json({ error: 'Failed to delete patient' });
  }
});

// Documents: upload
router.post('/patients/:patientName/documents', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  const patientExists3 = !!db.prepare('SELECT 1 FROM patient_profiles WHERE username = ?').get(patientName)
    || !!db.prepare('SELECT 1 FROM appointments WHERE patient_name = ? LIMIT 1').get(patientName);
  if (!patientExists3) return res.status(400).json({ error: 'Patient does not exist' });
  if (role === 'doctor') {
    // Allow doctors to upload documents for any patient
  } else if (role === 'nurse') {
    if (!nurseConnectedToPatient(patientName)) return res.status(403).json({ error: 'Forbidden' });
  } else if (role === 'patient') {
    if (username !== patientName) return res.status(403).json({ error: 'Forbidden' });
  } else if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  return upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message || 'Upload failed' });
    }
    if (!req.file) {
      return res.status(400).json({ error: 'file is required' });
    }
    const doctorName = role === 'doctor' ? username : '';
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO documents (patient_name, doctor_name, uploader_username, uploader_role, original_name, stored_name, size, mime_type, path, uploaded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(patientName, doctorName, username, role, req.file.originalname, req.file.filename, req.file.size, req.file.mimetype, req.file.path, now);
    const row = db.prepare('SELECT id, patient_name, doctor_name, uploader_username, uploader_role, original_name, stored_name, size, mime_type, uploaded_at FROM documents WHERE id = ?').get(info.lastInsertRowid);
    const safe = {
      id: row.id,
      patientName: row.patient_name,
      doctorName: row.doctor_name,
      uploaderUsername: row.uploader_username,
      uploaderRole: row.uploader_role,
      originalName: row.original_name,
      storedName: row.stored_name,
      size: row.size,
      mimeType: row.mime_type,
      uploadedAt: row.uploaded_at
    };
    return res.status(201).json(safe);
  });
});

// Documents: list
router.get('/patients/:patientName/documents', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role === 'doctor') {
    // Allow doctors to access any patient's documents
  } else if (role === 'nurse') {
    if (!nurseConnectedToPatient(patientName)) return res.status(403).json({ error: 'Forbidden' });
  } else if (role === 'patient') {
    if (username !== patientName) return res.status(403).json({ error: 'Forbidden' });
  } else if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const items = db.prepare('SELECT id, patient_name, doctor_name, uploader_username, uploader_role, original_name, stored_name, size, mime_type, uploaded_at FROM documents WHERE patient_name = ? ORDER BY uploaded_at DESC').all(patientName)
    .map(d => ({
      id: d.id,
      patientName: d.patient_name,
      doctorName: d.doctor_name,
      uploaderUsername: d.uploader_username,
      uploaderRole: d.uploader_role,
      originalName: d.original_name,
      storedName: d.stored_name,
      size: d.size,
      mimeType: d.mime_type,
      uploadedAt: d.uploaded_at
    }));
  return res.json(items);
});

// Documents: download
router.get('/patients/:patientName/documents/:id/download', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName, id } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role === 'doctor') {
    // Allow doctors to download any patient's documents
  } else if (role === 'nurse') {
    if (!nurseConnectedToPatient(patientName)) return res.status(403).json({ error: 'Forbidden' });
  } else if (role === 'patient') {
    if (username !== patientName) return res.status(403).json({ error: 'Forbidden' });
  } else if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND patient_name = ?').get(id, patientName);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  try {
    if (!fs.existsSync(doc.path)) return res.status(410).json({ error: 'File no longer exists' });
  } catch (e) {}
  return res.download(doc.path, doc.original_name);
});

// Documents: delete
router.delete('/patients/:patientName/documents/:id', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName, id } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND patient_name = ?').get(id, patientName);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (role === 'patient') {
    if (username !== patientName) return res.status(403).json({ error: 'Forbidden' });
    if (doc.uploader_username !== username || doc.uploader_role !== 'patient') {
      return res.status(403).json({ error: 'You can only delete documents you uploaded' });
    }
  } else if (role === 'doctor') {
    // Allow doctors to delete any patient's documents
  } else if (role === 'nurse') {
    if (!nurseConnectedToPatient(patientName)) return res.status(403).json({ error: 'Forbidden' });
  } else if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  try {
    if (doc.path && fs.existsSync(doc.path)) fs.unlinkSync(doc.path);
  } catch (e) {}
  db.prepare('DELETE FROM documents WHERE id = ?').run(id);
  return res.json({ ok: true });
});

// Documents: rename
router.put('/patients/:patientName/documents/:id/rename', (req, res) => {
  const { username, role } = getClientUser(req);
  const { patientName, id } = req.params;
  const newNameRaw = (req.body && (req.body.newName || req.body.originalName || req.body.name)) || '';
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  const doc = db.prepare('SELECT * FROM documents WHERE id = ? AND patient_name = ?').get(id, patientName);
  if (!doc) return res.status(404).json({ error: 'Document not found' });
  if (role === 'patient') {
    if (username !== patientName) return res.status(403).json({ error: 'Forbidden' });
    if (doc.uploader_username !== username || doc.uploader_role !== 'patient') {
      return res.status(403).json({ error: 'You can only rename documents you uploaded' });
    }
  } else if (role === 'doctor') {
    // Allow doctors to rename any patient's documents
  } else if (role === 'nurse') {
    if (!nurseConnectedToPatient(patientName)) return res.status(403).json({ error: 'Forbidden' });
  } else if (role !== 'admin') {
    return res.status(403).json({ error: 'Forbidden' });
  }
  const prevExt = path.extname(doc.original_name || '');
  let cleaned = String(newNameRaw).trim();
  if (!cleaned) return res.status(400).json({ error: 'newName is required' });
  cleaned = cleaned.replace(/[\\/]+/g, ' ')
                   .replace(/[^\w.\- ]+/g, '_')
                   .slice(0, 180);
  if (!cleaned) return res.status(400).json({ error: 'Invalid new name' });
  const newExt = path.extname(cleaned || '');
  if (prevExt && newExt && newExt.toLowerCase() !== prevExt.toLowerCase()) {
    if (role === 'patient') {
      cleaned = cleaned.slice(0, cleaned.length - newExt.length) + prevExt;
    }
  }
  if (!path.extname(cleaned) && prevExt) cleaned = cleaned + prevExt;
  db.prepare('UPDATE documents SET original_name = ? WHERE id = ?').run(cleaned, id);
  const row = db.prepare('SELECT id, patient_name, doctor_name, uploader_username, uploader_role, original_name, stored_name, size, mime_type, uploaded_at FROM documents WHERE id = ?').get(id);
  const safe = {
    id: row.id,
    patientName: row.patient_name,
    doctorName: row.doctor_name,
    uploaderUsername: row.uploader_username,
    uploaderRole: row.uploader_role,
    originalName: row.original_name,
    storedName: row.stored_name,
    size: row.size,
    mimeType: row.mime_type,
    uploadedAt: row.uploaded_at
  };
  return res.json(safe);
});

function safeParseJsonArray(s) {
  try { const v = JSON.parse(s || '[]'); return Array.isArray(v) ? v.map(x => sanitizeString(x)) : []; } catch (_) { return []; }
}

module.exports = router;


