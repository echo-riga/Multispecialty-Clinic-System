const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const dataDb = require('./data/db');

// Initialize database first
dataDb.initDb();

// Create a test doctor account
const username = 'irish';
const password = 'password123';
const fullName = 'Dr. Irish Dizon';
const abbreviations = 'M.D.';
const licenseNumber = 'MED-000123';

function createDoctor(database, label = 'primary database') {
  console.log(`\nUsing ${label}...`);
  try {
    const existing = database.prepare('SELECT username FROM users WHERE username = ?').get(username);
    if (existing) {
      console.log(`Doctor account '${username}' already exists in ${label}.`);
      return;
    }

    const insertUser = database.prepare('INSERT INTO users (username, password, role) VALUES (?, ?, ?)');
    const insertProfile = database.prepare('INSERT INTO doctor_profiles (username, full_name, abbreviations, license_number) VALUES (?, ?, ?, ?)');

    const result = database.transaction(() => {
      insertUser.run(username, password, 'doctor');
      insertProfile.run(username, fullName, abbreviations, licenseNumber);
    });

    result();

    console.log(`Created doctor user account '${username}' in ${label}.`);
    console.log(`Created doctor profile for '${username}' in ${label}.`);
  } catch (error) {
    console.error(`Error creating doctor in ${label}:`, error.message);
  }
}

createDoctor(dataDb.db, 'development database');

// Also seed the packaged executable's database if it exists locally
const distDataDir = path.join(__dirname, '..', 'dist', 'data');
const distDbPath = path.join(distDataDir, 'app.db');

if (!process.pkg && fs.existsSync(distDataDir)) {
  try {
    if (!fs.existsSync(distDbPath)) {
      // Ensure directory exists and copy current DB as a starting point
      const devDbPath = path.join(require('./utils/paths').getDataDir(), 'app.db');
      if (fs.existsSync(devDbPath)) {
        fs.copyFileSync(devDbPath, distDbPath);
        console.log(`Copied development database to '${distDbPath}'.`);
      }
    }

    if (fs.existsSync(distDbPath)) {
      const packagedDb = new Database(distDbPath);
      createDoctor(packagedDb, 'dist executable database');
      packagedDb.close();
    }
  } catch (error) {
    console.error('Error updating dist database:', error.message);
  }
}

console.log('\nTest doctor account setup complete!');
console.log(`Username: ${username}`);
console.log(`Password: ${password}`);
console.log(`Full Name: ${fullName}`);
console.log(`Abbreviations: ${abbreviations}`);
console.log(`License Number: ${licenseNumber}`);
