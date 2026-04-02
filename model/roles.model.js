const mongoose = require('mongoose');

const RoleSchema = new mongoose.Schema({
	name: {
		type: String,
		required: true,
		trim: true,
		unique: true,
	},
	permissions: [
		{
			type: mongoose.Schema.Types.ObjectId,
			ref: 'Permission',
		}
	],
    status: {
        type: Number,
        default: 1, // 1-active, 0-inactive
    },
	type:{
		type: String,
		enum: ['admin', 'company'],
		deafault: 'company',
	},
	createdAt: {
		type: Date,
		default: Date.now,
	},
});

module.exports = mongoose.model('Role', RoleSchema);
