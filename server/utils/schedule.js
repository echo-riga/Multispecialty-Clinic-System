const { db } = require('../data/db');
const { toDateFromStr, normalizeTimeStr } = require('./time');

function getAppointmentMinutes() {
  try {
    const row = db.prepare('SELECT value FROM system_settings WHERE key = ?').get('appointmentMinutes');
    const n = row && row.value != null ? Number(row.value) : NaN;
    return Number.isFinite(n) && n > 0 ? n : 30;
  } catch (_) {
    return 30;
  }
}

function hasDoctorConflict(doctorName, timeStr, ignoreId) {
  const target = toDateFromStr(timeStr).getTime();
  const windowMs = getAppointmentMinutes() * 60 * 1000;
  const rows = db.prepare('SELECT id, time, status FROM appointments WHERE doctor_name = ?').all(String(doctorName || ''));
  for (const a of rows) {
    if (a.status === 'cancelled' || a.status === 'declined') continue;
    if (ignoreId && String(a.id) === String(ignoreId)) continue;
    const t = toDateFromStr(a.time).getTime();
    if (Math.abs(t - target) < windowMs) return true;
  }
  return false;
}

module.exports = {
  hasDoctorConflict,
  normalizeTimeStr
};


