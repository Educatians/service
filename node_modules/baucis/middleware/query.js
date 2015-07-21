// __Module Definition__
var middleware = module.exports = {
  instance: {
    // Retrieve header for the addressed document
    head: function (request, response, next) {
      var Model = request.app.get('model');
      request.baucis.noBody = true;
      request.baucis.query = Model.findOne(request.app.getFindByConditions(request));
      next();
    },
    // Retrieve the addressed document
    get: function (request, response, next) {
      var Model = request.app.get('model');
      request.baucis.query = Model.findOne(request.app.getFindByConditions(request));
      next();
    },
    // Treat the addressed document as a collection, and push
    // the addressed object to it
    post: function (request, response, next) {
      response.send(405); // method not allowed (as of yet unimplemented)
    },
    // Update the addressed document
    put: function (request, response, next) {
      var Model = request.app.get('model');
      var bodyId = request.body[request.app.get('findBy')];

      if (bodyId && request.params.id !== bodyId) return next(new Error('ID mismatch'));

      request.baucis.updateWithBody = true;
      request.baucis.query = Model.findOne(request.app.getFindByConditions(request));
      next();
    },
    // Delete the addressed object
    del: function (request, response, next) {
      var Model = request.app.get('model');
      request.baucis.query = Model.remove(request.app.getFindByConditions(request));
      next();
    }
  },
  collection: {
    // Retrieve documents matching conditions
    head: function (request, response, next) {
      var Model = request.app.get('model');
      request.baucis.noBody = true;
      request.baucis.query = Model.find(request.baucis.conditions);
      next();
    },
    // Retrieve documents matching conditions
    get: function (request, response, next) {
      var Model = request.app.get('model');
      request.baucis.query = Model.find(request.baucis.conditions);
      next();
    },
    // Update all given docs ...
    put: function (request, response, next) {
      response.send(405); // method not allowed (as of yet unimplemented)
    },
    // Delete all documents matching conditions
    del: function (request, response, next) {
      var Model = request.app.get('model');
      request.baucis.query = Model.remove(request.baucis.conditions);
      next();
    }
  }
};
