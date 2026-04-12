
const cron = require('node-cron');
const axios = require('axios');

// Schedule a cron job to run every 5 minutes
cron.schedule('*/5 * * * *', async () => {
	try {
		const response = await axios.get('https://crmbe.onrender.com/');
	} catch (error) {
		console.error('Error calling API:', error.message);
	}
});

// Keep the process alive if running standalone
if (require.main === module) {
	console.log('Cron job started: runs every 3 minutes.');
}
