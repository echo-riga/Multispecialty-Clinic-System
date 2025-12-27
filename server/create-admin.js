const { db } = require('./data/db');

// Create admin user if it doesn't exist
try {
    const existingAdmin = db.prepare("SELECT username FROM users WHERE role = 'admin'").get();

    if (existingAdmin) {
        console.log('Admin user already exists:', existingAdmin.username);
    } else {
        // Create a super admin user
        db.prepare("INSERT INTO users (username, password, role) VALUES (?, ?, ?)").run('superadmin', 'admin123', 'admin');
        console.log('Created super admin user:');
        console.log('  Username: superadmin');
        console.log('  Password: admin123');
        console.log('  Role: admin');
    }

    // List all admin users
    const admins = db.prepare("SELECT username, role FROM users WHERE role = 'admin'").all();
    console.log('\nAll admin users:', admins);
} catch (err) {
    console.error('Error:', err);
}
