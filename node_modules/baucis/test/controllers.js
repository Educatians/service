var expect = require('expect.js');
var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');
var baucis = require('..');

var fixtures = require('./fixtures');

describe('Controllers', function () {
  before(fixtures.controller.init);
  beforeEach(fixtures.controller.create);
  after(fixtures.controller.deinit);

  it('should allow passing string name only to create', function (done) {
    var makeController = function () { baucis.rest('store') };
    expect(makeController).to.not.throwException();
    done();
  });

  it('should support select options', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/cheeses',
      json: true
    };
    request.get(options, function (err, response, body) {
      if (err) return done(err);
      expect(response.statusCode).to.be(200);
      expect(body).to.have.property('length', 3);
      expect(body[0]).to.have.property('color', 'Yellow');
      expect(body[0]).to.have.property('name', 'Cheddar');
      expect(body[0]).not.to.have.property('_id');
      done();
    });
  });

  it('should support finding documents with custom findBy field', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/cheeses/Camembert',
      json: true
    };
    request.get(options, function (err, response, body) {
      if (err) return done(err);
      expect(response.statusCode).to.be(200);
      expect(body).to.have.property('color', 'White');
      done();
    });
  });

  it('should disallow adding a non-unique findBy field', function (done) {
    var makeController = function () {
      baucis.rest({ singular: 'cheese', findBy: 'color' });
    };
    expect(makeController).to.throwException(/findBy path for cheese not unique/);
    done();
  });

  it('should allow adding a uniqe findBy field 1', function (done) {
    var makeController = function () {
      var rab = new mongoose.Schema({ 'arb': { type: String, unique: true } });
      mongoose.model('rab', rab);
      baucis.rest({ singular: 'rab', findBy: 'arb' });
    };
    expect(makeController).not.to.throwException();
    done();
  });

  it('should allow adding a unique findBy field 2', function (done) {
    var makeController = function () {
      var barb = new mongoose.Schema({ 'arb': { type: String, index: { unique: true } } });
      mongoose.model('barb', barb);
      baucis.rest({ singular: 'barb', findBy: 'arb' });
    };
    expect(makeController).not.to.throwException();
    done();
  });

  it('should allow adding arbitrary routes', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/stores/info',
      json: true
    };
    request.get(options, function (err, response, body) {
      if (err) return done(err);
      expect(response.statusCode).to.be(200);
      expect(body).to.be('OK!');
      done();
    });
  });

  it('should allow adding arbitrary routes with params', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/stores/XYZ/arbitrary',
      json: true
    };
    request.get(options, function (err, response, body) {
      if (err) return done(err);
      expect(response.statusCode).to.be(200);
      expect(body).to.be('XYZ');
      done();
    });
  });

  it('should still allow using baucis routes when adding arbitrary routes', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/stores',
      qs: { select: 'name -_id' },
      json: true
    };
    request.get(options, function (err, response, body) {
      if (err) return done(err);
      expect(response.statusCode).to.be(200);
      expect(body).to.eql([ { name: 'Westlake' }, { name: 'Corner' } ]);
      done();
    });
  });

  it('should allow mounting of subcontrollers', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/stores/123/tools',
      json: true
    };
    request.get(options, function (err, response, body) {
      if (err) return done(err);
      expect(response.statusCode).to.be(200);
      done();
    });
  });

  it('should allow using middleware', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/stores',
      json: true
    };
    request.del(options, function (err, response, body) {
      if (err) return done(err);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers['x-poncho']).to.be('Poncho!');
      done();
    });
  });

  it('should allow using middleware mounted at a path', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/stores/binfo',
      json: true
    };
    request.post(options, function (err, response, body) {
      if (err) return done(err);
      expect(response).to.have.property('statusCode', 200);
      expect(body).to.be('Poncho!');
      done();
    });
  });

  it('should disallow adding handlers after initialization', function (done) {
    var controller = baucis.rest('store');
    controller.initialize();
    var register = function () { controller.request('get', function () {}) };
    expect(register).to.throwException(/Can't add middleware after the controller has been activated./);
    done();
  });

  it('should not allow query middleware to be explicitly registered for POST', function (done) {
    var controller = baucis.rest('store');
    var register = function () { controller.query('get put head del post', function () {}) };
    expect(register).to.throwException(/Query stage not executed for POST./);
    done();
  });

  it('should ignore implicitly registered query middleware for POST', function (done) {
    var controller = baucis.rest('store');
    var register = function () { controller.query(function () {}) };
    expect(register).not.to.throwException();
    done();
  });

  it('should disallow unrecognized verbs', function (done) {
    var controller = baucis.rest('store');
    var register = function () { controller.request('get dude', function () {}) };
    expect(register).to.throwException(/Unrecognized verb: dude/);
    done();
  });

  it('should disallow unrecognized howManys', function (done) {
    var controller = baucis.rest('store');
    var register = function () { controller.request('gargoyle', 'get put', function () {}) };
    expect(register).to.throwException(/Unrecognized howMany: gargoyle/);
    done();
  });

  it('should allow specifying instance or collection middleware', function (done) {
    var controller = baucis.rest('store');
    var register = function () {
      controller.request('collection', 'get put head del post', function () {});
      controller.request('instance', 'get put head del post', function () {});
    };
    expect(register).to.not.throwException();
    done();
  });

  it('should allow registering query middleware for other verbs', function (done) {
    var controller = baucis.rest('store');
    var register = function () { controller.query('get put head del', function () {}) };
    expect(register).not.to.throwException();
    done();
  });

  it('should allow registering POST middleware for other stages', function (done) {
    var controller = baucis.rest('store');
    var register = function () {
      controller.request('post', function () {});
      controller.documents('post', function () {});
    };

    expect(register).not.to.throwException();
    done();
  });

  it('should correctly set the deselected paths property', function (done) {
    var doozle = new mongoose.Schema({ a: { type: String, select: false }, b: String, c: String, d: String });
    mongoose.model('doozle', doozle);
    var controller = baucis.rest({ singular: 'doozle', select: '-d c -a b' });
    expect(controller.get('deselected paths')).eql([ 'a', 'd' ]);
    done();
  });


  it('should disallow push mode by default', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/stores/Westlake',
      headers: { 'X-Baucis-Push': true },
      json: true,
      body: { molds: 'penicillium roqueforti' }
    };
    request.put(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);
      done();
    });
  });

  it('should disallow pushing to non-whitelisted paths', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/cheeses/Huntsman',
      headers: { 'X-Baucis-Push': true },
      json: true,
      body: { 'favorite nes game': 'bubble bobble' }
    };
    request.put(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);

      done();
    });
  });

  it("should allow pushing to an instance document's whitelisted arrays when push mode is enabled", function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/cheeses/Huntsman',
      headers: { 'X-Baucis-Push': true },
      json: true,
      body: { molds: 'penicillium roqueforti' }
    };
    request.put(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 201);

      expect(body).to.have.property('molds');
      expect(body.molds).to.have.property('length', 1);
      expect(body.molds).to.eql([ 'penicillium roqueforti' ]);

      done();
    });
  });

  it("should allow pushing to embedded arrays using positional $", function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/cheeses/Camembert',
      headers: { 'X-Baucis-Push': true },
      json: true,
      qs: { conditions: JSON.stringify({ 'arbitrary.goat': true }) },
      body: { 'arbitrary.$.llama': 5 }
    };
    request.put(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 201);

      expect(body).to.have.property('arbitrary');
      expect(body.arbitrary).to.have.property('length', 2);
      expect(body.arbitrary[0]).to.have.property('llama');
      expect(body.arbitrary[0].llama).to.have.property('length', 3);
      expect(body.arbitrary[0].llama[0]).to.be(3);
      expect(body.arbitrary[0].llama[1]).to.be(4);
      expect(body.arbitrary[0].llama[2]).to.be(5);
      expect(body.arbitrary[1].llama).to.have.property('length', 2);
      expect(body.arbitrary[1].llama[0]).to.be(1);
      expect(body.arbitrary[1].llama[1]).to.be(2);

      done();
    });
  });


});
