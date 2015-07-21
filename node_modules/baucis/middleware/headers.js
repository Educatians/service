// __Dependencies__
var url = require('url');
var extend = require('util')._extend;
var qs = require('querystring');

// __Module Definition__
var middleware = module.exports = {
  // Add "Link" header field, with some basic defaults
  link: function (request, response, next) {
    var originalPath = request.originalUrl.split('?')[0];
    var originalPathParts = originalPath.split('/');
    var linkBase;

    originalPathParts.pop();
    linkBase = originalPathParts.join('/');

    response.links({
      collection: linkBase,
      search: linkBase,
      edit: url.resolve(linkBase, request.params.id),
      self: originalPath
    });

    next();
  },
  // Add "Link" header field, with some basic defaults (for collection routes)
  linkCollection: function (request, response, next) {
    var makeLink = function (query) {
      var newQuery = extend(request.query, query || {});
      var originalPath = request.originalUrl.split('?')[0];
      return originalPath + '?' + qs.stringify(newQuery);
    };
    var done = function () { response.links(links), next() };
    var links = { search: makeLink(), self: makeLink() };

    // Add paging links if these conditions are not met
    if (request.method !== 'GET') return done();
    if (!request.query.limit) return done();

    request.baucis.query.count(function (error, count) {
      if (error) return next(error);

      var limit = Number(request.query.limit);
      var skip = Number(request.query.skip || 0);

      links.first = makeLink({ skip: 0 });
      links.last = makeLink({ skip: Math.max(0, count - limit) });

      if (skip) links.previous = makeLink({ skip: Math.max(0, skip - limit) });
      if (limit + skip < count) links.next = makeLink({ skip: limit + skip });

      done();
    });
  },
  // Build the "Allow" response header
  allow: function (request, response, next) {
    var allowed = request.app.activeVerbs().map(function (verb) {
      return verb.toUpperCase();
    });

    response.set('Allow', allowed.join());
    next();
  },
  // Build the "Accept" response header
  accept: function (request, response, next) {
    response.set('Accept', 'application/json');
    next();
  },
  // Add the "Location" response header
  location: function (request, response, next) {
    if (request.baucis.location) response.set('Location', request.baucis.location);
    next();
  }
};
