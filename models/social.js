var mongoose = require('mongoose'),
    Types = mongoose.Schema.Types;

var schema = mongoose.Schema({
	name: { type: String, required: true },
	grade: { type: Types.ObjectId, ref: 'Grade', required: false },
	text: { type: String, required: true },
	creator: { type: Types.ObjectId, ref: 'User', required: true },
	mentions: [{ type: Types.ObjectId, ref: 'User', required: false }],
	attachments: { type: Array, required: false, default: [] },
	type: { type: String, enum: ['Information', 'Notification', 'Task'], required: false, default: 'Information' },
	created: { type: Date, 'default' : (new Date()) }
});

var Social = module.exports = mongoose.model('Social', schema);