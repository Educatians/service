var mongoose = require('mongoose'),
    Types = mongoose.Schema.Types;

var schema = new mongoose.Schema({
    title: { type: String, required: true, label: 'Title'},
    email: { type: String, required: true, label: ''},
    mail_sent: {
        title: { type: String, require: true, label: 'title'},
        text: { type: Types.Html, label: 'text'}
    }
});

var config = module.exports = mongoose.model('Config', schema);
config.single = true;
config.label = 'Config';