const cron = require('node-cron');

// Schedule a cron job to run every 3 minutes
cron.schedule('*/4 * * * *', () => {
	// Simulate API call
	console.log('haan meri jaan');
	// Here you can add your API call logic if needed
});

// Keep the process alive if running standalone
if (require.main === module) {
	console.log('Cron job started: runs every 3 minutes.');
}
