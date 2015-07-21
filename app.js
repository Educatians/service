/**
 * Module dependencies.
 */

var express = require('express'),
  routes = require('./routes'),
  http = require('http'),
  path = require('path'),
  formage = require('formage'),
  baucis = require('baucis'),
  mongoose = require('mongoose'),
  _ = require('underscore'),
  swig = require('swig'),
  UglifyJS = require("uglify-js"),
  fs = require('fs');

// Minify important resources
var minResult = UglifyJS.minify(__dirname + "/public/javascripts/app.js", {
  compress: true
});
fs.writeFileSync(__dirname + "/public/javascripts/app.min.js", minResult.code);

var app = express();

var MongoStore = require('connect-mongo')(express);

GLOBAL.salt = 'appians_education_123454321';

// Template engine
app.engine('html', swig.renderFile);

// all environments
app.set('port', process.env.PORT || 3000);
app.set('mongo', process.env.MONGO_URL || 'mongodb://localhost/appians_education');
app.set('views', __dirname + '/views');
app.set('view engine', 'html');
app.use(express.favicon());
app.use(express.logger('dev'));
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser(salt));
app.use(express.session({
  store: new MongoStore({
    url: app.get('mongo'),
    collection: 'education_sessions'
  })
}));
app.use(app.router);
app.use(require('less-middleware')({
  src: __dirname + '/public'
}));
app.use(express.static(path.join(__dirname, 'public')));

// Disable swig cache
app.set('view cache', false);

// development only
if ('development' == app.get('env')) {
  app.use(express.errorHandler());
}

// Export app
GLOBAL.app = app;

/*
 * Create connection to mongo
 */
mongoose.connect(app.get('mongo'));
var models = require('./models');

/*
 * API
 */

// Enable full CORS
app.all('/api/*', function(req, res, next) {
  req.accepts('*');

  res.header('Access-Control-Allow-Origin', req.headers.origin || "*");
  res.header('Access-Control-Allow-Methods', 'GET,POST,PUT,HEAD,DELETE,OPTIONS');
  res.header('Access-Control-Allow-Headers', req.headers['access-control-request-headers']);
  res.header('Access-Control-Allow-Credentials', 'true');

  next();
});

baucis.rest('User');
baucis.rest('Grade');
app.use('/api/v1', baucis({
  swagger: true
}));


/*
 * Admin
 */
var admin = formage.init(app, express, models, {
  title: 'Admin',
  root: '/admin',
  default_section: 'main',
  username: 'admin',
  password: 'admin'
});

admin.registerAdminUserModel();

/*
 * Auth
 */

// Just for ajax calls

function ensureSession(req, res, next) {
  if (req.session.user) {
    return next();
  } else {
    res.redirect('/');
  }
};

// Needed for parts where data is required

function ensureAuthenticated(req, res, next) {
  if (req.session.user) {
    // Update user data
    var grades = mongoose.model('Grade'),
      messages = mongoose.model('Message');

    grades.find({
      teacher: req.session.user._id
    }, function(err, docs) {
      req.session.user.grades_count = docs.length;

      messages.find({
        receiver: {
          $in: [req.session.user._id]
        },
        read: {
          $nin: [req.session.user._id]
        }
      }, function(err, msgs) {
        req.session.user.messages_count = msgs.length;

        return next();
      });
    });
  } else {
    res.redirect('/');
  }
};

/*
 * URLS
 */
app.get('/', routes.index);
app.get('/dashboard', ensureAuthenticated, routes.dashboard);
app.get('/grades', ensureAuthenticated, routes.grades);

app.get('/grade/create', ensureAuthenticated, routes.grade_create);

app.get('/grade/:id/users', ensureAuthenticated, routes.grade_users);
app.get('/grade/:id/calendar', ensureAuthenticated, routes.grade_calendar);
app.get('/grade/:id', ensureAuthenticated, routes.grade);

app.get('/calendar', ensureAuthenticated, routes.calendar);

app.get('/populate', ensureSession, routes.populate);

app.get('/message/users/', ensureSession, routes.message_users);
app.get('/message/users/:search', ensureSession, routes.message_users);
app.post('/message/send', ensureSession, routes.message_send);

app.post('/message/mark', ensureSession, routes.message_mark);

app.post('/message/box/read', ensureAuthenticated, routes.message_box_read);
app.get('/message/box/:type', ensureAuthenticated, routes.message_box);

// User
app.post('/login', routes.login);
app.get('/logout', ensureAuthenticated, routes.logout);
app.post('/update_profile', ensureSession, routes.update_profile);

// Social stream
app.post('/add_social_stream', ensureSession, routes.add_social_stream);
app.get('/remove_social_stream/:id', ensureSession, routes.remove_social_stream);

/*
 * Create server
 */
http.createServer(app).listen(app.get('port'), function() {
  console.log('Express server listening on port ' + app.get('port'));
});