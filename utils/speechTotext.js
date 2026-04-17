
// Speech-to-text and sales call rating utility using Sarvam AI
const { SarvamAIClient } = require('sarvamai');
const fs = require('fs');
const logger = require('./logger');
const ffmpeg = require('fluent-ffmpeg');
const ffprobe = require('ffprobe-static');

const client = new SarvamAIClient({
	apiSubscriptionKey: process.env.SARVAM_API_KEY
});

// Highly optimized, token-saving rubric for sales call evaluation
// Each point is simple, direct, and covers a key sales call aspect
const rubric = [
	// Greeting: English, Hindi, Odia
	{ key: /\b(hello|hi|good (morning|afternoon|evening)|नमस्ते|नमस्कार|सुप्रभात|शुभ\s*संध्या|हेलो|हाय|ନମସ୍କାର|ଶୁଭ\s*ସକାଳ|ଶୁଭ\s*ସନ୍ଧ୍ୟା|ହେଲୋ|ହାଇ)\b/iu, points: 2, label: 'Greeting' },
	// Product Mention: English, Hindi, Odia
	{ key: /\b(product|service|offer|solution|उत्पाद|सेवा|ऑफर|प्रस्ताव|समाधान|ପ୍ରଡକ୍ଟ|ସେବା|ପ୍ରସ୍ତାବ|ସମାଧାନ)\b/iu, points: 2, label: 'Product Mention' },
	// Pricing Discussion: English, Hindi, Odia
	{ key: /\b(price|cost|discount|deal|मूल्य|कीमत|छूट|डील|ମୂଲ୍ୟ|ଦର|ଛୁଟ|ଡିଲ୍)\b/iu, points: 1, label: 'Pricing Discussion' },
	// Politeness: English, Hindi, Odia
	{ key: /\b(thank you|thanks|धन्यवाद|शुक्रिया|ଧନ୍ୟବାଦ|ଧନ୍ୟବାଦ୍)\b/iu, points: 1, label: 'Politeness' },
	// Invitation to Ask: English, Hindi, Odia
	{ key: /\b(question|any questions|let me know|feel free|सवाल|कोई\s*प्रश्न|पूछें|बताएं|ପ୍ରଶ୍ନ|କିଛି\s*ପ୍ରଶ୍ନ|ପଚାରନ୍ତୁ|କୁହନ୍ତୁ)\b/iu, points: 1, label: 'Invitation to Ask' },
	// Closing: English, Hindi, Odia
	{ key: /\b(purchase|sign up|order|closing|खरीदें|ऑर्डर|समाप्त|बंद|ସାଇନ୍\s*ଅପ୍|ଅର୍ଡର୍|ବନ୍ଦ|ସମାପ୍ତ|କିଣନ୍ତୁ)\b/iu, points: 2, label: 'Closing' },
	// Helpfulness: English, Hindi, Odia
	{ key: /\b(help|assist|support|मदद|सहायता|सपोर्ट|ସହଯୋଗ|ସହଯୋଗୀ|ସହଯୋଗିତା|ମଦତ୍)\b/iu, points: 1, label: 'Helpfulness' },
];

/**
 * Transcribe a sales call audio file and rate it.
 * @param {string|Buffer|fs.ReadStream} file - Path or stream of the audio file.
 * @returns {Promise<{ text: string, rating: number, rubricBreakdown: object }>} 
 */

async function getAudioDuration(filePath) {
	return new Promise((resolve, reject) => {
		ffmpeg.setFfprobePath(ffprobe.path);
		ffmpeg.ffprobe(filePath, (err, metadata) => {
			if (err) return reject(err);
			resolve(metadata.format.duration || 0);
		});
	});
}

async function speechToTextAndRate(file) {
	const os = require('os');
	const path = require('path');
	let filePath = file;
	let isUrl = false;
	let tempFilePath = null;
	if (typeof file === 'string') {
		if (file.startsWith('http://') || file.startsWith('https://')) {
			isUrl = true;
		}
	}

	let duration = 0;
	if (!isUrl) {
		// Local file: check duration
		try {
			duration = await getAudioDuration(filePath);
		} catch (e) {
			logger.error('Failed to get audio duration: ' + e.message);
		}
	} else {
		// For URLs, assume long audio (or always use batch for URLs)
		duration = 31; // force batch for URLs
	}

	let text = '';
	try {
		if (duration > 30) {
			// Use Batch API
			if (isUrl) {
				// Download remote file to temp file
				const axios = require('axios');
				const tmpDir = os.tmpdir();
				const ext = path.extname(filePath) || '.audio';
				tempFilePath = path.join(tmpDir, 'sarvam_' + Date.now() + ext);
				const writer = fs.createWriteStream(tempFilePath);
				const response = await axios({
					method: 'get',
					url: filePath,
					responseType: 'stream',
				});
				await new Promise((resolve, reject) => {
					response.data.pipe(writer);
					writer.on('finish', resolve);
					writer.on('error', reject);
				});
				filePath = tempFilePath;
			}
			const job = await client.speechToTextJob.createJob({
				model: 'saaras:v3',
				mode: 'transcribe'
			});
			await job.uploadFiles([filePath]);
			await job.start();
			await job.waitUntilComplete();
			const fileResults = await job.getFileResults();
			console.log("the file results are ",fileResults);
			if (fileResults.successful && fileResults.successful.length > 0) {
				// Download output to uploads directory
				const uploadsDir = path.resolve(__dirname, '../uploads');
				if (!fs.existsSync(uploadsDir)) {
					fs.mkdirSync(uploadsDir, { recursive: true });
				}
				await job.downloadOutputs(uploadsDir);
				// Find the correct .json file in uploadsDir
				let foundFile = null;
				const fileName = fileResults.successful[0].file_name;
				// Look for a .json file that starts with the audio file name (without extension)
				const baseName = path.parse(fileName).name;
				const files = fs.readdirSync(uploadsDir);
				for (const f of files) {
					if (f.startsWith(baseName) && f.endsWith('.json')) {
						foundFile = path.join(uploadsDir, f);
						break;
					}
				}
				if (foundFile && fs.existsSync(foundFile)) {
					try {
						const fileContent = fs.readFileSync(foundFile, 'utf-8');
						let outputData = {};
						try {
							outputData = JSON.parse(fileContent);
						} catch (jsonErr) {
							logger.error('Failed to parse batch output file as JSON: ' + jsonErr.message);
						}
						if (outputData && typeof outputData.transcript === 'string') {
							text = outputData.transcript;
						} else {
							logger.error('Transcript not found in batch output file.');
							text = '';
						}
						// Clean up the output file after reading
						try { fs.unlinkSync(foundFile); } catch (e) { /* ignore */ }
					} catch (e) {
						logger.error('Failed to read/parse batch output file: ' + e.message);
						text = '';
					}
				} else {
					logger.error('Batch output file not found in uploads: ' + (foundFile || 'unknown'));
					text = '';
				}
			} else {
				throw new Error('Batch transcription failed: ' + (fileResults.failed?.[0]?.error_message || 'Unknown error'));
			}
			// Clean up temp file if used
			if (tempFilePath) {
				try { fs.unlinkSync(tempFilePath); } catch (e) { /* ignore */ }
			}
		} else {
			// Use standard API
			let audioStream;
			if (isUrl) {
				const axios = require('axios');
				const response = await axios({
					method: 'get',
					url: filePath,
					responseType: 'stream',
				});
				audioStream = response.data;
			} else {
				audioStream = fs.createReadStream(filePath);
			}
			const response = await client.speechToText.transcribe({
				file: audioStream,
				model: 'saaras:v3',
				mode: 'transcribe',
			});
			console.log("the servam response is ",response);
			text = response?.transcript || '';
		}

		// Evaluate text against rubric (all local, no extra API calls)
		let score = 0;
		const rubricBreakdown = [];
		for (const item of rubric) {
			const matched = item.key.test(text);
			const points = matched ? item.points : 0;
			if (matched) score += item.points;
			rubricBreakdown.push({ label: item.label, matched, points });
		}
console.log("the text is ",text);
		// Clamp score to 1-10 (never 0 for a real call)
		const rating = Math.max(1, Math.min(10, score));
		return { text, rating, rubricBreakdown };
	} catch (err) {
		logger.error('Speech-to-text or rating failed: ' + err.message);
		throw err;
	}
}

module.exports = { speechToTextAndRate };
