const { db } = require('./data/db');

// Delete the temporary doctor account
const username = 'doctor1';

try {
  // Check if user exists
  const existing = db.prepare('SELECT username FROM users WHERE username = ?').get(username);
  if (!existing) {
    console.log(`Doctor account '${username}' does not exist.`);
    return;
  }

  // Delete doctor profile first (if exists)
  const profileDeleted = db.prepare('DELETE FROM doctor_profiles WHERE username = ?').run(username);
  if (profileDeleted.changes > 0) {
    console.log(`Deleted doctor profile for ${username}`);
  }

  // Delete user account
  const userDeleted = db.prepare('DELETE FROM users WHERE username = ?').run(username);
  if (userDeleted.changes > 0) {
    console.log(`Deleted doctor account: ${username}`);
  }

  console.log('Doctor account deletion complete!');
} catch (error) {
  console.error('Error deleting doctor account:', error.message);
}
