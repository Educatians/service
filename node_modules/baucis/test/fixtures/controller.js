var mongoose = require('mongoose');
var express = require('express');
var baucis = require('../..');

var app;
var server;
var controller;
var subcontroller;
var cheesy;

var fixture = module.exports = {
  init: function(done) {
    var Schema = mongoose.Schema;

    mongoose.connect('mongodb://localhost/xXxBaUcIsTeStXxX');

    var Stores = new Schema({
      name: { type: String, required: true, unique: true }
    });

    var Tools = new Schema({
      name: { type: String, required: true }
    });

    var Cheese = new Schema({
      name: { type: String, required: true, unique: true },
      color: { type: String, required: true, select: false },
      molds: [ String ],
      arbitrary: [{
        goat: Boolean,
        llama: [ Number ]
      }]
    });

    if (!mongoose.models['tool']) mongoose.model('tool', Tools);
    if (!mongoose.models['store']) mongoose.model('store', Stores);
    if (!mongoose.models['cheese']) mongoose.model('cheese', Cheese);

    subcontroller = baucis.rest({
      singular: 'tool',
      basePath: '/:storeId/tools',
      publish: false
    });

    subcontroller.initialize();

    controller = baucis.rest({ singular: 'store', findBy: 'name' });

    controller.use('/binfo', function (request, response, next) {
      response.json('Poncho!');
    });

    controller.use(function (request, response, next) {
      response.set('X-Poncho', 'Poncho!');
      next();
    });

    controller.get('/info', function (request, response, next) {
      response.json('OK!');
    });

    controller.get('/:id/arbitrary', function (request, response, next) {
      response.json(request.params.id);
    });

    controller.use(subcontroller);

    cheesy = baucis.rest({
      singular: 'cheese',
      select: '-_id +color name',
      findBy: 'name',
      'allow push': 'molds arbitrary arbitrary.$.llama'
    });

    app = express();
    app.use('/api/v1', baucis());

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
    mongoose.model('store').remove({}, function (error) {
      if (error) return done(error);

      mongoose.model('tool').remove({}, function (error) {
        if (error) return done(error);

        mongoose.model('cheese').remove({}, function (error) {

          // create stores and tools
          mongoose.model('store').create(
            ['Westlake', 'Corner'].map(function (name) { return { name: name } }),
            function (error) {
              if (error) return done(error);

              var cheeses = [
                { name: 'Cheddar', color: 'Yellow' },
                { name: 'Huntsman', color: 'Yellow, Blue, White' },
                { name: 'Camembert', color: 'White',
                  arbitrary: [
                    { goat: true, llama: [ 3, 4 ] },
                    { goat: false, llama: [ 1, 2 ] }
                  ]
                }
              ];

              mongoose.model('cheese').create(cheeses, function (error) {
                if (error) return done(error);

                mongoose.model('tool').create(
                  ['Hammer', 'Saw', 'Axe'].map(function (name) { return { name: name } }),
                  done
                );
              });
            }
          );
        });
      });
    });
  }
};
