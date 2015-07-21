var mongoose = require('mongoose'),
    Types = mongoose.Schema.Types;

var schema = mongoose.Schema({
	name: { type: String, required: true },
	text: { type: String, required: true },
	sender: { type: Types.ObjectId, ref: 'User', required: true },
	receiver: [{ type: Types.ObjectId, ref: 'User', required: true }],
	read: [{ type: Types.ObjectId, ref: 'User', required: false }],
	created: { type: Date, 'default' : (new Date()) }
});

var Message = module.exports = mongoose.model('Message', schema);