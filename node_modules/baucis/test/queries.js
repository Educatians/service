var expect = require('expect.js');
var mongoose = require('mongoose');
var express = require('express');
var passport = require('passport')
var LocalStrategy = require('passport-local').Strategy;
var request = require('request');
var baucis = require('..');
var parselinks = require('parse-links');

var fixtures = require('./fixtures');

describe('Queries', function () {
  before(fixtures.vegetable.init);
  beforeEach(fixtures.vegetable.create);
  after(fixtures.vegetable.deinit);

  it('should support skip 1', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?skip=1',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body).to.have.property('length', vegetables.length - 1);
      done();
    });
  });

  it('should support skip 2', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?skip=2',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body).to.have.property('length', vegetables.length - 2);
      done();
    });
  });

  it('should support limit 1', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=1',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body).to.have.property('length', 1);
      done();
    });
  });

  it('should support limit 2', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body).to.have.property('length', 2);
      done();
    });
  });

  it('should disallow selecting deselected fields', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?select=species+lastModified',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);
      expect(body).to.match(/Including excluded fields is not permitted[.]/i);
      done();
    });
  });

  it('should disallow populating deselected fields 1', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?populate=species',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);
      expect(body).to.match(/Including excluded fields is not permitted[.]/i);
      done();
    });
  });

  it('should disallow populating deselected fields 2', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?populate={ "path": "species" }',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);
      expect(body).to.match(/Including excluded fields is not permitted[.]/i);
      done();
    });
  });

  it('should disallow using +fields with populate', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?populate={ "select": "%2Bboiler" }',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);
      expect(body).to.match(/May not set selected fields of populated document[.]/i);
      done();
    });
  });

  it('should disallow using +fields with select', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?select=%2Bboiler',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);
      expect(body).to.match(/Including excluded fields is not permitted[.]/i);
      done();
    });
  });

  it('should disallow selecting fields when populating', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?populate={ "path": "", "select": "arbitrary" }',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 500);
      expect(body).to.match(/May not set selected fields of populated document[.]/i);
      done();
    });
  });

  it('should allow selecting fields', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?select=-_id lastModified',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body[0]).to.have.property('lastModified');
      expect(body[0]).not.to.have.property('_id');
      expect(body[0]).not.to.have.property('name');
      done();
    });
  });

  it('should allow adding paging links', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('link');
      done();
    });
  });

  it('should not return paging links if limit not set', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?sort=name',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers.link).to.not.contain('rel="first"');
      expect(response.headers.link).to.not.contain('rel="last"');
      expect(response.headers.link).to.not.contain('rel="next"');
      expect(response.headers.link).to.not.contain('rel="previous"');
      done();
    });
  });

  it('should return next for first page', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('link');
      expect(response.headers.link).to.contain('rel="next"');
      done();
    });
  });

  it('should return previous for second page', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name&skip=2',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('link');
      expect(response.headers.link).to.contain('rel="previous"');
      done();
    });
  });

  it('should not return paging links previous for first page', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('link');
      expect(response.headers.link).not.to.contain('rel="previous"');
      done();
    });
  });

  it('should not return paging links next for last page', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name&skip=6',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('link');
      expect(response.headers.link).not.to.contain('rel="next"');
      done();
    });
  });

  it('should preserve query in paging links', function(done) {
    var conditions = JSON.stringify({ name: { $regex: /.*i.*/ } });
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name&skip=0&conditions=' + conditions,
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(response.headers).to.have.property('link');
      expect(response.headers.link).to.contain('rel="next"');
      var links = parselinks(response.headers.link);
      expect(links.next).to.contain('conditions=' + encodeURIComponent(conditions));
      done();
    });
  });

  it('should allow retrieving paging links next', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name&skip=0',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body[0]).to.have.property('name');
      expect(body[0].name).to.equal('Carrot');
      expect(response.headers).to.have.property('link');
      var links = parselinks(response.headers.link);
      expect(links).to.have.property('next');
      var options = {
        url: 'http://localhost:8012' + links.next,
        json: true
      };
      request.get(options, function (error, response, body) {
        expect(response).to.have.property('statusCode', 200);
        expect(body[0]).to.have.property('name');
        expect(body[0].name).to.equal('Pea');
        done();
      })
    });
  });

  it('should allow retrieving paging links previous', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name&skip=2',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body[0]).to.have.property('name');
      expect(body[0].name).to.equal('Pea');
      expect(response.headers).to.have.property('link');
      var links = parselinks(response.headers.link);
      expect(links).to.have.property('previous');
      var options = {
        url: 'http://localhost:8012' + links.previous,
        json: true
      };
      request.get(options, function (error, response, body) {
        expect(response).to.have.property('statusCode', 200);
        expect(body[0]).to.have.property('name');
        expect(body[0].name).to.equal('Carrot');
        done();
      })
    });
  });

  it('should allow retrieving paging links last', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name&skip=6',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body[0]).to.have.property('name');
      expect(body[0].name).to.equal('Turnip');
      expect(response.headers).to.have.property('link');
      var links = parselinks(response.headers.link);
      expect(links).to.have.property('first');
      var options = {
        url: 'http://localhost:8012' + links.first,
        json: true
      };
      request.get(options, function (error, response, body) {
        expect(response).to.have.property('statusCode', 200);
        expect(body[0]).to.have.property('name');
        expect(body[0].name).to.equal('Carrot');
        done();
      })
    });
  });

  it('should allow retrieving paging links first', function(done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?limit=2&sort=name&skip=0',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body[0]).to.have.property('name');
      expect(body[0].name).to.equal('Carrot');
      expect(response.headers).to.have.property('link');
      var links = parselinks(response.headers.link);
      expect(links).to.have.property('last');
      var options = {
        url: 'http://localhost:8012' + links.last,
        json: true
      };
      request.get(options, function (error, response, body) {
        expect(response).to.have.property('statusCode', 200);
        expect(body[0]).to.have.property('name');
        expect(body[0].name).to.equal('Turnip');
        done();
      });
    });
  });

  it('should allow retrieving count instead of documents', function (done) {
    var options = {
      url: 'http://localhost:8012/api/v1/vegetables?count=true',
      json: true
    };
    request.get(options, function (error, response, body) {
      if (error) return done(error);
      expect(response).to.have.property('statusCode', 200);
      expect(body).to.be(8);
      done();
    });
  });
});
