const path = require('path');
const fs = require('fs');

// Ensure uploads root exists
const uploadRoot = path.join(__dirname, '..', 'uploads');
try { fs.mkdirSync(uploadRoot, { recursive: true }); } catch (_) {}

// In-memory data store shared across routes and services
const store = {
  users: {
    'bob': { password: 'doctor123', role: 'doctor' },
    'nina': { password: 'nurse123', role: 'nurse' },
    'eric': { password: 'doctor123', role: 'doctor' }
  },

  nextAppointmentId: 4,
  appointments: [
    { id: 1, patientName: 'alice', doctorName: 'bob', time: '2025-10-12 10:00', status: 'scheduled' },
    { id: 2, patientName: 'charlie', doctorName: 'bob', time: '2025-10-12 11:00', status: 'scheduled' },
    { id: 3, patientName: 'diana', doctorName: 'eric', time: '2025-10-14 09:00', status: 'scheduled' },
  ],
  
  nextDiagnosisId: 1,
  diagnoses: [],

  nextDocId: 1,
  documents: [],

  // Settings
  appointmentMinutes: 30,
  systemSettings: {
    clinicName: 'Patient Management Demo Clinic',
    timezone: 'UTC'
  },

  // Patient Profiles (in-memory)
  patientProfiles: {
    'alice': {
      fullName: 'Alice Santos',
      email: 'alice.santos@gmail.com',
      phone: '+63 917 123 4567',
      address: '123 Rizal Street, Barangay Poblacion, Quezon City, Metro Manila 1100',
      dob: '1990-03-15',
      gender: 'Female',
      bloodType: 'O+',
      physician: '',
      allergies: ['Penicillin'],
      pastIllnesses: ['Asthma'],
      surgeryHistory: ['Appendectomy (2015)']
    },
    'charlie': {
      fullName: 'Charlie Dela Cruz',
      email: 'charlie.delacruz@yahoo.com',
      phone: '+63 917 654 3210',
      address: '45 Mabini Street, Barangay San Roque, Marikina City, Metro Manila 1801',
      dob: '1988-07-22',
      gender: 'Male',
      bloodType: 'A+',
      physician: '',
      allergies: ['Seafood'],
      pastIllnesses: ['Hypertension'],
      surgeryHistory: []
    },
    'diana': {
      fullName: 'Diana Reyes',
      email: 'diana.reyes@outlook.com',
      phone: '+63 916 555 7788',
      address: '88 Bonifacio Avenue, Barangay Pag-asa, Quezon City, Metro Manila 1105',
      dob: '1993-11-05',
      gender: 'Female',
      bloodType: 'B+',
      physician: '',
      allergies: [],
      pastIllnesses: ['Migraines'],
      surgeryHistory: ['Tonsillectomy (2002)']
    }
  },

  uploadRoot
};

module.exports = store;


