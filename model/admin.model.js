const mongoose = require('mongoose');

const AdminSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	email: {
		type: String,
		required: true,
		unique: true,
		trim: true,
		lowercase: true,
	},
	role: {
		type: String,
		default: 'admin',
	},
    credentialId:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Credential',
        required: true,
    },
	status: {
		type: Number,
		default: 1, // 1-active, 0-inactive
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

module.exports = mongoose.model('Admin', AdminSchema);
