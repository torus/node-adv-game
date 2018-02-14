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
                           E('p', {}, E('a', {href: "/stage/home"}, "start game")),
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
      var stagesKey = "accessibleStages:" + ctx.state.user.id
      await redis('del', stagesKey);
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

function makeDisplayElements(disp) {
  return disp.map(lines => {
    if (lines instanceof(Speak)) {
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

var Speak = function(character, lines) {
  this.character = character
  this.lines = lines
}

Speak.prototype.render = function() {
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

function scenes() {             // WIP
  var sceneMap = {}

  var scene = (...args) => {
    var self = {
      linkedSceneSet: {}               // scene => true
    }
    var procs = []
    for (var i = 0; i < args.length; i ++) {
      var proc = args[i](self)
      if (proc)
        procs.push(proc)
    }

    self.display = async stat => {
      var disp = []
      var actions = []

      var stagesKey = "accessibleStages:" + stat.user.id
      await redis('del', stagesKey)

      for (var i = 0; i < procs.length; i ++) {
        await procs[i](disp, actions, stat)
      }
      return [makeDisplayElements(disp), actions]
    }

    sceneMap[self.name] = self

    return self
  }

  var name = name => scene => {scene.name = name; return async (disp, actions, stat) => {
    console.log("scene", name)
  }}
  var stage = stage => scene => {scene.stage = stage; return async (disp, actions, stat) => {}}
  var desc = (...texts) => scene => async (disp, actions, stat) => {disp.push(texts)}
  var speak = (actor, ...texts) => scene => async (disp, actions, stat) => {disp.push(new Speak(actor, texts))}
  var link = destScene => scene => {
    scene.linkedSceneSet[destScene] = true
    return async (disp, actions, stat) => {
      var stagesKey = "accessibleStages:" + stat.user.id
      await redis('sadd', stagesKey, sceneMap[destScene].stage)

      var key = "currentScene-" + sceneMap[destScene].stage
      await setUserParam(stat, key, destScene)
    }
  }
  var when = (param, ...content) => scene => {
    var valPromise = null
    if (param instanceof Function) {
      valPromise = param(scene)
    }

    var contentPromises = content.map(p => p(scene))

    return async (disp, actions, stat) => {
      var val
      if (valPromise) {
        val = await valPromise(disp, actions, stat)
      } else {
        val = await getUserParam(stat, param)
      }

      if (val) {
        for (var i = 0; i < contentPromises.length; i ++) {
          await contentPromises[i](disp, actions, stat)
        }
      }
    }
  }
  var not = param => scene => async (disp, actions, stat) => {
    var val = await getUserParam(stat, param)
    return (val == null) || (val == 0)
  }
  var action = (...content) => scene => {
    var contentPromises = content.map(p => p(scene))

    return async (disp, actions, stat) => {
      var action = {}
      for (var i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](disp, actions, stat))(action)
      }

      actions.push(action)
    }
  }
  var label = text => scene => async (disp, actions, stat) => async action => {
    action.label = text
  }
  var after = (...content) => scene => async (disp, actions, stat) => async action => {
    var hndlid = actionHandlerCount++
    action.id = hndlid

    var contentPromises = content.map(p => p(scene))

    actionHandlers[hndlid] = async ctx => {
      for (var i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](disp, actions, stat))(action)
      }

      ctx.redirect('/stage/' + scene.stage)
    }
  }
  var flagUp = param => scene => async (disp, actions, stat) => async action => {
    await setUserParam(stat, param, 1)
  }
  var flagDown = param => scene => async (disp, actions, stat) => {}
  var condition = param => scene => async (disp, actions, stat) => {}

  var sceneCount = 0
  var intro = (...content) => scene => {
    var id = sceneCount ++
    var visitedKey = 'visited-' + id
    return async (disp, actions, stat) => {
      var visited = await getUserParam(stat, visitedKey)
      if (visited) {
      } else {
        await setUserParam(stat, visitedKey, 1)
        for (var i = 0; i < content.length; i ++) {
          await content[i](scene)(disp, actions, stat)
        }
      }
    }
  }

  return [
    scene(name("1-1-home"),
          stage("home"),
          intro(desc("ある日、おじいちゃんから手紙が届きました。",
                     "そこには、魚をさばくのに特別な包丁が必要なので、",
                     "私にそれを届けてほしい、と書いてありました。")),
          speak("mom",
               "鍛冶屋さんに包丁を作ってもらって",
               "それを海沿いの村のおじいちゃんの家にとどけてちょうだい"),
          link("1-2-smith")),

    scene(name("1-2-smith"),
          stage("smith"),
          intro(desc("近くの鍛冶屋さんに来ました。",
                     "ここでいつもおじいちゃんの包丁を作ってもらうのです。",
                     "奥から鍛冶職人のおじさんが顔を出しました。"),
                speak("smith",
                     "やあよく来たね。",
                     "なに？　おじいちゃんのためにあの特別な包丁を作ってほしい？"),
                speak("smith",
                     "まいったな、実はいまあの包丁を作るのに必要なハガネユリを切らしているんだ。",
                     "これは今の時期山に生えている花なんだがね、足の具合が悪くていけないのだよ。")),
          speak("smith",
               "お嬢ちゃん、もし出来ればハガネユリをとってきてくれないかい？",
               "あそこの山に流れる川の近くに生えているはずだ"),
          link("1-1-home"),
          link("1-3-mountain")),

    scene(name("1-3-mountain"),
          stage("mountain"),
          intro(desc("山の説明だよ。")),
          when(not("got-steellily"),
               action(label("ハガネユリを取る"),
                      after(flagUp("got-steellily"))),
               link("1-2-smith")),
          when("got-steellily",
               desc("ハガネユリが取れたのでこれを鍛冶屋のおじさんに渡そう。"),
               link("1-4-smith"))),

    scene(name("1-4-smith"),
          condition("got-steellily"),
          stage("smith"),
          speak("smith",
               "お嬢ちゃん、ありがとう。ハガネユリを取って来てくれたんだね。",
               "包丁はもうほとんどできているよ。",
               "あとはこのハガネユリの魔法の力を使って研ぐんだ。"),
          speak("smith",
               "よしできた。",
               "はいこれをおじいちゃんのところへ持って行きなさい。",
               "おじいちゃんの住む海辺の村へは山を越えて行くんだ。"),
          link("1-5-mountain")),

    scene(name("1-5-mountain"),
          stage("mountain"),
          desc("山に来ました。この道を進めばおじいちゃんが住む海沿いの村に出ます。"),
          link("2-1-village")),

    scene(name("2-1-village"),
          stage("village"),
          intro(desc("山道を歩いて谷を抜けると、すぐに海沿いの村に着きました。")),
          link("2-2-grampa")),

    scene(name("2-2-grampa"),
          stage("grampa"),
          intro(desc("おじいちゃんの家に着きました。")),
          desc("おじいちゃんはどこにもいません。"))
  ]
}

function makeStages() {
  var stages = {
    "home": {
      name: "家",
    },
    "smith": {
      name: "鍛冶屋",
    },
    "mountain": {
      name: "山",
    },
    "village": {
      name: "海沿いの村",
    },
    "grampa": {
      name: "おじいちゃんの家",
    }
  }

  var scns = scenes().reduce((acc, cur, idx, arr) => {acc[cur.name] = arr[idx]; return acc}, {})
  var stageDisplays = {}

  for (var s in scns) {
    var scene = scns[s]
    var stage = scene.stage;
    ((scene, stage, prevDisplay) => {
      if (!prevDisplay) {
        stageDisplays[stage] = scene.display
      } else {
        stageDisplays[stage] = async stat => {
          var key = "currentScene-" + stage
          var curScene = await getUserParam(stat, key)
          if (curScene == scene.name) {
            return await scene.display(stat)
          } else {
            return await prevDisplay(stat)
          }
        }
      }
      if (!stages[stage].moves) stages[stage].moves = []
      stages[stage].moves = stages[stage].moves.concat(Object.keys(scene.linkedSceneSet).map(destScene => {
        return scns[destScene].stage
      }))
    }) (scene, stage, stageDisplays[stage])
  }

  for (var s in stages) {
    stages[s].display = stageDisplays[s]
    stages[s].moves = Object.keys(stages[s].moves.reduce((part, cur) => {part[cur] = true; return part}, {}))
  }

  return stages
}

var stagesCache = null
async function stages() {
  if (!stagesCache)
    stagesCache = await makeStages()

  return stagesCache
}

async function stageTitle(id) {
  return (await stages())[id].name;
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

async function stageMoveOptions(id, stat) {
  var list = (await stages())[id].moves || []
  var key = "accessibleStages:" + stat.user.id
  var stagesFiltered = await asyncFilter(list, async function(id) {
    return await redis("sismember", key, id) == 1
  })

  return await asyncMap(stagesFiltered, async id => {
    return {id: id, name: (await stages())[id].name}
  })
}

router.get('/stage/:id', async ctx => {
  var id = ctx.params.id;
  var title = await stageTitle(id);
  try {
    var disp = await (await stages())[id].display(ctx.state)
    var moves = await stageMoveOptions(id, ctx.state)

    ctx.body = make_body(
      title,
      E("h1", {}, title),
      disp[0],
      doc => {
        if (disp[1].length > 0) {
          return E("ul", {id: "actionList"}, disp[1].map(action => {
            return E("li", {},
                     E("form", {method: 'post', action: '/action/' + action.id},
                       E("button", {type: "submit", "class": "btn btn-primary"}, action.label)));
          }))(doc)
        } else {
          return []
        }
      },
      doc => {
        if (moves.length > 0) {
          return E("ul", {id: "moveList"}, moves.map(stage => {
            return E("li", {}, E("a", {href: '/stage/' + stage.id}, stage.name + 'へ行く'));
          }))(doc)
        } else {
          return []
        }
      }
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
