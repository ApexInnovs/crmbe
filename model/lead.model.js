const mongoose = require('mongoose');


const LeadSchema = new mongoose.Schema({
	campigne: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Campigne',
		default: null,
	},
	leadData: {
		type: mongoose.Schema.Types.Mixed,
		default: {},
		description: 'Dynamic fields data captured from campaign or bulk upload',
	},
	nextMeetingDate: {
		type: Date,
		default: null,
	},
	notes: [{
		text: String,
		addedBy: {
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Employee'
		},
		addedAt: {
			type: Date,
			default: Date.now
		}
	}],
	status: {
		type: String,
		enum: [
			'created',
			'not_responsed',
			'not_intrested',
			'intrested_but_later',
			'intrested',
			'coustomer',
			'lost'
		],
		default: 'created',
		description: 'Current status of the lead. Can be marked as created, not_responsed, not_intrested, intrested_but_later, intrested, coustomer, lost.'
	},
	callRecording: {
		type: String,
		default: null,
	},
	callRecordingText: {
		type: String,
		default: null,
	},
	screenshots: {
		type: [String],
		default: [],
		description: 'Array of screenshot URLs or file paths'
	},
	company: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Company',
		required: true,
	},
	createdBy: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
	},
	assignedTo: {
		type: mongoose.Schema.Types.ObjectId,
		ref: 'Employee',
		default: null,
		description: 'Employee assigned to this lead'
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
	updatedAt: {
		type: Date,
		default: Date.now,
	}
,
// AI review and call performance analytics
ai_review: {
	type: String,
	default: null,
	description: 'AI-generated review or feedback for this lead/call.'
},
call_performance: {
	type: Number,
	 max: 10,
}
}, { timestamps: true });

module.exports = mongoose.model('Lead', LeadSchema);
