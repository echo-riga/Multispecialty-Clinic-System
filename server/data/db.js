const fs = require('fs');
const path = require('path');

// Try to load better-sqlite3 with better error handling
let Database;
try {
  Database = require('better-sqlite3');
} catch (e) {
  console.error('Failed to load better-sqlite3:', e.message);
  console.error('Stack:', e.stack);
  throw new Error('Database module (better-sqlite3) could not be loaded. This may be a packaging issue.');
}

const { getDataDir } = require('../utils/paths');

// Database file path - use writable directory
const DATA_DIR = getDataDir();
const DB_FILE = path.join(DATA_DIR, 'app.db');

let db;

function openDb() {
  if (db) return db;
  try {
    // Ensure data directory exists
    if (!fs.existsSync(DATA_DIR)) {
      fs.mkdirSync(DATA_DIR, { recursive: true });
    }
    console.log('Opening database at:', DB_FILE);
    db = new Database(DB_FILE);
    db.pragma('journal_mode = WAL');
    db.pragma('foreign_keys = ON');
    console.log('Database opened successfully');
    return db;
  } catch (e) {
    console.error('Failed to open database:', e.message);
    console.error('Database path:', DB_FILE);
    console.error('Data directory:', DATA_DIR);
    console.error('Stack:', e.stack);
    throw e;
  }
}

function initDb() {
  const db = openDb();
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      username TEXT PRIMARY KEY,
      password TEXT NOT NULL,
      role     TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS patient_profiles (
      username       TEXT PRIMARY KEY,
      full_name      TEXT,
      email          TEXT,
      phone          TEXT,
      address        TEXT,
      dob            TEXT,
      gender         TEXT,
      blood_type     TEXT,
      physician      TEXT,
      allergies_json TEXT,
      past_illnesses_json TEXT,
      surgery_history_json TEXT
    );

    CREATE TABLE IF NOT EXISTS appointments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name TEXT NOT NULL,
      doctor_name  TEXT,
      time         TEXT NOT NULL,
      status       TEXT NOT NULL,
      reason       TEXT,
      chief_complaint TEXT,
      cancel_reason   TEXT,
      decline_reason  TEXT
    );

    CREATE INDEX IF NOT EXISTS idx_appt_patient ON appointments(patient_name);
    CREATE INDEX IF NOT EXISTS idx_appt_doctor ON appointments(doctor_name);
    CREATE INDEX IF NOT EXISTS idx_appt_time ON appointments(time);

    CREATE TABLE IF NOT EXISTS diagnoses (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL,
      patient_name   TEXT NOT NULL,
      doctor_name    TEXT NOT NULL,
      diagnoses_json TEXT,
      diagnosis      TEXT,
      text           TEXT,
      notes          TEXT,
      recommendations TEXT,
      created_at     TEXT NOT NULL,
      FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS documents (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      patient_name     TEXT NOT NULL,
      doctor_name      TEXT,
      uploader_username TEXT NOT NULL,
      uploader_role     TEXT NOT NULL,
      original_name     TEXT NOT NULL,
      stored_name       TEXT NOT NULL,
      size              INTEGER,
      mime_type         TEXT,
      path              TEXT,
      uploaded_at       TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS system_settings (
      key   TEXT PRIMARY KEY,
      value TEXT
    );

    CREATE TABLE IF NOT EXISTS doctor_profiles (
      username       TEXT PRIMARY KEY,
      full_name      TEXT,
      abbreviations  TEXT,
      license_number TEXT,
      FOREIGN KEY(username) REFERENCES users(username) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS appointment_vitals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      appointment_id INTEGER NOT NULL UNIQUE,
      bp TEXT,
      hr TEXT,
      rr TEXT,
      temp TEXT,
      height_cm TEXT,
      weight_kg TEXT,
      bmi TEXT,
      bmi_category TEXT,
      physical_exam TEXT,
      recorded_by TEXT,
      recorded_at TEXT NOT NULL,
      FOREIGN KEY(appointment_id) REFERENCES appointments(id) ON DELETE CASCADE
    );
  `);

  // If an older DB has a foreign key on patient_profiles.username, rebuild without FK
  try {
    const fkList = db.prepare("PRAGMA foreign_key_list('patient_profiles')").all();
    if (Array.isArray(fkList) && fkList.length > 0) {
      db.transaction(() => {
        db.exec(`
          CREATE TABLE IF NOT EXISTS __patient_profiles_new (
            username       TEXT PRIMARY KEY,
            full_name      TEXT,
            email          TEXT,
            phone          TEXT,
            address        TEXT,
            dob            TEXT,
            gender         TEXT,
            blood_type     TEXT,
            physician      TEXT,
            allergies_json TEXT,
            past_illnesses_json TEXT,
            surgery_history_json TEXT
          );
          INSERT INTO __patient_profiles_new (
            username, full_name, email, phone, address, dob, gender, blood_type, physician, allergies_json, past_illnesses_json, surgery_history_json
          )
          SELECT username, full_name, email, phone, address, dob, gender, blood_type, physician, allergies_json, past_illnesses_json, surgery_history_json
          FROM patient_profiles;
          DROP TABLE patient_profiles;
          ALTER TABLE __patient_profiles_new RENAME TO patient_profiles;
        `);
      })();
    }
  } catch (_) { }

  // Add full_name column to doctor_profiles if it doesn't exist
  try {
    const columns = db.prepare("PRAGMA table_info(doctor_profiles)").all();
    const hasFullName = columns.some(col => col.name === 'full_name');
    if (!hasFullName) {
      db.exec('ALTER TABLE doctor_profiles ADD COLUMN full_name TEXT');
    }
  } catch (_) { }

  // Add recommendations column to diagnoses if it doesn't exist
  try {
    const diagColumns = db.prepare("PRAGMA table_info(diagnoses)").all();
    const hasRecommendations = diagColumns.some(col => col.name === 'recommendations');
    if (!hasRecommendations) {
      db.exec('ALTER TABLE diagnoses ADD COLUMN recommendations TEXT');
    }
  } catch (_) { }

  // Create admin user if it doesn't exist
  try {
    const existingAdmin = db.prepare("SELECT username FROM users WHERE role = 'admin'").get();
    if (!existingAdmin) {
      console.log('No admin found, creating default superadmin...');
      db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('superadmin', 'admin123', 'admin');
      console.log('Created super admin user: superadmin');
    }
  } catch (err) {
    console.error('Failed to check/create admin user:', err);
  }
}

function toJson(value) {
  try { return JSON.stringify(value ?? []); } catch (_) { return '[]'; }
}

function seedFromStore(store) {
  const db = openDb();
  const getCount = (table) => db.prepare(`SELECT COUNT(1) AS c FROM ${table}`).get().c;

  // Seed users
  if (getCount('users') === 0) {
    const insertUser = db.prepare('INSERT OR IGNORE INTO users (username, password, role) VALUES (?, ?, ?)');
    const userEntries = Object.entries(store.users || {});
    const insertMany = db.transaction((rows) => {
      for (const [username, info] of rows) {
        insertUser.run(username, String(info.password || ''), String(info.role || 'patient'));
      }
    });
    insertMany(userEntries);
  }

  // Seed patient profiles
  if (getCount('patient_profiles') === 0) {
    const insertProf = db.prepare(`
      INSERT OR IGNORE INTO patient_profiles (
        username, full_name, email, phone, address, dob, gender, blood_type, physician,
        allergies_json, past_illnesses_json, surgery_history_json
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const entries = Object.entries(store.patientProfiles || {});
    const insertMany = db.transaction((rows) => {
      for (const [username, p] of rows) {
        insertProf.run(
          username,
          String(p.fullName || p.name || ''),
          String(p.email || ''),
          String(p.phone || ''),
          String(p.address || p.location || ''),
          String(p.dob || p.birthDate || ''),
          String(p.gender || ''),
          String(p.bloodType || p.blood || ''),
          String(p.physician || ''),
          toJson(Array.isArray(p.allergies) ? p.allergies : []),
          toJson(Array.isArray(p.pastIllnesses) ? p.pastIllnesses : []),
          toJson(Array.isArray(p.surgeryHistory) ? p.surgeryHistory : [])
        );
      }
    });
    insertMany(entries);
  }

  // Seed appointments
  if (getCount('appointments') === 0 && Array.isArray(store.appointments)) {
    const insertAppt = db.prepare(`
      INSERT INTO appointments (id, patient_name, doctor_name, time, status, reason, chief_complaint)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rows) => {
      for (const a of rows) {
        insertAppt.run(
          Number(a.id),
          String(a.patientName || ''),
          String(a.doctorName || ''),
          String(a.time || ''),
          String(a.status || 'scheduled'),
          String(a.reason || ''),
          String(a.chiefComplaint || '')
        );
      }
    });
    insertMany(store.appointments || []);
  }

  // Seed diagnoses
  if (getCount('diagnoses') === 0 && Array.isArray(store.diagnoses)) {
    const insertDiag = db.prepare(`
      INSERT INTO diagnoses (id, appointment_id, patient_name, doctor_name, diagnoses_json, diagnosis, text, notes, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rows) => {
      for (const d of rows) {
        insertDiag.run(
          Number(d.id),
          Number(d.appointmentId),
          String(d.patientName || ''),
          String(d.doctorName || ''),
          toJson(Array.isArray(d.diagnoses) ? d.diagnoses : []),
          String(d.diagnosis || d.text || ''),
          String(d.text || d.diagnosis || ''),
          String(d.notes || ''),
          String(d.createdAt || new Date().toISOString())
        );
      }
    });
    insertMany(store.diagnoses || []);
  }

  // Seed documents
  if (getCount('documents') === 0 && Array.isArray(store.documents)) {
    const insertDoc = db.prepare(`
      INSERT INTO documents (
        id, patient_name, doctor_name, uploader_username, uploader_role, original_name,
        stored_name, size, mime_type, path, uploaded_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const insertMany = db.transaction((rows) => {
      for (const doc of rows) {
        insertDoc.run(
          Number(doc.id),
          String(doc.patientName || ''),
          String(doc.doctorName || ''),
          String(doc.uploaderUsername || ''),
          String(doc.uploaderRole || ''),
          String(doc.originalName || ''),
          String(doc.storedName || ''),
          Number(doc.size || 0),
          String(doc.mimeType || ''),
          String(doc.path || ''),
          String(doc.uploadedAt || new Date().toISOString())
        );
      }
    });
    insertMany(store.documents || []);
  }

  // Seed system settings
  if (getCount('system_settings') === 0) {
    const insertSetting = db.prepare('INSERT OR REPLACE INTO system_settings (key, value) VALUES (?, ?)');
    const settings = store.systemSettings || {};
    const entries = Object.entries(settings);
    const insertMany = db.transaction((rows) => {
      for (const [k, v] of rows) {
        insertSetting.run(String(k), String(v));
      }
      // Save appointmentMinutes as a setting
      if (typeof store.appointmentMinutes !== 'undefined') {
        insertSetting.run('appointmentMinutes', String(store.appointmentMinutes));
      }
    });
    insertMany(entries);
  }
}

module.exports = {
  get db() { return openDb(); },
  initDb,
  seedFromStore
};


