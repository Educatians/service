// This is a Controller mixin to add methods for generating Swagger data.

// __Dependencies__
var mongoose = require('mongoose');

// __Private Members__

// Convert a Mongoose type into a Swagger type
function swaggerTypeFor (type) {
  if (!type) return null;
  if (type === String) return 'string';
  if (type === Number) return 'double';
  if (type === Date) return 'Date';
  if (type === Boolean) return 'boolean';
  if (type === mongoose.Schema.Types.ObjectId) return 'string';
  if (type === mongoose.Schema.Types.Oid) return 'string';
  if (type === mongoose.Schema.Types.Array) return 'Array';
  if (Array.isArray(type)) return 'Array';
  if (type === Object) return null;
  if (type instanceof Object) return null;
  if (type === mongoose.Schema.Types.Mixed) return null;
  if (type === mongoose.Schema.Types.Buffer) return null;
  throw new Error('Unrecognized type: ' + type);
};

// A method for capitalizing the first letter of a string
function capitalize (s) {
  if (!s) return s;
  if (s.length === 1) return s.toUpperCase();
  return s[0].toUpperCase() + s.substring(1);
}

// __Module Definition__
var mixin = module.exports = function () {

  // __Public Members__

  // A method used to generate a Swagger model definition for a controller
  this.generateModelDefinition = function () {
    var that = this;
    var definition = {};
    var schema = this.get('schema');

    definition.id = capitalize(this.get('singular'));
    definition.properties = {};

    Object.keys(schema.paths).forEach(function (name) {
      var property = {};
      var path = schema.paths[name];
      var select = that.get('select');
      var type = swaggerTypeFor(path.options.type);

      // Keep deselected paths private
      if (path.selected === false) return;
      if (select && select.match('-' + name)) return;

      if (!type) {
        console.log('Warning: That field type is not yet supported in baucis Swagger definitions, using "string."');
        console.log('Path name: %s.%s', definition.id, name);
        console.log('Mongoose type: %s', path.options.type);
        property.type = 'string';
      }
      else {
        property.type = swaggerTypeFor(path.options.type);
      }

      property.required = path.options.required || (name === '_id');


      // Set enum values if applicable
      if (path.enumValues && path.enumValues.length > 0) {
        property.allowableValues = { valueType: 'LIST', values: path.enumValues };
      }

      // Set allowable values range if min or max is present
      if (!isNaN(path.options.min) || !isNaN(path.options.max)) {
        property.allowableValues = { valueType: 'RANGE' };
      }

      if (!isNaN(path.options.min)) {
        property.allowableValues.min = path.options.min;
      }

      if (!isNaN(path.options.max)) {
        property.allowableValues.max = path.options.max;
      }

      definition.properties[name] = property;
    });

    return definition;
  };

  // Generate parameter list for operations
  this.generateParameters = function (verb, plural) {
    var parameters = [];

    // Parameters available for singular routes
    if (!plural) {
      parameters.push({
        paramType: 'path',
        name: 'id',
        description: 'The ID of a ' + this.get('singular'),
        dataType: 'string',
        required: true,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'header',
        name: 'X-Baucis-Push',
        description: 'May be used with PUT to update the document using $push rather than $set',
        dataType: 'boolean',
        required: false,
        allowMultiple: false
      });
    }

    // Parameters available for plural routes
    if (plural) {
      parameters.push({
        paramType: 'query',
        name: 'skip',
        description: 'How many documents to skip.',
        dataType: 'int',
        required: false,
        allowMultiple: false
      });

      parameters.push({
        paramType: 'query',
        name: 'limit',
        description: 'The maximum number of documents to send.',
        dataType: 'int',
        required: false,
        allowMultiple: false
      });
    }

    // Parameters available for singular and plural routes
    parameters.push({
      paramType: 'query',
      name: 'count',
      description: 'Set to true to return count instead of documents.',
      dataType: 'boolean',
      required: false,
      allowMultiple: false
    });

    parameters.push({
      paramType: 'query',
      name: 'select',
      description: 'Select which paths will be returned by the query.',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    parameters.push({
      paramType: 'query',
      name: 'populate',
      description: 'Specify which paths to populate.',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    parameters.push({
      paramType: 'query',
      name: 'conditions',
      description: 'Set the conditions used to find or remove the document(s).',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    parameters.push({
      paramType: 'query',
      name: 'sort',
      description: 'Set the fields by which to sort.',
      dataType: 'string',
      required: false,
      allowMultiple: false
    });

    if (verb === 'post') {
      // TODO post body can be single or array
      parameters.push({
        paramType: 'body',
        name: 'document',
        description: 'Create a document by sending the paths to be updated in the request body.',
        dataType: capitalize(this.get('singular')),
        required: true,
        allowMultiple: false
      });
    }

    if (verb === 'put') {
      parameters.push({
        paramType: 'body',
        name: 'document',
        description: 'Update a document by sending the paths to be updated in the request body.',
        dataType: capitalize(this.get('singular')),
        required: true,
        allowMultiple: false
      });
    }

    return parameters;
  };

  this.generateErrorResponses = function (plural) {
    var errorResponses = [];

    // Error rosponses for singular operations
    if (!plural) {
      errorResponses.push({
        code: 404,
        reason: 'No ' + this.get('singular') + ' was found with that ID.'
      });
    }

    // Error rosponses for plural operations
    if (plural) {
      errorResponses.push({
        code: 404,
        reason: 'No ' + this.get('plural') + ' matched that query.'
      });
    }

    // Error rosponses for both singular and plural operations
    // None.

    return errorResponses;
  };

  // Generate a list of a controller's operations
  this.generateOperations = function (plural) {
    var that = this;
    var operations = [];

    this.activeVerbs().forEach(function (verb) {
      var operation = {};
      var titlePlural = capitalize(that.get('plural'));
      var titleSingular = capitalize(that.get('singular'));

      // Don't do head, post/put for single/plural
      if (verb === 'head') return;
      if (verb === 'post' && !plural) return;
      if (verb === 'put' && plural) return;

      // Use the full word
      if (verb === 'del') verb = 'delete';

      operation.httpMethod = verb.toUpperCase();

      if (plural) operation.nickname = verb + titlePlural;
      else operation.nickname = verb + titleSingular + 'ById';

      operation.responseClass = titleSingular; // TODO sometimes an array!

      if (plural) operation.summary = capitalize(verb) + ' some ' + that.get('plural');
      else operation.summary = capitalize(verb) + ' a ' + that.get('singular') + ' by its unique ID';

      operation.parameters = that.generateParameters(verb, plural);
      operation.errorResponses = that.generateErrorResponses(plural);

      operations.push(operation);
    });

    return operations;
  };

  // A method used to generate a Swagger API definition for a controller
  this.generateApiDefinition = function (options) {
    var modelName = capitalize(this.get('singular'));
    var definition = {
      apiVersion: options.version,
      swaggerVersion: '1.1',
      basePath: options.basePath,
      resourcePath: '/' + this.get('plural'),
      apis: [],
      models: {}
    };

    // Model
    definition.models[modelName] = this.generateModelDefinition();

    // Instance route
    definition.apis.push({
      path: '/' + this.get('plural') + '/{id}',
      description: 'Operations about a given ' + this.get('singular'),
      operations: this.generateOperations(false)
    });

    // Collection route
    definition.apis.push({
      path: '/' + this.get('plural'),
      description: 'Operations about ' + this.get('plural'),
      operations: this.generateOperations(true)
    });

    return definition;
  };
}
