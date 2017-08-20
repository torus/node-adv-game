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
    // console.log(profile);
    return cb(null, profile);
  }));

passport.serializeUser(function(user, cb) {
  // console.log("serializeUser", user);
  cb(null, user);
});

passport.deserializeUser(function(obj, cb) {
  // console.log("deserializeUser", obj);
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

const E = require('./libxmljs-lazy-builder')
const libxml = require('libxmljs')

function make_body(title) {
  var content = Array.prototype.slice.call(arguments, 1);
  var e = E('html', {lang: "en"},
            E('head', {},
              E('link', {
                rel: "stylesheet",
                href: "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/css/bootstrap.min.css",
                integrity: "sha384-rwoIResjU2yc3z8GV/NPeZWAv56rSmLldC3R/AZzGRnGxQQKnKkoFVhFQhNUwEyJ",
                crossorigin: "anonymous"
              }),
              E('script', {
                src: "https://code.jquery.com/jquery-3.1.1.slim.min.js",
                integrity: "sha384-A7FZj7v+d/sdmMqp/nOQwliLvUsJfDHW+k9Omg/a/EheAdgtzNs3hpfag6Ed950n",
                crossorigin: "anonymous"
              }, " "),
              E('script', {
                src: "https://cdnjs.cloudflare.com/ajax/libs/tether/1.4.0/js/tether.min.js",
                integrity: "sha384-DztdAPBWPRXSA/3eYEEUWrWCy7G5KFbe8fFjk5JAIxUYHKkDx6Qin1DkWx51bBrb",
                crossorigin: "anonymous"
              }, " "),
              E('script', {
                src: "https://maxcdn.bootstrapcdn.com/bootstrap/4.0.0-alpha.6/js/bootstrap.min.js",
                integrity: "sha384-vBWWzlZJ8ea9aCX4pEW3rVHjgjt7zpkNpZk+02D9phzyeVkE+jo0ieGizqPLForn",
                crossorigin: "anonymous"
              }, " "),
              E('title', {}, title)),

            E('body', {style: "padding-top: 5rem"},
              E('nav', {class: "navbar navbar-toggleable-md navbar-inverse bg-inverse fixed-top"},
                E('button', {
                  class: "navbar-toggler navbar-toggler-right",
                  type: "button",
                  'data-toggle': "collapse",
                  'data-target': "#navbarsExampleDefault",
                  'aria-controls': "navbarsExampleDefault",
                  'aria-expanded': "false",
                  'aria-label': "Toggle navigation"
                },
                  E('span', {class: "navbar-toggler-icon"})),

                E('a', {class: "navbar-brand", href: "#"}, "Navbar"),

                E('div', {class: "collapse navbar-collapse", id: "navbarsExampleDefault"},
                  E('ul', {class: "navbar-nav mr-auto"},
                    E('li', {class: "nav-item active"},
                      E('a', {class: "nav-link", href: "#"},
                        "Home ",
                        E('span', {class: "sr-only"}, "(current)"))),
                    E('li', {class: "nav-item"},
                      E('a', {class: "nav-link", href: "#"}, "Link")),
                    E('li', {class: "nav-item disabled"},
                      E('a', {class: "nav-link", href: "#"}, "Disabled")),
                    E('li', {class: "nav-item dropdown"},
                      E('a', {
                        class: "nav-link dropdown-toggle",
                        href: "http://example.com",
                        id: "dropdown01",
                        'data-toggle': "dropdown",
                        'aria-haspopup': "true",
                        'aria-expanded': "false"
                      }, "Dropdown"),
                      E('div', {class: "dropdown-menu", 'aria-labelledby': "dropdown01"},
                        E('a', {class: "dropdown-item", href: "#"}, "Action"),
                        E('a', {class: "dropdown-item", href: "#"}, "Another action"),
                        E('a', {class: "dropdown-item", href: "#"}, "Something else here")))),
                  E('form', {class: "form-inline my-2 my-lg-0"},
                    E('input', {class: "form-control mr-sm-2", type: "text", placeholder: "Search"}),
                    E('button', {class: "btn btn-outline-success my-2 my-sm-0", type: "submit"},
                      "Search")))),
              E('div', {class: 'container'},
                E('div', {style: "padding: 3rem 1.5rem"},
                  E('h1', {}, "Hey!"),
                  content))));
  var doc = new libxml.Document();
  return "<!DOCTYPE html>" + e(doc).toString();
}

router
  .get('/', function (ctx, next) {
    if (ctx.isAuthenticated()) {
      ctx.body = make_body("Home",
                           E('p', {}, "Hello, " + ctx.state.user.displayName + "!"),
                           E('p', {}, E('a', {href: "/logout"}, "log out")));
    } else {
      ctx.body = make_body("Home",
                           E('p', {},
                             E('a', {href: "/login/facebook"}, "log in with Facebook")));
    }
    next();
  })

  .get('/logout', function (ctx, next) {
    if (ctx.isAuthenticated()) {
      ctx.logout();
    }
    ctx.body = make_body("Logout",
                         E('p', {},
                           "You are successfully logged out. ",
                           E('a', {href: "/login/facebook"}, "Log in with Facebook again"),
                           " or ",
                           E('a', {href: "/"}, "Back to Home.")));
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
