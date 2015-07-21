var mongoose = require('mongoose');
var express = require('express');
var baucis = require('../..');

var app;
var server;
var controller;
var subcontroller;

var fixture = module.exports = {
  init: function(done) {
    var Schema = mongoose.Schema;

    mongoose.connect('mongodb://localhost/xXxBaUcIsTeStXxX');

    var Vegetable = new Schema({
      name: { type: String, required: true },
      lastModified: { type: Date, required: true, default: Date.now },
      diseases: { type: [ String ], select: false },
      species: { type: String, default: 'n/a', select: false },
      related: { type: Schema.ObjectId, ref: 'vegetable' }
    });

    fixture.preCount = 0;

    Vegetable.pre('save', function (next) {
      this.set('related', this._id);
      next();
    });

    Vegetable.pre('save', function (next) {
      this.set('lastModified', new Date());
      next();
    });

    Vegetable.pre('save', function (next) {
      fixture.preCount += 1;
      next();
    });

    if (!mongoose.models['vegetable']) mongoose.model('vegetable', Vegetable);

    controller = baucis.rest({
      singular: 'vegetable',
      lastModified: 'lastModified',
      relations: true
    });

    controller.request(function (request, response, next) {
      if (request.query.block === 'true') return response.send(401);
      next();
    });

    controller.query(function (request, response, next) {
      if (request.query.testQuery !== 'true') return next();
      request.baucis.query.select('_id lastModified');
      next();
    });

    controller.documents(function (request, response, next) {
      if (request.query.testDocuments !== 'true') return next();
      var transformation = JSON.stringify(request.baucis.documents).substring(0, 6).split('');
      request.baucis.documents = transformation;
      next();
    });

    app = express();
    app.use('/api/v1', baucis({ swagger: true }));

    server = app.listen(8012);

    done();
  },
  deinit: function(done) {
    server.close();
    mongoose.disconnect();
    done();
  },
  create: function(done) {
    // clear all first
    mongoose.model('vegetable').remove({}, function (error) {
      if (error) return done(error);

      var names = ['Turnip',   'Spinach',   'Pea',
          		     'Shitake',  'Lima Bean', 'Carrot',
                   'Zucchini', 'Radicchio'];

      vegetables = names.map(function (name) { // TODO leaked global
	      return new (mongoose.model('vegetable'))({ name: name });
      });

      var numberToSave = names.length;

      vegetables.forEach(function (vege) {
      	vege.save(function (error) {
      	  numberToSave--;
      	  if (error) return done(error);
      	  if (numberToSave === 0) return done();
      	});
      });
    });
  }
};
