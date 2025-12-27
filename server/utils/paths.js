const path = require('path');
const fs = require('fs');

/**
 * Get the base directory for the application.
 * When packaged with pkg, this returns the directory where the executable is located.
 * Otherwise, returns the server directory.
 */
function getAppBaseDir() {
  // Check if running as a packaged executable
  if (process.pkg) {
    // When packaged, __dirname points to the snapshot filesystem
    // We need to get the directory where the executable is located
    return path.dirname(process.execPath);
  }
  // When running normally, go up from server directory to project root
  return path.join(__dirname, '..', '..');
}

/**
 * Get the directory for static files (client, Doc Dizon).
 * When packaged, pkg makes assets available in the snapshot filesystem.
 * We can serve them directly from there.
 */
function getStaticDir() {
  if (process.pkg) {
    // When packaged, __dirname points to server/ directory in the snapshot
    // Assets are available at the same relative paths
    // So ../client and ../Doc Dizon should work
    return path.join(__dirname, '..', '..');
  }
  // When running normally, go up from server directory to project root
  return path.join(__dirname, '..', '..');
}

/**
 * Get the directory for writable data (database, uploads).
 * This is always in a writable location, even when packaged.
 */
function getDataDir() {
  const appDir = getAppBaseDir();
  const dataDir = path.join(appDir, 'data');
  
  // Ensure data directory exists
  if (!fs.existsSync(dataDir)) {
    fs.mkdirSync(dataDir, { recursive: true });
  }
  
  return dataDir;
}

/**
 * Get the directory for uploads.
 */
function getUploadsDir() {
  const dataDir = getDataDir();
  const uploadsDir = path.join(dataDir, 'uploads');
  
  // Ensure uploads directory exists
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }
  
  return uploadsDir;
}

module.exports = {
  getAppBaseDir,
  getStaticDir,
  getDataDir,
  getUploadsDir
};

