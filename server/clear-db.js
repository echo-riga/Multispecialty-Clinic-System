const fs = require('fs');
const path = require('path');

// Clear the database by deleting the database file
const DB_FILE = path.join(__dirname, 'data', 'app.db');

try {
  if (fs.existsSync(DB_FILE)) {
    fs.unlinkSync(DB_FILE);
    console.log('Database cleared successfully!');
    console.log('The database file has been deleted.');
    console.log('Restart the server to create a fresh empty database.');
  } else {
    console.log('Database file does not exist - already clear.');
  }
} catch (error) {
  console.error('Error clearing database:', error.message);
}
