const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
	},
	description: {
		type: String,
		trim: true,
	},
	startDate: {
		type: Date,
	},
	deadline: {
		type: Date,
	},
	budget: {
		type: Number,
	},
	status: {
		type: String,
		enum: ['Not Started', 'In Progress', 'On Hold', 'Completed', 'Cancelled'],
		default: 'Not Started',
	},
});

const ClientSchema = new mongoose.Schema({
	lead_id: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Lead',
		// required: true,
	},
	name:{
		type: String,
	},
	phone:{
		type: String,
	},
	company: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Company',
		required: true,
	},
	managedBy: {
		type: String,
	},
	projects: {
		type: [ProjectSchema],
		default: [],
	},
	notes: {
		type: String,
		default: null,
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
}, { timestamps: true });

module.exports = mongoose.model('Client', ClientSchema);
