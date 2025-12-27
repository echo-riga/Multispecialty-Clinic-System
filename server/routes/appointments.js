const express = require('express');
const router = express.Router();
const { db } = require('../data/db');
const { getClientUser } = require('../middleware/auth');
const { hasDoctorConflict, normalizeTimeStr } = require('../utils/schedule');
const { broadcastTo } = require('../services/realtime');

// GET /api/appointments
router.get('/', (req, res) => {
  const { username, role } = getClientUser(req);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role === 'patient') {
    const rows = db.prepare('SELECT * FROM appointments WHERE patient_name = ?').all(username);
    return res.json(rows.map(mapAppt));
  }
  if (role === 'doctor') {
    const rows = db.prepare('SELECT * FROM appointments WHERE doctor_name = ?').all(username);
    return res.json(rows.map(mapAppt));
  }
  const rows = db.prepare('SELECT * FROM appointments').all();
  return res.json(rows.map(mapAppt));
});

// POST /api/appointments/request (patient)
router.post('/request', (req, res) => {
  const { username, role } = getClientUser(req);
  const { time, reason, chiefComplaint } = req.body || {};
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'patient') return res.status(403).json({ error: 'Only patients can request appointments' });
  if (!time) return res.status(400).json({ error: 'time is required' });
  const t = String(time).trim();
  const valid = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(t);
  if (!valid) return res.status(400).json({ error: 'Invalid time format. Use YYYY-MM-DD HH:MM or datetime-local.' });
  const normalized = normalizeTimeStr(t);
  const cleanReason = reason != null ? String(reason).trim().slice(0, 300) : '';
  const cleanChiefComplaint = chiefComplaint != null ? String(chiefComplaint).trim().slice(0, 500) : '';

  const info = db.prepare('INSERT INTO appointments (patient_name, doctor_name, time, status, reason, chief_complaint) VALUES (?, ?, ?, ?, ?, ?)').run(
    username, '', normalized, 'pending', cleanReason, cleanChiefComplaint
  );
  const newAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);

  try {
    const nurseNames = Object.entries(store.users).filter(([, u]) => u.role === 'nurse').map(([n]) => n);
    broadcastTo(nurseNames, { type: 'appointment_request', appointment: newAppt });
  } catch (_) {}

  return res.status(201).json(newAppt);
});

// POST /api/appointments (doctor/nurse/admin creates)
router.post('/', (req, res) => {
  const { username, role } = getClientUser(req);
  const { time, doctorName, chiefComplaint } = req.body || {};
  const rawPatient = (req.body && (req.body.patientName || req.body.patientFullName)) || '';
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (!rawPatient || !time) return res.status(400).json({ error: 'patientName and time are required' });
  const inputPatient = String(rawPatient).trim();
  let resolvedPatient = inputPatient;
  const isPatientUser = db.prepare('SELECT role FROM users WHERE username = ?').get(resolvedPatient);
  if (!isPatientUser || isPatientUser.role !== 'patient') {
    // Try resolve by full name in patientProfiles (exact match), fallback to unique partial match
    const norm = String(inputPatient).replace(/\s+/g, ' ').trim().toLowerCase();
    const profs = db.prepare('SELECT username, full_name FROM patient_profiles').all();
    const exactMatches = profs.filter(p => String(p.full_name || '').replace(/\s+/g, ' ').trim().toLowerCase() === norm).map(p => p.username);
    if (exactMatches.length === 1) {
      resolvedPatient = exactMatches[0];
    } else if (exactMatches.length > 1) {
      return res.status(400).json({ error: 'Multiple patients share that full name; select a specific patient' });
    } else {
      const partialMatches = profs.filter(p => String(p.full_name || '').replace(/\s+/g, ' ').trim().toLowerCase().includes(norm)).map(p => p.username);
      if (partialMatches.length === 1) {
        resolvedPatient = partialMatches[0];
      } else if (partialMatches.length > 1) {
        return res.status(400).json({ error: 'Multiple patients match that name; select a specific patient' });
      } else {
        return res.status(400).json({ error: 'Patient does not exist' });
      }
    }
  }
  // Final existence check: allow patients that exist as users OR have a profile OR already appear in any appointment records
  const patientExists = (
    !!db.prepare('SELECT 1 FROM users WHERE username = ? AND role = ?').get(resolvedPatient, 'patient')
    || !!db.prepare('SELECT 1 FROM patient_profiles WHERE username = ?').get(resolvedPatient)
    || !!db.prepare('SELECT 1 FROM appointments WHERE patient_name = ?').get(resolvedPatient)
  );
  if (!patientExists) {
    return res.status(400).json({ error: 'Patient does not exist' });
  }
  const valid = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(String(time));
  if (!valid) return res.status(400).json({ error: 'Invalid time format. Use YYYY-MM-DD HH:MM or datetime-local.' });
  const normalized = normalizeTimeStr(time);
  let doc = '';
  if (role === 'doctor') {
    // If doctorName is provided, use it; otherwise default to logged-in doctor
    if (doctorName) {
      const isDoc = db.prepare('SELECT role FROM users WHERE username = ?').get(doctorName);
      if (!isDoc || isDoc.role !== 'doctor') {
        return res.status(400).json({ error: 'Doctor does not exist' });
      }
      doc = doctorName;
    } else {
      doc = username;
    }
  } else if (role === 'nurse' || role === 'admin') {
    if (!doctorName) return res.status(400).json({ error: 'doctorName is required' });
    const isDoc2 = db.prepare('SELECT role FROM users WHERE username = ?').get(doctorName);
    if (!isDoc2 || isDoc2.role !== 'doctor') return res.status(400).json({ error: 'Doctor does not exist' });
    doc = doctorName;
  } else {
    return res.status(403).json({ error: 'Forbidden' });
  }
  if (hasDoctorConflict(doc, normalized)) {
    return res.status(409).json({ error: 'Time conflict: doctor already has an appointment at this time' });
  }
  const cleanChiefComplaint = chiefComplaint != null ? String(chiefComplaint).trim().slice(0, 500) : '';
  const info = db.prepare('INSERT INTO appointments (patient_name, doctor_name, time, status, chief_complaint) VALUES (?, ?, ?, ?, ?)').run(
    resolvedPatient, doc, normalized, 'scheduled', cleanChiefComplaint
  );
  const newAppt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(mapAppt(newAppt));
});

// POST /api/appointments/:id/status (doctor)
router.post('/:id/status', (req, res) => {
  const { role } = getClientUser(req);
  const { id } = req.params;
  const { status, time } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor') return res.status(403).json({ error: 'Only doctors can update status' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (!['pending', 'scheduled', 'completed', 'cancelled', 'accepted', 'declined'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }
  let newTime = appt.time;
  if (status === 'scheduled' && typeof time === 'string' && time.trim()) {
    const t = String(time).trim();
    const valid = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(t);
    if (!valid) {
      return res.status(400).json({ error: 'Invalid time format. Use YYYY-MM-DD HH:MM or datetime-local.' });
    }
    const normalized = normalizeTimeStr(t);
    if (hasDoctorConflict(appt.doctor_name, normalized, appt.id)) {
      return res.status(409).json({ error: 'Time conflict: you already have an appointment at this time' });
    }
    newTime = normalized;
  }
  db.prepare('UPDATE appointments SET status = ?, time = ? WHERE id = ?').run(status, newTime, id);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  return res.json(mapAppt(updated));
});

// POST /api/appointments/:id/cancel (nurse/admin)
router.post('/:id/cancel', (req, res) => {
  const { role } = getClientUser(req);
  const { id } = req.params;
  const { reason } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse' && role !== 'admin') return res.status(403).json({ error: 'Only nurses or admins can cancel' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.status === 'completed') return res.status(400).json({ error: 'Cannot cancel a completed appointment' });
  if (!reason || typeof reason !== 'string' || !reason.trim()) return res.status(400).json({ error: 'Reason is required' });
  db.prepare('UPDATE appointments SET status = ?, cancel_reason = ? WHERE id = ?').run('cancelled', String(reason).trim(), id);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  return res.json(mapAppt(updated));
});

// POST /api/appointments/:id/decline (nurse/admin)
router.post('/:id/decline', (req, res) => {
  const { role } = getClientUser(req);
  const { id } = req.params;
  const { reason } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse' && role !== 'admin') return res.status(403).json({ error: 'Only nurses or admins can decline' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.status !== 'pending') return res.status(400).json({ error: 'Can only decline pending appointments' });
  if (!reason || typeof reason !== 'string' || !reason.trim()) return res.status(400).json({ error: 'Reason is required' });
  db.prepare('UPDATE appointments SET status = ?, decline_reason = ? WHERE id = ?').run('declined', String(reason).trim(), id);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  return res.json(mapAppt(updated));
});

// PUT /api/appointments/:id/reschedule (nurse/admin)
router.put('/:id/reschedule', (req, res) => {
  const { role } = getClientUser(req);
  const { id } = req.params;
  const { time } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse' && role !== 'admin') return res.status(403).json({ error: 'Only nurses or admins can reschedule' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (!time || typeof time !== 'string' || !time.trim()) return res.status(400).json({ error: 'time is required' });
  if (appt.status === 'cancelled' || appt.status === 'declined') return res.status(400).json({ error: 'Cannot reschedule a cancelled or declined appointment' });
  const t = String(time).trim();
  const valid = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/.test(t);
  if (!valid) return res.status(400).json({ error: 'Invalid time format. Use YYYY-MM-DD HH:MM or datetime-local.' });
  const normalized = normalizeTimeStr(t);
  if (hasDoctorConflict(appt.doctor_name, normalized, appt.id)) {
    return res.status(409).json({ error: 'Time conflict: doctor already has an appointment at this time' });
  }
  db.prepare('UPDATE appointments SET time = ? WHERE id = ?').run(normalized, id);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  return res.json(mapAppt(updated));
});

// GET /api/appointments/:id/available-doctors (nurse/admin)
router.get('/:id/available-doctors', (req, res) => {
  const { role } = getClientUser(req);
  const { id } = req.params;
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse' && role !== 'admin') return res.status(403).json({ error: 'Only nurses or admins can view availability' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  const doctorUsers = db.prepare('SELECT username FROM users WHERE role = ?').all('doctor').map(r => r.username);
  const docs = doctorUsers.filter(name => !hasDoctorConflict(name, appt.time, appt.id));
  docs.sort((a, b) => a.localeCompare(b));
  return res.json(docs.map(name => ({ name })));
});

// POST /api/appointments/:id/assign (nurse/admin)
router.post('/:id/assign', (req, res) => {
  const { role } = getClientUser(req);
  const { id } = req.params;
  const { doctorName } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse' && role !== 'admin') return res.status(403).json({ error: 'Only nurses or admins can assign' });
  if (!doctorName) return res.status(400).json({ error: 'doctorName is required' });
  const isDoc = db.prepare('SELECT role FROM users WHERE username = ?').get(doctorName);
  if (!isDoc || isDoc.role !== 'doctor') return res.status(400).json({ error: 'Doctor does not exist' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.status === 'cancelled' || appt.status === 'declined') return res.status(400).json({ error: 'Cannot assign a cancelled or declined appointment' });
  if (hasDoctorConflict(doctorName, appt.time, appt.id)) {
    return res.status(409).json({ error: 'Time conflict: doctor already has an appointment at this time' });
  }
  const nextStatus = appt.status === 'pending' ? 'scheduled' : appt.status;
  db.prepare('UPDATE appointments SET doctor_name = ?, status = ? WHERE id = ?').run(doctorName, nextStatus, id);
  const updated = db.prepare('SELECT * FROM appointments WHERE id = ?').get(id);
  return res.json(mapAppt(updated));
});

function mapAppt(row) {
  if (!row) return row;
  return {
    id: row.id,
    patientName: row.patient_name,
    doctorName: row.doctor_name,
    time: row.time,
    status: row.status,
    reason: row.reason,
    chiefComplaint: row.chief_complaint,
    cancelReason: row.cancel_reason,
    declineReason: row.decline_reason
  };
}

module.exports = router;


