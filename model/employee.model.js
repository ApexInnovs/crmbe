const mongoose = require('mongoose');

const EmployeeSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	avatar: {
		type: String,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true,
	},
	phone: {
		type: String,
		trim: true,
	},
	role: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Role',
		required: true,
	},
	company: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Company',
		required: true,
	},
	credentialId: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Credential',
		required: true,
	},
	status: {
		type: Number,
		default: 1, // 1-active, 0-inactive
	},
	jwtToken: {
		type: String,
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('Employee', EmployeeSchema);
