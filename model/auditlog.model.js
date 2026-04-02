const mongoose = require('mongoose');

const AuditLogSchema = new mongoose.Schema({
	action: {
		type: String,
		required: true,
	},
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
		required: true,
	},
	entity: {
		type: String,
		required: true,
	},
	entityId: {
		type: mongoose.Schema.Types.ObjectId,
		required: false,
	},
	changes: {
		type: Object,
		required: false,
	},
	ip: {
		type: String,
		required: false,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('AuditLog', AuditLogSchema);
