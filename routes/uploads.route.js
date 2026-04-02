const express = require('express');
const router = express.Router();
const { upload, handleUpload, handleRemove } = require('../controller/upload.controller');

// POST /uploads - handle file upload
router.post('/uploads', upload.single('file'), handleUpload);
//delete file from cloudflare
router.delete('/remove', handleRemove);

module.exports = router;
