const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const passport = require('koa-passport');
const Strategy = require('passport-facebook').Strategy;

const promisify = require('es6-promisify');
const redisClient = require('redis').createClient({url: process.env.REDIS_URL});
const redisPromise = promisify(redisClient.send_command, redisClient);

const yaml = require('js-yaml')
const fs = require('fs')

const randomstring = require("randomstring")

const bodyParser = require('koa-bodyparser')
app.use(bodyParser())

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
  console.log("serializeUser", user)
  const id = user.id
  const prefix = user.provider
  const name = user.displayName
  const key = "account:" + prefix + ":" + id
  let userId = null
  let error = null

  try {
    userId = await redis('get', key)

    if (userId == null) {
      userId = await redis('incr', "maxid")
      await redis('set', key, userId)
    }

    const userKey = "user:" + userId
    const data = {id: userId, displayName: name}
    console.log('serialized', data)
    await redis('set', userKey, JSON.stringify(data))
  } catch(e) {
    error = e
  }
  cb(error, userId)
})

passport.deserializeUser(async function(id, cb) {
  console.log("deserializeUser", id)
  const userKey = "user:" + id
  const dataJSON = await redis('get', userKey)
  try {
    const data = JSON.parse(dataJSON)
    cb(null, data)
  } catch(e) {
    console.log("error", dataJSON)
    cb(e)
  }
})

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

app.use(async (ctx, next) => {
  if (ctx.url == '/' || ctx.url.match(/^\/login\//)) {
    await next()
    return
  }

  if (!ctx.isAuthenticated()) {
    console.log('not authenticated')
    ctx.redirect('/')
    return
  }

  await next()
})

app.use(async (ctx, next) => {
  try {
    await next()
  } catch (e) {
    ctx.body = await constructPage(
      ctx,
      "ERROR!",
      E("h1", {}, "AN ERROR OCCURRED!"),
      E("pre", {}, e.stack)
    )
  }
})

// Sessions
const session = require('koa-session');
app.keys = ['secret'];
app.use(session({}, app));

// response

app.use(router.routes());
app.use(router.allowedMethods());

const E = require('libxmljs-lazy-builder')
const libxml = require('libxmljs')

async function accountMenu(ctx) {
  if (ctx.isAuthenticated()) {
    return E('div', {class: "nav-item dropdown"},
             E('a', {
               class: "nav-link dropdown-toggle",
               href: "http://example.com",
               id: "dropdown01",
               'data-toggle': "dropdown",
               'aria-haspopup': "true",
               'aria-expanded': "false"
             }, ctx.state.user.displayName),
             E('div', {class: "dropdown-menu", 'aria-labelledby': "dropdown01"},
               E('a', {class: "dropdown-item", href: "/logout"}, "Log out")))
  } else {
    return E('div', {class: "nav-item dropdown"},
             E('a', {
               class: "nav-link dropdown-toggle",
               href: "http://example.com",
               id: "dropdown01",
               'data-toggle': "dropdown",
               'aria-haspopup': "true",
               'aria-expanded': "false"
             }, "Guest"),
             E('div', {class: "dropdown-menu", 'aria-labelledby': "dropdown01"},
               E('a', {class: "dropdown-item", href: "/login/facebook"}, "log in with Facebook")))
  }
}

async function constructPage(ctx, title, ...content) {
  let e = E('html', {lang: "en"},
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

                E('a', {class: "navbar-brand", href: "/"}, "Adventure Bookshelves"),

                E('div', {class: "collapse navbar-collapse", id: "navbarsExampleDefault"},
                  E('ul', {class: "navbar-nav mr-auto"},
                    E('li', {class: "nav-item"},
                      E('a', {class: "nav-link", href: "/games"}, "Games")),
                    E('li', {class: "nav-item"},
                      E('a', {class: "nav-link", href: "/sessions"}, "Playlist"))),
                  await accountMenu(ctx))),
              E('div', {class: 'container'},
                E('div', {},
                  content),
                E('footer', {},
                  E('hr'),
                  E('p', {},
                    '(c) Toru Hisai 2018 ',
                    E('a', {href: 'https://twitter.com/torus'}, '@torus'),
                    ' ',
                    E('a', {href: 'https://github.com/torus/node-adv-game'}, 'GitHub repo'))))))
  let doc = new libxml.Document();
  return "<!DOCTYPE html>" + e(doc).toString();
}

router.get('/', async ctx => {
  ctx.body = await constructPage(
    ctx,
    'Adventure Bookshelves',
    E('h1', {}, 'Welcome to the Adventure Bookshelves!'),
    doc => {
      if (ctx.isAuthenticated()) {
        return E('ul', {},
                 E('li', {},
                   E('a', {href: '/sessions'}, 'Continue Game')),
                 E('li', {},
                   E('a', {href: '/games'}, 'Start a New Game')))
      } else {
        return E('p', {},
                 E('a', {href: "/login/facebook"}, "log in with Facebook"))
      }
    }
  )
})

router.get('/logout', async ctx => {
  if (ctx.isAuthenticated()) {
    ctx.logout();
  }
  ctx.body = await constructPage(ctx,
                       "Logout",
                       E('p', {},
                         "You are successfully logged out. ",
                         E('a', {href: "/login/facebook"}, "Log in with Facebook again"),
                         " or ",
                         E('a', {href: "/"}, "Back to Home.")));
})

router.get('/login/facebook', async ctx => {
  ctx.body = await constructPage(ctx,
                       "Loggin in with Facebook",
                       E('p', {},
                         "Loggin in with Facebook. Be patient..."),
                       E('script', {}, "location.href = '/login/facebook/real'"));
})

router.get('/login/facebook/real', passport.authenticate('facebook'))

router.get('/login/facebook/return',
           passport.authenticate('facebook', {
             successRedirect: '/',
             failureRedirect: '/'
           })
          )

const games = [
  {id: 0, name: 'アイランド・ストーリー'}
]

router.get('/games', async ctx => {
  ctx.body = await constructPage(ctx,
                       'Games',
                       E('h1', {}, 'Games'),
                       E('ul', {},
                         games.map(g => E('li', {}, E('a', {href: "/games/" + g.id}, g.name)))))
})

router.get('/games/:gameid', async ctx => {
  const gameId = ctx.params.gameid

  let game = games.filter(g => g.id == gameId)[0]
  ctx.body = await constructPage(ctx,
                       game.name,
                       E('h1', {}, game.name),
                       E('form', {method: 'post', action: '/sessions'},
                         E('input', {type: 'hidden', name: 'gameId', value: gameId}),
                         E('p', {}, E('button', {type: "submit", "class": "btn btn-primary"}, 'New Game'))))
})

router.get('/sessions/:sessId', async ctx => {
  const sessId = ctx.params.sessId
  const key = 'session:' + sessId
  const data = await redis('get', key)

  let session = new GameSession(ctx.state, sessId)
  ctx.body = await constructPage(ctx,
                       "Session",
                       E('h1', {}, 'Play'),
                       E('p', {}, "Hello, " + ctx.state.user.displayName
                         + "! (" + ctx.state.user.id + ")"),
                       E('p', {}, E('a', {href: ['/stage', session.id].join('/')}, "Play")),
                       E('p', {}, "session ID: ", sessId),
                       E('p', {}, data))
})

router.get('/sessions', async ctx => {
  const userId = ctx.state.user.id
  const sessKey = 'userSession:' + userId
  const sessions = await redis('smembers', sessKey)

  ctx.body = await constructPage(ctx,
                       'Playlist',
                       E('h1', {}, 'Continue Game'),
                       E('ul', {},
                         sessions.map(s => E('li', {}, E('a', {href: ['/sessions', s].join('/')}, s)))))
})

async function generateSessionId() {
  let key
  let id
  do {
    id = randomstring.generate(7)
    key = 'session:' + id
  } while(await redis('exists', key) == 1)

  return id
}

router.post('/sessions', async ctx => {
  let gameId = ctx.request.body.gameId
  console.log('sessions', gameId)

  const sessId = await generateSessionId()
  const key = 'session:' + sessId
  const userId = ctx.state.user.id
  const data = {user: userId, session: sessId, game: gameId}
  await redis('set', key, JSON.stringify(data))

  const sessKey = 'userSession:' + userId
  await redis('sadd', sessKey, sessId)

  ctx.redirect('/sessions/' + sessId)
})

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

let Speak = function(character, lines) {
  this.character = character
  this.lines = lines
}

Speak.prototype.render = function(characters) {
  let lines = this.lines.slice()
  lines[0] = characters[this.character].label + "「" + lines[0]
  lines[lines.length - 1] = lines[lines.length - 1] + "」"

  return E('p', {},
           E('img', {src: characters[this.character].image, style: "max-width: 15ex"}),
           E('br'),
           lines.slice(1).reduce((part, line) => {
             return part.concat([E('br'), line])
           }, [lines[0]]))
}

let GameSession = function(webState, sessionId) {
  if (!sessionId)
    throw new Error("sessionId not specified")

  this.webState = webState
  this.id = sessionId
}

async function setUserParam(session, param, value) {
  let key = "sessionParam:" + session.id;
  await redis('hset', key, param, value)
}

async function getUserParam(session, param) {
  let key = "sessionParam:" + session.id;
  return await redis('hget', key, param)
}

async function deleteAllUserParam(session) {
  let key = "sessionParam:" + session.id;
  return await redis('del', key)
}

async function addToUserParamSet(session, param, ...values) {
  if (values.length == 0)
    return
  let key = "sessionParamSet:" + param + ":" + session.id
  await redis('sadd', key, ...values)
}

async function isMemberOfUserParamSet(session, param, value) {
  let key = "sessionParamSet:" + param + ":" + session.id
  return await redis("sismember", key, value)
}

async function deleteUserParamSet(session, param) {
  let key = "sessionParamSet:" + param + ":" + session.id
  return await redis("del", key)
}

let gameCache = {}

async function loadGame(gameId) {
  if (gameCache[gameId])
    return gameCache[gameId]

  let sceneMap = {}
  let commands = {}

  let characters = {}

  commands.scene = (...args) => {
    let self = {
      linkedSceneSet: {}               // scene => true
    }
    let procs = []
    for (let i = 0; i < args.length; i ++) {
      let proc = args[i](self)
      if (proc)
        procs.push(proc)
    }

    self.display = async session => {
      let disp = []
      let actions = []

      await deleteUserParamSet(session, "accessibleStages")

      for (let i = 0; i < procs.length; i ++) {
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
      await addToUserParamSet(session, "accessibleStages", sceneMap[destScene].stage)

      let key = "currentScene-" + sceneMap[destScene].stage
      await setUserParam(session, key, destScene)
    }
  }
  commands.when = (param, ...content) => scene => {
    let valPromise = null
    if (param instanceof Function) {
      valPromise = param(scene)
    }

    let contentPromises = content.map(p => p(scene))

    return async (disp, actions, session) => {
      let val
      if (valPromise) {
        val = await valPromise(disp, actions, session)
      } else {
        val = await getUserParam(session, param)
      }

      if (val) {
        for (let i = 0; i < contentPromises.length; i ++) {
          await contentPromises[i](disp, actions, session)
        }
      }
    }
  }
  commands.not = param => scene => async (disp, actions, session) => {
    let val = await getUserParam(session, param)
    return (val == null) || (val == 0)
  }
  commands.action = (...content) => scene => {
    let contentPromises = content.map(p => p(scene))

    return async (disp, actions, session) => {
      let action = {}
      for (let i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](disp, actions, session))(action)
      }

      actions.push(action)
    }
  }
  commands.label = text => scene => async (disp, actions, session) => async action => {
    action.label = text
  }
  commands.after = (...content) => scene => async (disp, actions, session) => async action => {
    let hndlid = actionHandlerCount++
    action.id = hndlid

    let contentPromises = content.map(p => p(scene))

    actionHandlers[hndlid] = async ctx => {
      for (let i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](disp, actions, session))(action)
      }

      ctx.redirect(['/stage', session.id, scene.stage].join('/'))
    }
  }
  commands.flagUp = param => scene => async (disp, actions, session) => async action => {
    await setUserParam(session, param, 1)
  }
  commands.flagDown = param => scene => async (disp, actions, session) => {}
  commands.condition = param => scene => async (disp, actions, session) => {}

  let sceneCount = 0
  commands.intro = (...content) => scene => {
    let id = sceneCount ++
    let visitedKey = 'visited-' + id
    return async (disp, actions, session) => {
      let visited = await getUserParam(session, visitedKey)
      if (visited) {
      } else {
        await setUserParam(session, visitedKey, 1)
        for (let i = 0; i < content.length; i ++) {
          await content[i](scene)(disp, actions, session)
        }
      }
    }
  }

  if (gameId != 0)
    throw new Error("invalid game ID")

  let doc = yaml.safeLoad(await promisify(fs.readFile)('./data/island.yaml'))
  console.log(doc)

  let conv = elem => {
    if (typeof(elem) == 'string') {
      return elem
    }

    let keys = Object.keys(elem)
    if (keys.length == 1) {
      let key = keys[0]
      let func = commands[key]
      let content = elem[key]
      if (! (content instanceof Array)) {
        content = [content]
      }
      return func.apply(null, content.map(conv))
    } else {
      throw new Error("invalid elem " + keys)
    }
  }

  let sceneArray = doc.filter(e => e.scene).map(elem => conv(elem))
  console.log(sceneArray)

  let stagesElems = doc.filter(e => e.stages)
  if (stagesElems.length != 1)
    throw new Error("0 or more than 1 stages defined")

  let charactersElems = doc.filter(e => e.characters)
  if (charactersElems.length != 1)
    throw new Error("0 or more than 1 characters defined")
  characters = charactersElems[0].characters

  return gameCache[gameId] = {stages: stagesElems[0].stages, scenes: sceneArray}
}

async function makeStages(gameId) {
  let game = await loadGame(gameId)
  let stages = game.stages

  let scns = game.scenes.reduce((acc, cur, idx, arr) => {acc[cur.name] = arr[idx]; return acc}, {})
  let stageDisplays = {}

  for (let s in scns) {
    let scene = scns[s]
    let stage = scene.stage;
    ((scene, stage, prevDisplay) => {
      if (!prevDisplay) {
        stageDisplays[stage] = scene.display
      } else {
        stageDisplays[stage] = async session => {
          let key = "currentScene-" + stage
          let curScene = await getUserParam(session, key)
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

  for (let s in stages) {
    stages[s].display = stageDisplays[s]
    stages[s].moves = Object.keys(stages[s].moves.reduce((part, cur) => {part[cur] = true; return part}, {}))
  }

  return stages
}

let stagesCache = {}
async function stages(gameId) {
  if (!stagesCache[gameId])
    stagesCache[gameId] = await makeStages(gameId)

  return stagesCache[gameId]
}

async function stageTitle(gameId, id) {
  return (await stages(gameId))[id].name;
}

async function asyncMap(arr, asyncFunc) {
  let dest = []
  for (let i = 0; i < arr.length; i++) {
    dest.push(await asyncFunc(arr[i]))
  }
  return dest
}

async function asyncFilter(arr, asyncFunc) {
  let proms = arr.map(obj => {
    return asyncFunc(obj)
  })
  let dest = []
  for (let i = 0; i < arr.length; i ++) {
    if (await proms[i]) {
      dest.push(arr[i])
    }
  }
  return dest
}

async function stageMoveOptions(gameId, id, session) {
  let list = (await stages(gameId))[id].moves || []
  let stagesFiltered = await asyncFilter(list, async function(id) {
    return await isMemberOfUserParamSet(session, "accessibleStages", id) == 1
  })

  return await asyncMap(stagesFiltered, async id => {
    return {id: id, name: (await stages(gameId))[id].name}
  })
}

router.get('/stage/:sessId', async ctx => {
  const sessId = ctx.params.sessId
  const key = 'session:' + sessId
  const sess = JSON.parse(await redis('get', key))
  const gameId = sess.game

  console.log('session', sess)

  const session = new GameSession(ctx.state, sessId)
  let currentStage = await getUserParam(session, '__currentStage')

  if (!currentStage) {
    const game = await loadGame(gameId)
    currentStage = game.scenes[0].stage
  }

  ctx.redirect(['/stage', sessId, currentStage].join('/'))
})

router.get('/stage/:sessId/:stageid', async ctx => {
  let sessId = ctx.params.sessId
  let id = ctx.params.stageid
  let key = 'session:' + sessId
  const sess = JSON.parse(await redis('get', key))
  const gameId = sess.game

  let title = await stageTitle(sess.game, id)
  let session = new GameSession(ctx.state, sessId)

  await setUserParam(session, '__currentStage', id)

  let disp = await (await stages(gameId))[id].display(session)
  let moves = await stageMoveOptions(gameId, id, session)

  ctx.body = await constructPage(
    ctx,
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
          return E("li", {}, E("a", {href: ['/stage', session.id, stage.id].join('/')}, stage.name + 'へ行く'));
        }))(doc)
      } else {
        return []
      }
    }
  )
})

let actionHandlers = {};
let actionHandlerCount = 0;

router.post('/action/:id', async ctx => {
  let id = ctx.params.id;
  let action = actionHandlers[id];
  if (action) {
    await action(ctx);
  }
});

app.listen(3000);
