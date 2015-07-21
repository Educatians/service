// __Dependencies__
var url = require('url');
var mongoose = require('mongoose');

// __Module Definition__
var middleware = module.exports = {
  lastModified: function (request, response, next) {
    var lastModifiedPath = request.app.get('lastModified');
    var documents = request.baucis.documents;

    if (!lastModifiedPath) return next();
    if (typeof documents === 'number') return next();
    if (!documents) return next();

    var modifiedDates = [].concat(documents).map(function (doc) {
      return doc[lastModifiedPath];
    });

    // Validate
    // TODO allow/convert Timestamp, Number, ISODate
    modifiedDates.forEach(function (modified) {
      if (modified instanceof Date) return;
      else next(new Error('lastModified path was not a date'));
    });

    // Find the latest date
    var lastModified = Math.max.apply(null, modifiedDates);

    // Stringify to RFC 822, updated by RFC 1123 e.g. Sun, 06 Nov 1994 08:49:37 GMT
    response.set('Last-Modified', (new Date(lastModified)).toUTCString());

    next();
  },
  send: function (request, response, next) {
    var ids;
    var location;
    var findBy = request.app.get('findBy');
    var basePath = request.originalUrl;
    var documents = request.baucis.documents;

    // 404 if document(s) not found or 0 documents removed/counted
    if (!documents) return response.send(404);

    if (request.baucis.noBody) return response.send();

    // If it's a document count (e.g. the result of a DELETE), send it back and
    // short-circuit.
    if (typeof documents === 'number') return response.json(documents);

    // If count mode is set, send the length, or send 1 for single document
    if (request.baucis.count) {
      if (Array.isArray(documents)) response.json(documents.length);
      else response.json(1);
      return;
    }

    // Otherwise, set the location and send JSON document(s).  Don't set location if documents
    // don't have IDs for whatever reason e.g. custom middleware.
    if (!Array.isArray(documents) && documents instanceof mongoose.Document) {
      if (documents.get) {
        location = url.resolve(basePath, documents.get(findBy).toString());
      }
    }
    else if (documents.length === 1 && documents[0] instanceof mongoose.Document) {
      location = url.resolve(basePath, documents[0].get(findBy).toString());
    }
    else if (documents.every(function (doc) { return doc instanceof mongoose.Document })) {
      ids = documents.map(function (doc) { return '"' + doc.get(findBy) + '"' });
      if (ids.every(function (id) { return id })) {
        location = basePath + '?conditions={ "' + findBy + '": { "$in": [' + ids.join() + '] } }';
      }
    }

    if (location) response.set('Location', location);

    response.json(documents);
  }
};
