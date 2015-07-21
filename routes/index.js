var mongoose = require('mongoose'),
	crypto = require('crypto'),
	_ = require('underscore');
/*
 * GET home page.
 */

exports.index = function(req, res) {
	// En este sitio es directo el login
	if (req.user) {
		res.redirect('/dashboard');
	} else {
		res.render('index', {});
	}

	/*users.find({}, function (err, docs) {
		console.info(docs);
	});*/
};

exports.message_users = function(req, res) {
	var s = req.params.search;

	var users = mongoose.model('User');

	users.find({}, function(err, data) {
		res.json(data);
	});
};

exports.message_send = function(req, res) {
	var Message = mongoose.model('Message');

	console.info(req.body);
	var msg = new Message();
	msg.name = req.body.name;
	msg.text = req.body.text;
	msg.sender = req.session.user._id;
	msg.receiver = req.body.receiver;

	msg.save(function(err) {
		console.info(err);
		res.json({
			response: (err == undefined)
		});
	});
};

exports.message_mark = function(req, res) {
	var messages = mongoose.model('Message');

	if (req.body.read == 'on') {
		messages.findOneAndUpdate({
			_id: req.body.id
		}, {
			$addToSet: {
				read: req.session.user._id
			}
		}, function(err) {
			res.json({
				response: (err == undefined)
			});
		});
	} else {
		messages.findOneAndUpdate({
			_id: req.body.id
		}, {
			$pull: {
				read: req.session.user._id
			}
		}, function(err) {
			res.json({
				response: (err == undefined)
			});
		});
	}
};

exports.message_box = function(req, res) {
	var messages = mongoose.model('Message');

	if (req.params.type == 'received') {
		messages.find({
			receiver: {
				$in: [req.session.user._id]
			}
		}, function(err, msgs) {
			res.render('messages', {
				user: req.session.user,
				messages: msgs.reverse(),
				type: req.params.type
			});
		});
	} else {
		messages.find({
			sender: req.session.user._id
		}, function(err, msgs) {
			res.render('messages', {
				user: req.session.user,
				messages: msgs.reverse(),
				type: req.params.type
			});
		});
	}
};

exports.message_box_read = function(req, res) {
	var messages = mongoose.model('Message');

	messages.findById(req.body.id).populate({ path: 'read', select: 'firstname lastname'}).populate({ path: 'receiver', select: 'firstname lastname' }).exec( function(err, data) {
		console.info(data.read);
		console.info(data.receiver);

		var diff = _.difference(data.receiver, data.read);

		console.info(diff);

		res.json({
			read: data.read,
			no_read: _.reject( data.receiver, function(r) { return (data.read.indexOf(r) != -1 ) } )
		});
	});
};

exports.login = function(req, res) {
	var users = mongoose.model('User');

	users.auth(req.body.username, req.body.password, function(data) {
		if (data) {
			req.session.user = data;
			res.json({
				response: true,
				data: data
			});
		} else {
			res.json({
				response: false
			});
		}
	});
};

exports.dashboard = function(req, res) {
	var social = mongoose.model('Social');

	social.find({
		grade: undefined
	}).populate('creator').exec(function(err, docs) {
		res.render('dashboard', {
			user: req.session.user,
			socials: docs.reverse()
		});
	});
};

exports.calendar = function(req, res) {
	var model = mongoose.model('Grade');

	model.find({
		$or : [{ teacher: req.session.user._id }, { user: req.session.user._id }]
	}, function(err, data) {
		var calendar = [];

		for( var i in data ) {
			calendar = _.union( calendar, data[i].calendar );
		}

		res.render('calendar', {
			user: req.session.user,
			calendar: JSON.stringify(calendar)
		});
	});
};

exports.grades = function(req, res) {
	var model = mongoose.model('Grade');

	if (_.contains(['admin', 'teacher'], req.session.user.type)) {
		model.find({
			teacher: {
				$in: [req.session.user._id]
			}
		}, function(err, docs) {
			//console.info(docs);
			res.render('grades', {
				user: req.session.user,
				grades: docs
			});
		});
	} else {

	}
};

exports.grade_create = function(req, res) {
	res.render('edit_grade', {
		user: req.session.user
	});
};

exports.grade = function(req, res) {
	var id = req.params.id;

	var grades = mongoose.model('Grade'),
		social = mongoose.model('Social');

	grades.findById(id, function(err, grade) {
		social.find({
			grade: grade._id
		})
			.populate('creator')
			.exec(function(err, docs) {
			//console.info(docs);
			res.render('grade', {
				user: req.session.user,
				socials: docs.reverse(),
				grade: grade
			});
		});
	});
};

exports.grade_users = function(req, res) {
	var id = req.params.id;

	var grades = mongoose.model('Grade');

	grades.findById(id).populate('users').populate('teacher').exec(function(err, grade) {
		console.info(grade);
		res.render('grade_users', {
			user: req.session.user,
			grade: grade
		});
	});
};

exports.grade_calendar = function(req, res) {
	var id = req.params.id;

	var model = mongoose.model('Grade');

	model.findById(id, function(err, data) {
		res.render('grade_calendar', {
			user: req.session.user,
			grade: data,
			calendar: JSON.stringify(data.calendar)
		});
	});
};

exports.logout = function(req, res) {
	req.session.user = undefined;

	res.redirect('/');
};

exports.update_profile = function(req, res) {
	var model = mongoose.model('User');

	var params = req.body;
	model.findOne({
		_id: req.session.user._id
	}, function(err, user) {
		user.name.firstname = params.firstname;
		user.name.lastname = params.lastname;
		user.avatar = params.avatar;
		user.born_date = params.borndate;

		user.save(function() {
			req.session.user = user; // update data

			res.json({
				result: true
			});
		});
	});
};

exports.add_social_stream = function(req, res) {
	var model = mongoose.model('Social');

	var grd = undefined;
	if (req.body.grade != undefined && req.body.grade != "") {
		grd = req.body.grade;
	}

	var attachs = [];
	if (req.body.attachments != undefined) {
		var attachs = req.body.attachments;
	}

	var ss = new model();
	ss.name = req.body.name;
	ss.grade = grd;
	ss.attachments = attachs;
	ss.text = req.body.text;
	ss.creator = req.session.user._id;
	ss.created = new Date();

	ss.save(function() {
		res.json({
			result: true
		});
	});
};

exports.remove_social_stream = function(req, res) {
	var model = mongoose.model('Social');

	model.findById(req.params.id, function(err, data) {
		if (err) {
			res.redirect(req.query.r);
		}

		if (data.creator == req.session.user._id || req.session.user.type == 'administrative' || req.session.user.type == 'admin') {
			data.remove(function(err) {
				res.redirect(req.query.r);
			});
		} else {
			res.redirect(req.query.r);
		}
	});
};

exports.populate = function(req, res) {
	var request = require('request');

	request('http://randomuser.me/g/?results=5', function(error, response, body) {
		if (!error && response.statusCode == 200) {
			var results = JSON.parse(body).results;

			var User = mongoose.model('User');

			_.each(results, function(data) {
				var dt = data.user;

				console.info(data);

				var usr = new User();
				usr.firstname = dt.name.first;
				usr.lastname = dt.name.last;
				usr.email = dt.email;
				usr.password = dt.password;
				usr.type = 'user';

				usr.save(function() {
					console.info('Saved');
				});
			});

			res.end('Created 5 users');
		}
	})
};