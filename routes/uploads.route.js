
const express = require('express');
const router = express.Router();
const { upload, handleUpload, handleRemove } = require('../controller/upload.controller');

/**
 * @swagger
 * /uploads:
 *   post:
 *     summary: Upload a file
 *     description: Upload a file to the server and Cloudflare. The file is deleted from Cloudflare after upload.
 *     tags:
 *       - Uploads
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *     responses:
 *       200:
 *         description: File uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 url:
 *                   type: string
 *                 message:
 *                   type: string
 *       400:
 *         description: No file uploaded
 *       500:
 *         description: Server error
 */
router.post('/uploads', upload.single('file'), handleUpload);

/**
 * @swagger
 * /remove:
 *   delete:
 *     summary: Delete a file from Cloudflare
 *     description: Remove a file from Cloudflare by fileName.
 *     tags:
 *       - Uploads
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               fileName:
 *                 type: string
 *                 description: Name of the file to delete
 *     responses:
 *       200:
 *         description: File deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *       400:
 *         description: fileName is required
 *       500:
 *         description: Server error
 */
router.delete('/remove', handleRemove);

module.exports = router;
