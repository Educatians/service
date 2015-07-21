var mongoose = require('mongoose'),
    Types = mongoose.Schema.Types,
    crypto = require('crypto');

var schema = mongoose.Schema({
	firstname : { type: String, required: true },
	lastname : { type: String, required: true },
	avatar : { type: String, required: false },
	email : { type: String, required: true },
	password: { type: String, required: true },
	born_date: { type: Date, required: false },
	type: { type: String, required: true, enum: ['admin', 'teacher', 'user', 'administrative'], default: 'admin'},
	created: { type: Date, 'default' : (new Date()) }
});

var hashPass = function(password) {
	return crypto.createHmac('sha1', salt).update(password).digest('hex');
};

schema.pre('save', function (next) {
  // do stuff
  if(this.password == '') next();
  if( this.isModified('password') ) {
  	var hashed = hashPass(this.password);

  	this.password = hashed;
  }

  next();
});

schema.static('auth', function(username, password, callback) {
	this.findOne({ email: username }, function( err, doc ) {
		if( err || doc == null || !doc ) {
			callback(false);
		} else {
			if( doc.password == hashPass( password ) ) {
				callback(doc);
			} else {
				callback(false);
			}
		}
	});
});

var user = module.exports = mongoose.model('User', schema);