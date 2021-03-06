var passport = require('passport');
var GithubStrategy = require('passport-github').Strategy;
var githubApp = require('./githubapp.js');
var auth = require('./auth.js');
var util = require('./utility');
var handler = require('./request-handler.js');
var express = require('express');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var db = require('./db-config.js');
var User = require('./db-user.js');
var url = require('url');

var app = express();

// Define existing rooms object
// Rooms should be like rooms = {room1: {lecturer: teacher1, students: [stu1, stu2]}, room2: {lecturer: teacher2, students: [stu3, stu4]}}
var rooms = {};

app.use(express.static(__dirname + '/../client'));

app.use(cookieParser());
app.use( bodyParser.json() );
app.use(bodyParser.urlencoded({
  extended: true
}));

app.get('/', util.checkUser, function(req, res) {
    res.send('1');
});

// Handle login and logout
app.post('/login', handler.loginUser);
app.get('/logout', handler.logoutUser);

// Handle signup
app.post('/signup', handler.signupUser);

// Check user before served up
app.get('/', util.checkUser, function(req, res) {
    res.send('1');
});

// Prepare session for passport
app.use(session({saveUninitialized: true, resave: true, secret: 'this is our secret'}));

// Use passport to authenticate
app.use(passport.initialize());
app.use(passport.session());

// Set the port and url for the server
var servePort = process.env.PORT || 8000;
var app_url = process.env.APP_URL || 'localhost:' + servePort;

// Use Github authentication, githubApp is ignored in the repo
// callback url can be http://localhost:8000/auth/github/callback
// Use ngrok url for demo
passport.use(new GithubStrategy({
  clientID: githubApp.clientID,
  clientSecret: githubApp.secret,
  callbackURL:'http://' + app_url + '/auth/github/callback'
}, function(accessToken, refreshToken, profile, done){
  console.log('accessToken', accessToken);
  console.log('refreshToken', refreshToken);
  // console.log('profile', profile.displayName);
  User.findOrCreate({githubId: profile.id, username: profile.displayName}, function(err, user) {
    return done(err, user);
  });


  // return done(null, {
  //   accessToken: accessToken,
  //   profile: profile
  // });
}));

// Passport session setup.
// To support persistent login sessions, Passport needs to be able to
// serialize users into and deserialize users out of the session. Typically,
// this will be as simple as storing the user when serializing, and finding
// the user when deserializing.
passport.serializeUser(function(user, done){
  console.log('user about to be serialized', user._id);
  done(null, user);
});

passport.deserializeUser(function(id, done){
  console.log('id to be used to deserialized', 'this is the id', id);
  User.find({githubId: id._id}, function(err, user) {
    if (err) { return err;}
    done(err, user);
  });
});

// User.findOrCreate({username:'Gary', password:'test', githubId:'123'}, function(err, user, created) {
//   console.log('A new user from "%s" was inserted', user.ip);
//   User.findOrCreate({}, function(err, click, created) {
//     console.log('Did not create a new user for "%s"', click.ip);
//   })
// });

// In auth page to authenticate, might need to move it.
app.get('/auth/github', function(req, res, next) {
  console.log('in the /auth path, trying to authenticate the user with passport');
  next();
},
  passport.authenticate('github', { failureRedirect: '/auth/error'}), function(req, res, next) {
  // console.log('Authenticated through the github strategy, executing the next piece of middleware and redirecting to /main');
  // console.log(req.user);
  res.redirect('/#/main');
});

app.get('/auth/error', auth.error);
app.get('/auth/github/callback',
  passport.authenticate('github', {failureRedirect: '/auth/error'}),
  auth.callback
);

app.get('/loggedin', function(req, res) {
  // console.log('get request to /loggedin server path');
  // console.log('inside get/logged in, req.isAuthenticated()', req.isAuthenticated());
  // console.log('inside get/logged in, req.user', req.user);
  // console.log('inside get/logged in, req.session', req.session);
  res.send(req.isAuthenticated() ? req.user : '0');
});

// Lecturer post room logic
app.post('/rooms', util.checkUser, function(req, res, next){
  // console.log('post request to /rooms, logging req.user: ', req.user);
  // console.log('post request to /rooms, logging req.session: ', req.session);
  handler.checkRoom(req, res, rooms);
});

app.post('/rooms/asAudience', util.checkUser, function(req, res, next){
  // console.log('post request to /rooms/asAudience, logging req.user: ', req.user);
  // console.log('post request to /rooms/asAudience, logging req.session: ', req.session);
  handler.checkPresenter(req, res, rooms);
});

var server = app.listen(servePort, function(){
    console.log('App connected');
});

// var inputRoom = pathname.toString().split();

// // Student connect to the room
// app.get('/rooms/*', util.checkUser, function(req, res, rooms) {
//   var pathname = require('url').parse(request.url).pathname;
//   var inputRoom = pathname.toString().split('/')[2];  //get the input and the room name
//   rooms = handler.accessRoom(req, res, rooms, inputRoom); //
// });


///////////////////////////////////////////////////////////////////////////
//                            Signal Server                              //
///////////////////////////////////////////////////////////////////////////

// This is a simple web socket server. All it does is accept connections
// and rebroadcast messages from any client to all clients, including the
// client that sent it (which we need for our test code to run with both
// RTC clients in same browser... I think).
var io = require('socket.io')(server);
var presenters = {};
var feedback = {};

// When we get new connections, set each connection up with
// an onmessage handler that will broadcast any messages it
// sends to all other connections (using the broadcast utility fn above)
io.on('connection', function (socket) {
  console.log('Received connection');

  socket.emit('text', 'Connected to signal server');

  // Wait for an ice `msg` from the client and broadcast it to all open sockets
  socket.on('msg', function (message) {
    console.log('broadcasting message', message);
    io.emit('msg', message);

    if (message.room.name) {
      rooms[message.room.name].presenterSocket = socket;
      console.log(rooms);
    }
  });

  // Listen for user feedback and broadcast it to the presenter
  socket.on('feedback', function (message) {
    feedback[message.type] = feedback[message.type] + 1 || 1;

    if (rooms[message.room]) {
      rooms[message.room].presenterSocket.emit('feedback', feedback);
    }
  });
});
