const { db } = require('../data/db');

function doctorHasPatient(doctorName, patientName) {
  const row = db.prepare('SELECT 1 FROM appointments WHERE doctor_name = ? AND patient_name = ? LIMIT 1').get(String(doctorName || ''), String(patientName || ''));
  return !!row;
}

function nurseConnectedToPatient(patientName) {
  const row = db.prepare('SELECT 1 FROM appointments WHERE patient_name = ? LIMIT 1').get(String(patientName || ''));
  return !!row;
}

function canViewPatientProfile(requestingUsername, requestingRole, patientName) {
  if (!requestingUsername || !requestingRole) return false;
  if (requestingRole === 'patient') return requestingUsername === patientName;
  if (requestingRole === 'doctor') return true; // Allow doctors to view any patient profile
  if (requestingRole === 'nurse') return nurseConnectedToPatient(patientName);
  if (requestingRole === 'admin') return true;
  return false;
}

module.exports = {
  doctorHasPatient,
  nurseConnectedToPatient,
  canViewPatientProfile
};


