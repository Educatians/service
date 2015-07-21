var mongoose = require('mongoose'),
	moment = require('moment'),
	_ = require('underscore'),
    Types = mongoose.Schema.Types;

var schema = mongoose.Schema({
	name: { type: String, required: true },
	start_date: { type: Date, required: true },
	end_date: { type: Date, required: true },
	teacher: [{ type: Types.ObjectId, ref: 'User', required: true }],
	users: [{ type: Types.ObjectId, ref: 'User', required: true }],
	schedule: [{ type: Types.Mixed, required: false }], // [{ day: Number, startTime: Time, endTime: Time, each: (7, 15, 30)  }]
	calendar: [{ type: Types.Mixed, required: false }],
	max_faults: { type: Number },
	created: { type: Date, 'default' : (new Date()) }
});

schema.pre('save', function (next) {
  // do stuff
  this.calendar = [];

  // { title: '', start: Date, end: Date }
  if( this.schedule == undefined ) {
  	this.schedule = [{day: 4, startTime: '17:00', endTime: '18:00', each: 7}, {day: 1, startTime: '17:00', endTime: '18:00', each: 7}];
  }

  var schedule = _.sortBy(this.schedule, function(obj) { return obj.day; });

  if( moment( this.start_date ).weekday() > schedule[0].day ) {
  	return next(new Error('Start date and initial date must be the same.'));
  }

  var mstartdate = moment(this.start_date);

  console.info(mstartdate.toDate());
  
  var weeks = ( moment(this.end_date).subtract( this.start_date ) ).weeks();

  var calendar = [];
  for( var i in schedule ) {
  	var cs = schedule[i];

  	var st = cs.startTime.split(':');
  	var et = cs.endTime.split(':');

  	var startdate = mstartdate.clone().weekday(cs.day).hour(st[0]).minute(st[1]).second(0);

  	for( var w = 0 ; w < weeks ; w++ ) {
  		var cdate = startdate.clone().add('weeks', w );

  		var etime = cdate.clone().hour(et[0]).minute(et[1]).second(0);
  		
  		calendar.push({
  			title: this.name,
  			start: cdate.format('YYYY-MM-DDTHH:mm:ss') + 'Z',
  			end: etime.format('YYYY-MM-DDTHH:mm:ss') + 'Z',
  		});
  	}
  }

  this.calendar = calendar;

  next();
});

var grade = module.exports = mongoose.model('Grade', schema);