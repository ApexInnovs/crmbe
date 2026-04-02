const mongoose = require('mongoose');

const PackageSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	price: {
		type: Number,
		required: true,
		min: 0,
	},
	offering: [
		{
			feature: { type: String, required: true, trim: true },
			enabled: { type: Boolean, required: true }
		}
	],
	totalCredits: {
		type: Number,
		required: true,
		min: 0,
	},
	status: {
		type: Number,
		default: 1, // 1-active, 0-inactive
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('Package', PackageSchema);
