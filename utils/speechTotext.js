
// Speech-to-text and sales call rating utility using Sarvam AI
const { SarvamAIClient } = require('sarvamai');
const fs = require('fs');
const logger = require('./logger');

const client = new SarvamAIClient({
	apiSubscriptionKey: process.env.SARVAM_API_KEY
});

// Highly optimized, token-saving rubric for sales call evaluation
// Each point is simple, direct, and covers a key sales call aspect
const rubric = [
	{ key: /\b(hello|hi|good (morning|afternoon|evening))\b/i, points: 2, label: 'Greeting' },
	{ key: /\b(product|service|offer|solution)\b/i, points: 2, label: 'Product Mention' },
	{ key: /\b(price|cost|discount|deal)\b/i, points: 1, label: 'Pricing Discussion' },
	{ key: /\b(thank you|thanks)\b/i, points: 1, label: 'Politeness' },
	{ key: /\b(question|any questions|let me know|feel free)\b/i, points: 1, label: 'Invitation to Ask' },
	{ key: /\b(purchase|sign up|order|closing)\b/i, points: 2, label: 'Closing' },
	{ key: /\b(help|assist|support)\b/i, points: 1, label: 'Helpfulness' },
];

/**
 * Transcribe a sales call audio file and rate it.
 * @param {string|Buffer|fs.ReadStream} file - Path or stream of the audio file.
 * @returns {Promise<{ text: string, rating: number, rubricBreakdown: object }>} 
 */
async function speechToTextAndRate(file) {
	let audioStream;
	if (typeof file === 'string') {
		if (file.startsWith('http://') || file.startsWith('https://')) {
			// Get signed URL from backend, then stream audio
			const axios = require('axios');
			// Stream audio from signed URL
			const response = await axios({
				method: 'get',
				url: file,
				responseType: 'stream',
			});
			audioStream = response.data;
		} else {
			// Local file path
			audioStream = fs.createReadStream(file);
		}
	} else {
		audioStream = file;
	}
	try {
		console.log("hii")
		// Use only the minimal mode for token efficiency
		const response = await client.speechToText.transcribe({
			file: audioStream,
			model: 'saaras:v3',
			mode: 'transcribe', // minimal, no translation or extra output
		});
		const text = response?.transcript || '';
		// Evaluate text against rubric (all local, no extra API calls)
		let score = 0;
		const breakdown = {};
		for (const item of rubric) {
			const matched = item.key.test(text);
			if (matched) score += item.points;
			breakdown[item.label] = matched;
		}
		// Clamp score to 1-10 (never 0 for a real call)
		const rating = Math.max(1, Math.min(10, score));
		return { text, rating};
	} catch (err) {
		logger.error('Speech-to-text or rating failed: ' + err.message);
		throw err;
	}
}

module.exports = { speechToTextAndRate };
