// This is a Controller mixin for adding methods to manage middleware creation.

// __Dependencies__
var middleware = require('../middleware');

// __Private Module Members__

// Handle variable number of arguments
function last (skip, names, values) {
  var r = {};
  var position = names.length;
  var count = Object.keys(values).filter(function (key) { return values[key] }).length - skip;

  if (count === 0) throw new Error('Too few arguments.');

  names.forEach(function (name) {
    var index = skip + count - position;
    position--;
    if (index >= skip) r[name] = values[index];
  });

  return r;
}

// Parse middleware into an array of middleware definitions for each howMany and verb
function factor (stage, options) {
  if (!stage) throw new Error('Must supply stage.');

  var factored = [];

  if (options.verbs) {
    options.verbs = options.verbs.toLowerCase();
    options.verbs.split(/\s+/).forEach(function (verb) {
      if (!/^head|get|put|post|del$/.exec(verb)) throw new Error('Unrecognized verb: ' + verb);
    });
  }

  if (options.howMany && options.howMany !== 'instance' && options.howMany !== 'collection') {
    throw new Error('Unrecognized howMany: ' + options.howMany);
  }

  // Middleware function or array
  if (Array.isArray(options.middleware) || typeof options.middleware === 'function') {
    if (options.howMany !== 'collection') factored.push({ stage: stage, howMany: 'instance', verbs: options.verbs, middleware: options.middleware });
    if (options.howMany !== 'instance') factored.push({ stage: stage, howMany: 'collection', verbs: options.verbs, middleware: options.middleware });
    return factored;
  }

  // Middleware hash keyed on instance/collection, then verb
  if (options.howMany) throw new Error('Specified instance/collection twice.');
  if (options.verbs) throw new Error('Specified verbs twice.');

  Object.keys(options.middleware).forEach(function (howManyKey) {
    Object.keys(options.middleware[howManyKey]).map(function (verb) {
      factored.push({
        stage: stage,
        howMany: howManyKey,
        verbs: verb,
        middleware: options.middleware[howManyKey][verb]
      });
    });
  });

  return factored;
}

// __Module Definition__
var mixin = module.exports = function () {

  // __Private Instance Members__

  var controller = this;
  // Flags whether the custom middleware has been activated
  var initialized = false;
  // A hash for storing user middleware
  var custom = {
    "request":
    { "instance": { "head": [], "get": [], "post": [], "put": [], "del": [] },
     "collection": { "head": [], "get": [], "post": [], "put": [], "del": [] }
    },
    "query":
    { "instance": { "head": [], "get": [], "post": [], "put": [], "del": [] },
     "collection": { "head": [], "get": [], "post": [], "put": [], "del": [] }
    },
    "documents":
    { "instance": { "head": [], "get": [], "post": [], "put": [], "del": [] },
     "collection": { "head": [], "get": [], "post": [], "put": [], "del": [] }
    }
  };

  // A method used to register user middleware to be activated during intialization.
  function register (stage, howMany, verbs, middleware) {
    if (initialized) {
      throw new Error("Can't add middleware after the controller has been activated.");
    }

    var options = last(1, ['howMany', 'verbs', 'middleware'], arguments);

    // Prevent explicitly setting query-stage POST middleware.  Implicitly adding
    // this middleware is ignored.
    if (stage === 'query' && options.verbs && options.verbs.indexOf('post') !== -1) {
      throw new Error('Query stage not executed for POST.');
    }

    factor(stage, options).forEach(function (definition) {
      var verbs = definition.verbs || 'head get post put del';
      verbs.split(' ').forEach(function (verb) {
        if (controller.get(verb) === false) return;
        custom[definition.stage][definition.howMany][verb] = custom[definition.stage][definition.howMany][verb].concat(definition.middleware);
      });
    });
  }

  // A method used to activate user middleware that was previously registered.
  function activate (stage, howMany, verbs, middleware) {
    if (initialized) throw new Error("Can't activate middleware after the controller has been activated.");

    var options = last(1, ['howMany', 'verbs', 'middleware'], arguments);

    factor(stage, options).forEach(function (definition) {
      var verbs = definition.verbs || 'head get post put del';

      verbs.split(' ').forEach(function (verb) {
        if (controller.get(verb) === false) return;

        var path;

        if (definition.howMany === 'instance') path = controller.get('basePathWithId');
        else if (definition.howMany === 'collection') path = controller.get('basePath');
        else throw new Error('Unrecognized howMany.');

        controller[verb](path, definition.middleware);
      });
    });
  }

  // __Public Instance Methods__

  // A method used to register request-stage middleware.
  controller.request = function (howMany, verbs, middleware) {
    register('request', howMany, verbs, middleware);
    return controller;
  };

  // A method used to register query-stage middleware.
  controller.query = function (howMany, verbs, middleware) {
    register('query', howMany, verbs, middleware);
    return controller;
  };

  // A method used to register document-stage middleware.
  controller.documents = function (howMany, verbs, middleware) {
    register('documents', howMany, verbs, middleware);
    return controller;
  };

  // A method used to intialize the controller and activate user middleware.  It
  // may be called multiple times, but will trigger intialization only once.
  controller.initialize = function () {
    if (initialized) return controller;

    // __Request-Stage Middleware__

    // Activate middleware that sets the Allow & Accept headers
    activate('request', [ middleware.headers.allow, middleware.headers.accept ]);
    // Activate middleware to set request.baucis.conditions for find/remove
    activate('request', 'collection', 'head get del', middleware.configure.conditions);
    // Also activate conditions middleware for update
    activate('request', 'instance', 'put', middleware.configure.conditions);
    // Activate middleware to set request.baucis.count when query is present
    activate('request', 'get', middleware.configure.count);
    // Next, activate the request-stage user middleware.
    activate('request', custom['request']);
    // Activate middleware to build the query (except for POST requests).
    activate('request', middleware.query);

    // __Query-Stage Middleware__
    // The query will have been created (except for POST, which doesn't use a
    // find or remove query).

    // Activate middleware to handle controller and query options.
    activate('query', [ middleware.configure.controller, middleware.configure.query ]);

    // Delete any query-stage POST middleware that was added implicitly.
    custom.query.instance.post = [];
    custom.query.collection.put = [];

    // Activate user middleware for the query-stage
    activate('query', custom['query']);

    // Activate middleware to execute the query:

    // Get the count for HEAD requests.
    activate('query', 'head', middleware.exec.count);
    // Execute the find or remove query for GET and DELETE.
    activate('query', 'get del', middleware.exec.exec);
    // Create the documents for a POST request.
    activate('query', 'collection', 'post', middleware.exec.create);
    // Update the documents specified for a PUT request.
    activate('query', 'instance', 'put', middleware.exec.update);

    // Activate some middleware that will set the Link header when that feature
    // is enabled.  (This must come after exec or else the count is
    // returned for all subsequqent executions of the query.)
    if (controller.get('relations') === true) {
      activate('query', 'instance', 'head get post put del', middleware.headers.link);
      activate('query', 'collection', 'head get post put del', middleware.headers.linkCollection);
    }

    // __Document-Stage Middleware__

    // Activate the middleware that sets the `Last-Modified` header when appropriate.
    activate('documents', middleware.documents.lastModified);
    // Activate the the document-stage user middleware.
    activate('documents', custom['documents']);
    // Activate the middleware that sends the resulting document(s) or count.
    activate('documents', middleware.documents.send);

    delete custom;
    initialized = true;
    return controller;
  };
};
