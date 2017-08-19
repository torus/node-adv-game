const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const passport = require('koa-passport');
const Strategy = require('passport-facebook').Strategy;

passport.use(new Strategy(
  {
    clientID: process.env.CLIENT_ID,
    clientSecret: process.env.CLIENT_SECRET,
    callbackURL: process.env.BASE_URL + '/login/facebook/return',
  },
  function(accessToken, refreshToken, profile, cb) {
    console.log(profile);
    return cb(null, profile);
  }));

passport.serializeUser(function(user, cb) {
  console.log("serializeUser", user);
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  console.log("deserializeUser", obj);
  cb(null, obj);
});



// x-response-time

app.use(passport.initialize());
app.use(passport.session());

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  ctx.set('X-Response-Time', `${ms}ms`);
});

// logger

app.use(async (ctx, next) => {
  const start = Date.now();
  await next();
  const ms = Date.now() - start;
  console.log(`${ctx.method} ${ctx.url} - ${ms}`);
});

// Sessions
const session = require('koa-session');
app.keys = ['secret'];
app.use(session({}, app));

// response

app.use(router.routes());
app.use(router.allowedMethods());

router
  .get('/', function (ctx, next) {
    console.log(ctx.state.user);
    if (ctx.isAuthenticated()) {
      ctx.body = '<p>HELLO ' + ctx.state.user.displayName + "!"
        + ' <a href="/logout">logout</a></p>';
    } else {
      ctx.body = '<a href="/login/facebook">please log in</a>';
    }
    next();
  })

  .get('/logout', function (ctx, next) {
    if (ctx.isAuthenticated()) {
      ctx.logout();
      ctx.body = '<a href="/">logged out</a>';
    }
  })

  .get('/login/facebook', passport.authenticate('facebook'))

  .get('/login/facebook/return',
       passport.authenticate('facebook', {
         successRedirect: '/',
         failureRedirect: '/'
       })
      )
;

app.listen(3000);
