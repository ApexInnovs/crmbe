
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
		// Use only the minimal mode for token efficiency
		const response = await client.speechToText.transcribe({
			file: audioStream,
			model: 'saaras:v3',
			mode: 'transcribe', // minimal, no translation or extra output
		});
		const text = response?.transcript || '';

		// Evaluate text against rubric (all local, no extra API calls)
		let score = 0;
		const rubricBreakdown = [];
		for (const item of rubric) {
			const matched = item.key.test(text);
			const points = matched ? item.points : 0;
			if (matched) score += item.points;
			rubricBreakdown.push({ label: item.label, matched, points });
		}

		// Clamp score to 1-10 (never 0 for a real call)
		const rating = Math.max(1, Math.min(10, score));
		return { text, rating,rubricBreakdown};
	} catch (err) {
		logger.error('Speech-to-text or rating failed: ' + err.message);
		throw err;
	}
}

module.exports = { speechToTextAndRate };
