const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const passport = require('koa-passport');
const Strategy = require('passport-facebook').Strategy;

const promisify = require('es6-promisify');
const redisClient = require('redis').createClient();
const redisPromise = promisify(redisClient.send_command, redisClient);

function redis(command, ...args) {
  return redisPromise(command, args);
}

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

passport.serializeUser(async function(user, cb) {
  console.log("serializeUser", user);
  var id = user.id;
  var prefix = user.provider;
  var key = "account" + ":" + prefix + ":" + id;
  var userId = null;
  var error;

  try {
    userId = await redis('get', key);

    if (userId == null) {
      userId = await redis('incr', "maxid");
      await redis('set', key, userId);
    }
  } catch(e) {
    error = e;
  }
  cb(error, userId);
});

passport.deserializeUser(async function(id, cb) {
  console.log("deserializeUser", id);
  cb(null, {id: id, displayName: "display-" + id, name: {}});
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

const E = require('libxmljs-lazy-builder')
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

                E('a', {class: "navbar-brand", href: "/"}, "Navbar"),

                E('div', {class: "collapse navbar-collapse", id: "navbarsExampleDefault"},
                  E('ul', {class: "navbar-nav mr-auto"},
                    E('li', {class: "nav-item active"},
                      E('a', {class: "nav-link", href: "/"},
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
                E('div', {},
                  content))));
  var doc = new libxml.Document();
  return "<!DOCTYPE html>" + e(doc).toString();
}

router
  .get('/', function (ctx, next) {
    if (ctx.isAuthenticated()) {
      ctx.body = make_body("Home",
                           E('p', {}, "Hello, " + ctx.state.user.displayName
                             + "! (" + ctx.state.user.id + ")"),
                           E('p', {}, E('a', {href: "/spot/home"}, "start game")),
                           E('p', {}, E('a', {href: "/delete"}, "delete save data")),
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

  .get('/delete', async function (ctx, next) {
    if (ctx.isAuthenticated()) {
      var key = "user:" + ctx.state.user.id;
      await redis('del', key);
      var spotsKey = "accessibleSpots:" + ctx.state.user.id
      await redis('del', spotsKey);
    }
    ctx.body = make_body("Logout",
                         E('p', {},
                           "Your save data was successfully deleted. ",
                           E('a', {href: "/"}, "Back to Home.")));
  })

  .get('/login/facebook', (ctx, next) => {
    ctx.body = make_body("Loggin in with Facebook",
                         E('p', {},
                           "Loggin in with Facebook. Be patient..."),
                         E('script', {}, "location.href = '/login/facebook/real'"));
  })

  .get('/login/facebook/real', passport.authenticate('facebook'))

  .get('/login/facebook/return',
       passport.authenticate('facebook', {
         successRedirect: '/',
         failureRedirect: '/'
       })
      )
;

function textListToElements(list) {
    return E('p', {}, list.slice(1).reduce((part, line) => {
      return part.concat([E('br'), line])
    }, [list[0]]))
}

function makeMessageElements(mesg) {
  return mesg.map(lines => {
    if (lines instanceof(Line)) {
      return lines.render()
    }
    return textListToElements(lines)
  })
}

var characters = {
  "mom": {
    label: "おかあさん",
    image: "http://3.bp.blogspot.com/-7QNkW1q8Q00/VZ-TiS4FtWI/AAAAAAAAvRQ/I6bIWDKq-lo/s800/obasan03_smile.png"
  },
  "smith": {
    label: "おじさん",
    image: "http://2.bp.blogspot.com/-O9HwTlFMdFI/UWgWd04Hq1I/AAAAAAAAQDw/zlpLB4khUjc/s1600/hige_busyo.png"
  }
}

var Line = function(character, lines) {
  this.character = character
  this.lines = lines
}

Line.prototype.render = function() {
  var lines = this.lines.slice()
  lines[0] = characters[this.character].label + "「" + lines[0]
  lines[lines.length - 1] = lines[lines.length - 1] + "」"

  return E('p', {},
           E('img', {src: characters[this.character].image, style: "max-width: 15ex"}),
           E('br'),
           lines.slice(1).reduce((part, line) => {
             return part.concat([E('br'), line])
           }, [lines[0]]))
}

function setUserParam(stat, param, value) {
  var key = "user:" + stat.user.id;
  redis('hset', key, param, value)
}

function getUserParam(stat, param) {
  var key = "user:" + stat.user.id;
  return redis('hget', key, param)
}

var spots = {
  "home": {
    name: "家",
    desc: async stat => {
      var mesg = []
      if (await getUserParam(stat, 'visited-home')) {
      } else {
        mesg.push(["ある日、おじいちゃんから手紙が届きました。",
                   "そこには、魚をさばくのに特別な包丁が必要なので、",
                   "私にそれを届けてほしい、と書いてありました。"])
        await setUserParam(stat, 'visited-home', 1)
        var spotsKey = "accessibleSpots:" + stat.user.id
        await redis('sadd', spotsKey, "home", "smith", "mountain")
      }
      mesg.push(new Line("mom", ["鍛冶屋さんに包丁を作ってもらって",
                                 "それを海沿いの村のおじいちゃんの家にとどけてちょうだい"]))
      return makeMessageElements(mesg)
    },
    moves: ["smith"]
  },
  "smith": {
    name: "鍛冶屋",
    desc: async stat => {
      var mesg = []

      if (await getUserParam(stat, 'got-steellily')) {
        mesg.push(new Line("smith", ["お嬢ちゃん、ありがとう。ハガネユリを取って来てくれたんだね。",
                                     "包丁はもうほとんどできているよ。",
                                     "あとはこのハガネユリの魔法の力を使って研ぐんだ。"]))
        mesg.push(new Line("smith", ["よしできた。",
                                     "はいこれをおじいちゃんのところへ持って行きなさい。",
                                     "おじいちゃんの住む海辺の村へは山を越えて行くんだ。"]))
        await setUserParam(stat, 'got-knife', 1)
      } else {
        if (await getUserParam(stat, 'visited-smith')) {
        } else {
          mesg.push(["近くの鍛冶屋さんに来ました。",
                     "ここでいつもおじいちゃんの包丁を作ってもらうのです。",
                     "奥から鍛冶職人のおじさんが顔を出しました。"],
                    new Line("smith", ["やあよく来たね。",
                                       "なに？　おじいちゃんのためにあの特別な包丁を作ってほしい？"]),
                    new Line("smith", ["まいったな、実はいまあの包丁を作るのに必要なハガネユリを切らしているんだ。",
                                       "これは今の時期山に生えている花なんだがね、足の具合が悪くていけないのだよ。"]))
          await setUserParam(stat, 'visited-smith', 1)
        }

        mesg.push(new Line("smith", ["お嬢ちゃん、もし出来ればハガネユリをとってきてくれないかい？",
                                     "あそこの山に流れる川の近くに生えているはずだ"]))
      }

      return makeMessageElements(mesg)
    },
    moves: ["home", "mountain"]
  },
  "mountain": {
    name: "山",
    desc: async stat => {
      var mesg = [["山に来ました。"]]

      if (await getUserParam(stat, 'got-knife')) {
        var spotsKey = "accessibleSpots:" + stat.user.id
        await redis('sadd', spotsKey, "village", "grampa")
        await redis('srem', spotsKey, "smith", "home")
      } else if (await getUserParam(stat, 'got-steellily')) {
        mesg.push(["ハガネユリが取れたのでこれを鍛冶屋のおじさんに渡そう。"])
      }
      return makeMessageElements(mesg)
    },
    moves: ["smith", "village"],
    actions: async stat => {
      if (await getUserParam(stat, 'got-steellily')) {
        return []
      } else {
        return [{
          label: "ハガネユリをとる",
          handler: async ctx => {
            await setUserParam(ctx.state, 'got-steellily', 1)
            ctx.redirect('/spot/mountain')
          }
        }]
      }
    },
  },
  "village": {
    name: "海沿いの村",
    desc: stat => {
      return E('p', {}, "おじいちゃんが住んでいる山に来ました。")
    },
    moves: ["grampa"]
  },
  "grampa": {
    name: "おじいちゃんの家",
    desc: stat => {
      return E('p', {}, "おじいちゃんの家につきましたが、おじいちゃんはどこにもいません。")
    },
    moves: []
  }
};

async function spotTitle(id) {
  return spots[id].name;
}

async function spotBody(id, stat) {
  var dest = spots[id].desc(stat);
  return dest instanceof(Promise) ? await dest : dest;
}

async function asyncMap(arr, asyncFunc) {
  var dest = []
  for (var i = 0; i < arr.length; i++) {
    dest.push(await asyncFunc(arr[i]))
  }
  return dest
}

async function asyncFilter(arr, asyncFunc) {
  var proms = arr.map(obj => {
    return asyncFunc(obj)
  })
  var dest = []
  for (var i = 0; i < arr.length; i ++) {
    if (await proms[i]) {
      dest.push(arr[i])
    }
  }
  return dest
}

async function spotMoveOptions(id, stat) {
  var list = spots[id].moves || []
  var key = "accessibleSpots:" + stat.user.id
  var spotsFiltered = await asyncFilter(list, async function(id) {
    return await redis("sismember", key, id) == 1
  })
  return spotsFiltered.map(id => {
    return {id: id, name: spots[id].name}
  });
}

async function spotActions(id, stat) {
  var list = spots[id].actions ? await spots[id].actions(stat) : []
  return list.map(option => {
    var hndlid = actionHandlerCount++;
    actionHandlers[hndlid] = option.handler;
    return {id: hndlid, label: option.label}
  });
}

router.get('/spot/:id', async ctx => {
  var id = ctx.params.id;
  var title = await spotTitle(id);
  try {
    ctx.body = make_body(
      title,
      E("h1", {}, title),
      await spotBody(id, ctx.state),
      E("ul", {}, (await spotActions(id, ctx.state)).map(action => {
        return E("li", {},
                 E("form", {method: 'post', action: '/action/' + action.id},
                   E("button", {type: "submit", "class": "btn btn-primary"}, action.label)));
      })),
      E("ul", {}, (await spotMoveOptions(id, ctx.state)).map(spot => {
        return E("li", {}, E("a", {href: '/spot/' + spot.id}, spot.name + 'へ行く'));
      }))
    )
  } catch (e) {
    ctx.body = make_body(
      "ERROR!",
      E("h1", {}, "AN ERROR OCCURRED!"),
      E("pre", {}, e.stack)
    )
  }
});

var actionHandlers = {};
var actionHandlerCount = 0;

router.post('/action/:id', async ctx => {
  var id = ctx.params.id;
  var action = actionHandlers[id];
  if (action) {
    await action(ctx);
  }
});

app.listen(3000);
