
/**
 * Module dependencies.
 */

if (!process.env.NINJA_CLIENT_ID||!process.env.NINJA_CLIENT_SECRET)
  throw new Error('Ninja client credentials have not been set! You need NINJA_CLIENT_ID and NINJA_CLIENT_SECRET in your environment');

var express = require('express')
  , routes = require('./routes/index')
  , http = require('http')
  , path = require('path')
  , redisClient = require('redis-url').connect(process.env.REDISTOGO_URL)
  , RedisStore = require('connect-redis')(express);

var app = express();
var authom = require('authom');

app.configure(function(){
  app.set('port', process.env.PORT || 8000);
  app.set('views', __dirname + '/views');
  app.set('view engine', 'jade');
  app.use(express.favicon());
  app.use(express.cookieParser())
  app.use(express.session({secret:"ninjaALLTHETHINGS",store: new RedisStore({client:redisClient})}));
  app.use(express.logger('dev'));
  app.use(express.bodyParser());
  app.use(express.methodOverride());
  app.use(function(req,res,next) {
    res.setHeader( 'X-Powered-By', "A bad-ass mother who don't take no crap off of nobody!" );
    req.redisClient = redisClient;
    next();
  });
  app.use(app.router);
  app.use(express.static(path.join(__dirname, 'public')));
});

app.configure('development', function(){
  app.use(express.errorHandler());
});

authom.createServer({
  service:"ninjablocks",
  id:process.env.NINJA_CLIENT_ID,
  secret:process.env.NINJA_CLIENT_SECRET,
  scope:['all']
});

/*
  Middleware
 */
var requiresSignin = function(req,res,next) {
  if (!req.session.ninja) {
    res.redirect('/auth/ninjablocks');
    return;
  }
  next();
}

/*
    Authom configuration
 */

authom.on('auth',routes.handleNinjaAuthentication);

authom.on('error',function(req,res,data) {
  console.log(data);
});

/*
  App Routes
 */

app.get('/', requiresSignin, routes.index);

app.all('/rest/v0/*',routes.proxy);
/*
  Auth routes
 */

app.get("/auth/:service",authom.app);


http.createServer(app).listen(app.get('port'), function(){
  console.log("Ninja Security listening on port " + app.get('port'));
});
