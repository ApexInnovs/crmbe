const AWS = require('aws-sdk');
const path = require('path');

// Configure AWS SDK for Cloudflare R2
const s3 = new AWS.S3({
	endpoint: process.env.CLOUDFLARE_R2_ENDPOINT, // e.g. 'https://<accountid>.r2.cloudflarestorage.com'
	accessKeyId: process.env.CLOUDFLARE_R2_ACCESS_KEY_ID,
	secretAccessKey: process.env.CLOUDFLARE_R2_SECRET_ACCESS_KEY,
	region: 'auto',
	signatureVersion: 'v4',
});

const BUCKET = process.env.CLOUDFLARE_R2_BUCKET;
// Upload file (image or audio)
async function uploadFile(fileBuffer, fileName, mimeType) {
	const ext = path.extname(fileName).toLowerCase();
	if (!['.jpg', '.jpeg', '.png', '.gif', '.webp', '.mp3', '.wav', '.ogg', '.m4a'].includes(ext)) {
		throw new Error('Unsupported file type');
	}
	const params = {
		Bucket: BUCKET,
		Key: fileName,
		Body: fileBuffer,
		ContentType: mimeType,
		ACL: 'public-read',
	};
	const data = await s3.upload(params).promise();
	console.log('File uploaded to Cloudflare R2:', data);
	return data.Location;
}

// Delete file from Cloudflare R2
async function deleteFile(fileName) {
	const params = {
		Bucket: BUCKET,
		Key: fileName,
	};
	await s3.deleteObject(params).promise();
	return true;
}

// Delete multiple files from Cloudflare R2
async function deleteFiles(fileNames) {
	if (!Array.isArray(fileNames) || fileNames.length === 0) return true;
	const objects = fileNames.map((Key) => ({ Key }));
	const params = {
		Bucket: BUCKET,
		Delete: { Objects: objects },
	};
	await s3.deleteObjects(params).promise();
	return true;
}

module.exports = {
	uploadFile,
	deleteFile,
	deleteFiles,
};
