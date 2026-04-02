const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { uploadFile, deleteFile } = require('../utils/cloudflare');

// Multer storage config for uploads folder
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, path.join(__dirname, '../uploads'));
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ storage });

// Controller for handling upload
async function handleUpload(req, res) {
  if (!req.file) return res.status(400).json({ error: 'No file uploaded' });
  const filePath = req.file.path;
  const fileName = req.file.filename;
  const mimeType = req.file.mimetype;
  try {
    // Read file buffer
    const fileBuffer = fs.readFileSync(filePath);
    // Upload to Cloudflare
    const cloudflareUrl = await uploadFile(fileBuffer, fileName, mimeType);
    // Remove local file
    fs.unlinkSync(filePath);
    // Optionally: Remove from Cloudflare after upload (not typical, but per user request)
    await deleteFile(fileName);
    return res.json({ url: cloudflareUrl, message: 'Uploaded and deleted from Cloudflare' });
  } catch (err) {
    // Clean up local file if error
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    return res.status(500).json({ error: err.message });
  }
}

// Controller for removing a file from Cloudflare
async function handleRemove(req, res) {
  const { fileName } = req.body;
  if (!fileName) return res.status(400).json({ error: 'fileName is required' });
  try {
    await deleteFile(fileName);
    return res.json({ message: `File ${fileName} deleted from Cloudflare` });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
}

module.exports = { upload, handleUpload, handleRemove };