const express = require('express');
const router = express.Router();
const { db } = require('../data/db');
const { getClientUser } = require('../middleware/auth');
const { toDateFromStr } = require('../utils/time');

// Nurse Tasks
router.get('/tasks', (req, res) => {
  const { role } = getClientUser(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse') return res.status(403).json({ error: 'Only nurses can view tasks' });
  // No persistent nurseTasks in DB; return empty list for now
  return res.json([]);
});

router.post('/tasks/:id/toggle', (req, res) => {
  const { role } = getClientUser(req);
  const { id } = req.params;
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'nurse') return res.status(403).json({ error: 'Only nurses can update tasks' });
  return res.status(404).json({ error: 'Task not found' });
});

// Diagnoses
router.get('/diagnoses', (req, res) => {
  const { username, role } = getClientUser(req);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role === 'patient') {
    const rows = db.prepare('SELECT * FROM diagnoses WHERE patient_name = ? ORDER BY created_at DESC').all(username);
    return res.json(rows.map(mapDiag));
  }
  if (role === 'doctor') {
    const rows = db.prepare('SELECT * FROM diagnoses WHERE doctor_name = ? ORDER BY created_at DESC').all(username);
    return res.json(rows.map(mapDiag));
  }
  if (role === 'admin' || role === 'nurse') {
    const rows = db.prepare('SELECT * FROM diagnoses ORDER BY created_at DESC').all();
    return res.json(rows.map(mapDiag));
  }
  return res.status(403).json({ error: 'Forbidden' });
});

router.post('/diagnoses', (req, res) => {
  const { username, role } = getClientUser(req);
  const { appointmentId } = req.body || {};
  const notes = (req.body && req.body.notes) || '';
  const recommendations = (req.body && req.body.recommendations) || '';
  const arrayInput = Array.isArray(req.body && req.body.diagnoses) ? req.body.diagnoses : null;
  const singleInput = (req.body && (req.body.diagnosis || req.body.text)) || '';
  const normalizedArray = Array.isArray(arrayInput)
    ? arrayInput.map(v => String(v || '').trim()).filter(Boolean)
    : [];
  const finalList = normalizedArray.length ? normalizedArray : (String(singleInput).trim() ? [String(singleInput).trim()] : []);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor') return res.status(403).json({ error: 'Only doctors can create diagnoses' });
  if (!appointmentId || !finalList.length) {
    return res.status(400).json({ error: 'appointmentId and at least one diagnosis is required' });
  }
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.doctor_name !== username) return res.status(403).json({ error: 'You are not assigned to this appointment' });
  const joined = finalList.join(', ');
  const now = new Date().toISOString();
  const info = db.prepare(`
    INSERT INTO diagnoses (appointment_id, patient_name, doctor_name, diagnoses_json, diagnosis, text, notes, recommendations, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(appt.id, appt.patient_name, appt.doctor_name, JSON.stringify(finalList), joined, joined, String(notes).trim(), String(recommendations).trim(), now);
  const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(info.lastInsertRowid);
  return res.status(201).json(mapDiag(row));
});

router.put('/diagnoses/:appointmentId', (req, res) => {
  const { username, role } = getClientUser(req);
  const { appointmentId } = req.params;
  const notes = (req.body && req.body.notes) || '';
  const recommendations = (req.body && req.body.recommendations) || '';
  const arrayInput = Array.isArray(req.body && req.body.diagnoses) ? req.body.diagnoses : null;
  const singleInput = (req.body && (req.body.diagnosis || req.body.text)) || '';
  const normalizedArray = Array.isArray(arrayInput)
    ? arrayInput.map(v => String(v || '').trim()).filter(Boolean)
    : [];
  const finalList = normalizedArray.length ? normalizedArray : (String(singleInput).trim() ? [String(singleInput).trim()] : []);
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor') return res.status(403).json({ error: 'Only doctors can update diagnoses' });
  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });
  if (appt.doctor_name !== username) return res.status(403).json({ error: 'You are not assigned to this appointment' });
  if (!finalList.length) return res.status(400).json({ error: 'At least one diagnosis is required' });
  const joined = finalList.join(', ');
  const existing = db.prepare('SELECT * FROM diagnoses WHERE appointment_id = ?').get(appt.id);
  if (!existing) {
    const now = new Date().toISOString();
    const info = db.prepare(`
      INSERT INTO diagnoses (appointment_id, patient_name, doctor_name, diagnoses_json, diagnosis, text, notes, recommendations, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(appt.id, appt.patient_name, appt.doctor_name, JSON.stringify(finalList), joined, joined, String(notes).trim(), String(recommendations).trim(), now);
    const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(info.lastInsertRowid);
    return res.json(mapDiag(row));
  } else {
    db.prepare('UPDATE diagnoses SET diagnoses_json = ?, diagnosis = ?, text = ?, notes = ?, recommendations = ? WHERE id = ?')
      .run(JSON.stringify(finalList), joined, joined, String(notes).trim(), String(recommendations).trim(), existing.id);
    const row = db.prepare('SELECT * FROM diagnoses WHERE id = ?').get(existing.id);
    return res.json(mapDiag(row));
  }
});

// Vitals
router.get('/vitals/:appointmentId', (req, res) => {
  const { username, role } = getClientUser(req);
  const { appointmentId } = req.params;
  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  // Allow doctors assigned to the appointment, nurses, and admins to view vitals
  if (role === 'doctor' && appt.doctor_name !== username) {
    return res.status(403).json({ error: 'You are not assigned to this appointment' });
  }
  if (role === 'patient' && appt.patient_name !== username) {
    return res.status(403).json({ error: 'This is not your appointment' });
  }

  const vitals = db.prepare('SELECT * FROM appointment_vitals WHERE appointment_id = ?').get(appointmentId);
  if (!vitals) return res.status(404).json({ error: 'Vitals not found' });

  return res.json(mapVitals(vitals));
});

router.put('/vitals/:appointmentId', (req, res) => {
  const { username, role } = getClientUser(req);
  const { appointmentId } = req.params;
  const { bp, hr, rr, temp, heightCm, weightKg, bmi, bmiCategory, physicalExam } = req.body || {};

  if (!username || !role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'doctor' && role !== 'nurse') {
    return res.status(403).json({ error: 'Only doctors and nurses can update vitals' });
  }

  const appt = db.prepare('SELECT * FROM appointments WHERE id = ?').get(appointmentId);
  if (!appt) return res.status(404).json({ error: 'Appointment not found' });

  // Only allow the assigned doctor or nurses to update vitals
  if (role === 'doctor' && appt.doctor_name !== username) {
    return res.status(403).json({ error: 'You are not assigned to this appointment' });
  }

  const now = new Date().toISOString();
  const existing = db.prepare('SELECT * FROM appointment_vitals WHERE appointment_id = ?').get(appointmentId);

  if (!existing) {
    const info = db.prepare(`
      INSERT INTO appointment_vitals (appointment_id, bp, hr, rr, temp, height_cm, weight_kg, bmi, bmi_category, physical_exam, recorded_by, recorded_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      appointmentId,
      String(bp || '').trim(),
      String(hr || '').trim(),
      String(rr || '').trim(),
      String(temp || '').trim(),
      String(heightCm || '').trim(),
      String(weightKg || '').trim(),
      String(bmi || '').trim(),
      String(bmiCategory || '').trim(),
      String(physicalExam || '').trim(),
      username,
      now
    );
    const row = db.prepare('SELECT * FROM appointment_vitals WHERE id = ?').get(info.lastInsertRowid);
    return res.status(201).json(mapVitals(row));
  } else {
    db.prepare(`
      UPDATE appointment_vitals SET bp = ?, hr = ?, rr = ?, temp = ?, height_cm = ?, weight_kg = ?, bmi = ?, bmi_category = ?, physical_exam = ?, recorded_by = ?, recorded_at = ?
      WHERE id = ?
    `).run(
      String(bp || '').trim(),
      String(hr || '').trim(),
      String(rr || '').trim(),
      String(temp || '').trim(),
      String(heightCm || '').trim(),
      String(weightKg || '').trim(),
      String(bmi || '').trim(),
      String(bmiCategory || '').trim(),
      String(physicalExam || '').trim(),
      username,
      now,
      existing.id
    );
    const row = db.prepare('SELECT * FROM appointment_vitals WHERE id = ?').get(existing.id);
    return res.json(mapVitals(row));
  }
});

function mapVitals(row) {
  if (!row) return row;
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    bp: row.bp,
    hr: row.hr,
    rr: row.rr,
    temp: row.temp,
    heightCm: row.height_cm,
    weightKg: row.weight_kg,
    bmi: row.bmi,
    bmiCategory: row.bmi_category,
    physicalExam: row.physical_exam,
    recordedBy: row.recorded_by,
    recordedAt: row.recorded_at
  };
}

// Settings (admin and doctor)
router.get('/settings/appointments', (req, res) => {
  const { role } = getClientUser(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'admin' && role !== 'doctor') return res.status(403).json({ error: 'Only admins and doctors can view settings' });
  const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('appointmentMinutes');
  const overlapMinutes = row ? Number(row.value) : 30;
  return res.json({ overlapMinutes });
});

router.post('/settings/appointments', (req, res) => {
  const { role } = getClientUser(req);
  const { overlapMinutes } = req.body || {};
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'admin' && role !== 'doctor') return res.status(403).json({ error: 'Only admins and doctors can update settings' });
  const n = Number(overlapMinutes);
  if (!Number.isInteger(n) || n < 5 || n > 240) {
    return res.status(400).json({ error: 'overlapMinutes must be an integer between 5 and 240' });
  }
  db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)').run('appointmentMinutes', String(n));
  return res.json({ overlapMinutes: n });
});

router.get('/settings/system', (req, res) => {
  const { role } = getClientUser(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'admin') return res.status(403).json({ error: 'Only admins can view settings' });
  const rows = db.prepare('SELECT key, value FROM system_settings').all();
  const obj = {};
  for (const r of rows) obj[r.key] = r.value;
  return res.json(obj);
});

router.post('/settings/system', (req, res) => {
  const { role } = getClientUser(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'admin') return res.status(403).json({ error: 'Only admins can update settings' });
  const b = req.body || {};
  const existing = db.prepare('SELECT key, value FROM system_settings').all().reduce((acc, r) => { acc[r.key] = r.value; return acc; }, {});
  const next = { ...existing };
  if (typeof b.clinicName === 'string') next.clinicName = String(b.clinicName).trim().slice(0, 120) || next.clinicName;
  if (typeof b.timezone === 'string') next.timezone = String(b.timezone).trim().slice(0, 60) || next.timezone;
  const upsert = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
  const tx = db.transaction(() => {
    for (const [k, v] of Object.entries(next)) upsert.run(String(k), String(v));
  });
  tx();
  return res.json({ ...next });
});

// Admin Stats
router.get('/stats', (req, res) => {
  const { role } = getClientUser(req);
  if (!role) return res.status(401).json({ error: 'Unauthorized' });
  if (role !== 'admin') return res.status(403).json({ error: 'Only admins can view stats' });
  const totalPatients = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'patient'").get().c;
  const totalDoctors = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'doctor'").get().c;
  const totalNurses = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'nurse'").get().c;
  const totalAdmins = db.prepare("SELECT COUNT(*) AS c FROM users WHERE role = 'admin'").get().c;

  const totalAppointments = db.prepare('SELECT COUNT(*) AS c FROM appointments').get().c;
  const pendingAppointments = db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE status = 'pending'").get().c;
  const scheduledAppointments = db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE status IN ('scheduled','accepted')").get().c;
  const completedAppointments = db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE status = 'completed'").get().c;
  const cancelledAppointments = db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE status IN ('cancelled','declined')").get().c;
  const unassignedAppointments = db.prepare('SELECT COUNT(*) AS c FROM appointments WHERE doctor_name IS NULL OR doctor_name = ""').get().c;

  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const todayPrefix = `${yyyy}-${mm}-${dd}`;
  const todayAppointments = db.prepare('SELECT COUNT(*) AS c FROM appointments WHERE time LIKE ?').get(`${todayPrefix}%`).c;
  const upcomingAppointments = db.prepare("SELECT COUNT(*) AS c FROM appointments WHERE (status IN ('scheduled','accepted','pending')) AND time > ?").get(now.toISOString().slice(0, 16)).c;

  // onlineUsers are managed in websocket service; expose count if present
  const onlineUsersCount = (global.__onlineUsersMap && typeof global.__onlineUsersMap.size === 'number') ? global.__onlineUsersMap.size : 0;
  const online = global.__onlineUsersMap ? Array.from(global.__onlineUsersMap.keys()) : [];
  const onlineDoctors = online.filter(name => store.users[name] && store.users[name].role === 'doctor').length;
  const onlineNurses = online.filter(name => store.users[name] && store.users[name].role === 'nurse').length;
  const onlinePatients = online.filter(name => store.users[name] && store.users[name].role === 'patient').length;
  const onlineAdmins = online.filter(name => store.users[name] && store.users[name].role === 'admin').length;

  const totalDocuments = db.prepare('SELECT COUNT(*) AS c FROM documents').get().c;
  const totalDiagnoses = db.prepare('SELECT COUNT(*) AS c FROM diagnoses').get().c;

  return res.json({
    totalPatients,
    totalDoctors,
    totalNurses,
    totalAdmins,
    totalAppointments,
    scheduledAppointments,
    pendingAppointments,
    completedAppointments,
    cancelledAppointments,
    unassignedAppointments,
    todayAppointments,
    upcomingAppointments,
    onlineUsers: onlineUsersCount,
    onlineDoctors,
    onlineNurses,
    onlinePatients,
    onlineAdmins,
    totalDocuments,
    totalDiagnoses
  });
});

function mapDiag(row) {
  if (!row) return row;
  return {
    id: row.id,
    appointmentId: row.appointment_id,
    patientName: row.patient_name,
    doctorName: row.doctor_name,
    diagnoses: safeParseJson(row.diagnoses_json, []),
    diagnosis: row.diagnosis,
    text: row.text,
    notes: row.notes,
    recommendations: row.recommendations || '',
    createdAt: row.created_at
  };
}

function safeParseJson(s, fallback) {
  try { return JSON.parse(s || ''); } catch (_) { return fallback; }
}

module.exports = router;


