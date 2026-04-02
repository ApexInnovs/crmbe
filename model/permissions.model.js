const mongoose = require('mongoose');

const PermissionSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	meta: {
		type: String,
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

module.exports = mongoose.model('Permission', PermissionSchema);
