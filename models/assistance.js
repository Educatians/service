var mongoose = require('mongoose'),
    Types = mongoose.Schema.Types;

var schema = mongoose.Schema({
	grade: { type: Types.ObjectId, ref: 'Grade', required: true },
	present: [{ type: Types.ObjectId, ref: 'User', required: true }],
	non_present: [{ type: Types.ObjectId, ref: 'User', required: true }],
	taker: { type: Types.ObjectId, ref: 'User', required: true },
	created: { type: Date, 'default' : (new Date()) }
});

var Assistance = module.exports = mongoose.model('Assistance', schema);