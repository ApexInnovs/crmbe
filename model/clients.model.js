const mongoose = require('mongoose');

const DocumentSchema = new mongoose.Schema({
	title: {
		type: String,
		required: true,
		trim: true,
	},
	type: {
		type: String,
		enum: ['Contract', 'Invoice', 'Requirement', 'Other'],
		default: 'Other',
	},
	fileUrl: {
		type: String,
		required: true,
		description: 'URL or file path to the uploaded document',
	},
	uploadedAt: {
		type: Date,
		default: Date.now,
	},
});

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
		required: true,
	},
	company: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Company',
		required: true,
	},
	managedBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
	},
	projectDetails: {
		type: ProjectSchema,
		default: () => ({}),
	},
	documents: {
		type: [DocumentSchema],
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
