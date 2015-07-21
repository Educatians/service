var path = require('path'),
    fs = require('fs'),
    files = fs.readdirSync(__dirname);

require('formage').loadTypes(require('mongoose'));

files.forEach(function(file) {
    var name = path.basename(file, '.js');
    if (name === 'index')
        return;

    module.exports[name] = require('./' + name);
});