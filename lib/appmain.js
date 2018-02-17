const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const passport = require('koa-passport');
const Strategy = require('passport-facebook').Strategy;

const promisify = require('es6-promisify');
const redisClient = require('redis').createClient();
const redisPromise = promisify(redisClient.send_command, redisClient);

const yaml = require('js-yaml')
const fs = require('fs')

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
                           E('p', {}, E('a', {href: "/stage/0/home"}, "start game")),
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

function makeDisplayElements(disp, characters) {
  return disp.map(lines => {
    if (lines instanceof(Speak)) {
      return lines.render(characters)
    }
    return textListToElements(lines)
  })
}

var Speak = function(character, lines) {
  this.character = character
  this.lines = lines
}

Speak.prototype.render = function(characters) {
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

var GameSession = function(webState) {
  this.webState = webState
  this.id = webState.user.id
}

function setUserParam(session, param, value) {
  var key = "user:" + session.id;
  redis('hset', key, param, value)
}

function getUserParam(session, param) {
  var key = "user:" + session.id;
  return redis('hget', key, param)
}

async function loadGame(gameId) {
  var sceneMap = {}
  var commands = {}

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

  commands.scene = (...args) => {
    var self = {
      linkedSceneSet: {}               // scene => true
    }
    var procs = []
    for (var i = 0; i < args.length; i ++) {
      var proc = args[i](self)
      if (proc)
        procs.push(proc)
    }

    self.display = async session => {
      var disp = []
      var actions = []

      var stagesKey = "accessibleStages:" + session.id
      await redis('del', stagesKey)

      for (var i = 0; i < procs.length; i ++) {
        await procs[i](disp, actions, session)
      }
      return [makeDisplayElements(disp, characters), actions]
    }

    sceneMap[self.name] = self

    return self
  }

  commands.name = name => scene => {scene.name = name; return async (disp, actions, session) => {
    console.log("scene", name)
  }}
  commands.stage = stage => scene => {scene.stage = stage; return async (disp, actions, session) => {}}
  commands.desc = (...texts) => scene => async (disp, actions, session) => {disp.push(texts)}
  commands.speak = (actor, ...texts) => scene => async (disp, actions, session) => {disp.push(new Speak(actor, texts))}
  commands.link = destScene => scene => {
    scene.linkedSceneSet[destScene] = true
    return async (disp, actions, session) => {
      var stagesKey = "accessibleStages:" + session.id
      await redis('sadd', stagesKey, sceneMap[destScene].stage)

      var key = "currentScene-" + sceneMap[destScene].stage
      await setUserParam(session, key, destScene)
    }
  }
  commands.when = (param, ...content) => scene => {
    var valPromise = null
    if (param instanceof Function) {
      valPromise = param(scene)
    }

    var contentPromises = content.map(p => p(scene))

    return async (disp, actions, session) => {
      var val
      if (valPromise) {
        val = await valPromise(disp, actions, session)
      } else {
        val = await getUserParam(session, param)
      }

      if (val) {
        for (var i = 0; i < contentPromises.length; i ++) {
          await contentPromises[i](disp, actions, session)
        }
      }
    }
  }
  commands.not = param => scene => async (disp, actions, session) => {
    var val = await getUserParam(session, param)
    return (val == null) || (val == 0)
  }
  commands.action = (...content) => scene => {
    var contentPromises = content.map(p => p(scene))

    return async (disp, actions, session) => {
      var action = {}
      for (var i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](disp, actions, session))(action)
      }

      actions.push(action)
    }
  }
  commands.label = text => scene => async (disp, actions, session) => async action => {
    action.label = text
  }
  commands.after = (...content) => scene => async (disp, actions, session) => async action => {
    var hndlid = actionHandlerCount++
    action.id = hndlid

    var contentPromises = content.map(p => p(scene))

    actionHandlers[hndlid] = async ctx => {
      for (var i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](disp, actions, session))(action)
      }

      ctx.redirect('/stage/0/' + scene.stage)
    }
  }
  commands.flagUp = param => scene => async (disp, actions, session) => async action => {
    await setUserParam(session, param, 1)
  }
  commands.flagDown = param => scene => async (disp, actions, session) => {}
  commands.condition = param => scene => async (disp, actions, session) => {}

  var sceneCount = 0
  commands.intro = (...content) => scene => {
    var id = sceneCount ++
    var visitedKey = 'visited-' + id
    return async (disp, actions, session) => {
      var visited = await getUserParam(session, visitedKey)
      if (visited) {
      } else {
        await setUserParam(session, visitedKey, 1)
        for (var i = 0; i < content.length; i ++) {
          await content[i](scene)(disp, actions, session)
        }
      }
    }
  }

  if (gameId != 0)
    throw new Error("invalid game ID")

  var doc = yaml.safeLoad(await promisify(fs.readFile)('./data/island.yaml'))
  console.log(doc)

  var conv = elem => {
    if (typeof(elem) == 'string') {
      return elem
    }

    var keys = Object.keys(elem)
    if (keys.length == 1) {
      var key = keys[0]
      var func = commands[key]
      var content = elem[key]
      if (! (content instanceof Array)) {
        content = [content]
      }
      return func.apply(null, content.map(conv))
    } else {
      throw new Error("invalid elem " + keys)
    }
  }

  var sceneArray = doc.filter(e => e.scene).map(elem => conv(elem))
  console.log(sceneArray)

  var stagesElems = doc.filter(e => e.stages)
  if (stagesElems.length != 1)
    throw new Error("0 or more than 1 stagesElems defined")

  return {stages: stagesElems[0].stages, scenes: sceneArray}
}

async function makeStages(gameId) {
  if (gameId != 0)
    throw new Error("invalid gameId")

  var game = await loadGame(gameId)
  var stages = game.stages

  var scns = game.scenes.reduce((acc, cur, idx, arr) => {acc[cur.name] = arr[idx]; return acc}, {})
  var stageDisplays = {}

  for (var s in scns) {
    var scene = scns[s]
    var stage = scene.stage;
    ((scene, stage, prevDisplay) => {
      if (!prevDisplay) {
        stageDisplays[stage] = scene.display
      } else {
        stageDisplays[stage] = async session => {
          var key = "currentScene-" + stage
          var curScene = await getUserParam(session, key)
          if (curScene == scene.name) {
            return await scene.display(session)
          } else {
            return await prevDisplay(session)
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

var stagesCache = {}
async function stages(gameId) {
  if (!stagesCache[gameId])
    stagesCache[gameId] = await makeStages(gameId)

  return stagesCache[gameId]
}

async function stageTitle(gameId, id) {
  return (await stages(gameId))[id].name;
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

async function stageMoveOptions(gameId, id, session) {
  var list = (await stages(gameId))[id].moves || []
  var key = "accessibleStages:" + session.id
  var stagesFiltered = await asyncFilter(list, async function(id) {
    return await redis("sismember", key, id) == 1
  })

  return await asyncMap(stagesFiltered, async id => {
    return {id: id, name: (await stages(gameId))[id].name}
  })
}

router.get('/stage/:gameid/:stageid', async ctx => {
  var gameId = ctx.params.gameid
  var id = ctx.params.stageid
  var title = await stageTitle(gameId, id)
  var session = new GameSession(ctx.state)
  try {
    var disp = await (await stages(gameId))[id].display(session)
    var moves = await stageMoveOptions(gameId, id, session)

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
            return E("li", {}, E("a", {href: '/stage/0/' + stage.id}, stage.name + 'へ行く'));
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
