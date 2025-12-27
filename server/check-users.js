const { db } = require('./data/db');
try {
  const users = db.prepare('SELECT username, password, role FROM users').all();
  console.log('Users in DB:', JSON.stringify(users, null, 2));
} catch (err) {
  console.error(err);
}
