const path = require('path');
const fs = require('fs');
const multer = require('multer');
const { getUploadsDir } = require('../utils/paths');

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const patient = (req.params && req.params.patientName) || (req.body && req.body.patientName) || 'unknown';
    const safe = String(patient).replace(/[^\w.\-]+/g, '_');
    const uploadRoot = getUploadsDir();
    const dir = path.join(uploadRoot, safe);
    try { fs.mkdirSync(dir, { recursive: true }); } catch (_) {}
    cb(null, dir);
  },
  filename: function (req, file, cb) {
    const ts = Date.now();
    const original = String(file.originalname || 'file').replace(/[^\w.\-]+/g, '_');
    cb(null, `${ts}-${original}`);
  }
});

const upload = multer({ storage, limits: { fileSize: 20 * 1024 * 1024 } });

module.exports = {
  upload
};


