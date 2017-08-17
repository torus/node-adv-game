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
    return cb(null, profile);
  }));

passport.serializeUser(function(user, cb) {
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
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

// response

app.use(router.routes());
app.use(router.allowedMethods());

router
  .get('/', function (ctx, next) {
    ctx.body = '<a href="/login/facebook">please log in</a>';
    next();
  })
  .get('/hello', function (ctx, next) {
    ctx.body = 'HELLO!';
  })

  .get('/login/facebook', passport.authenticate('facebook'))

  .get('/login/facebook/return',
       passport.authenticate('facebook', {
         successRedirect: '/hello',
         failureRedirect: '/'
       })
      )
;

app.listen(3000);
