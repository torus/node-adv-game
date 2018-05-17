"use strict"

const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const passport = require('koa-passport');
const Strategy = require('passport-facebook').Strategy;

const { Client } = require('pg')
const pgClient = new Client()

pgClient.connect()

const yaml = require('js-yaml')
const fs = require('fs')

const randomstring = require("randomstring")
const rp = require('request-promise')
const semver = require('semver')
const merge = require('merge')
const camelCase = require('camelcase')

const bodyParser = require('koa-bodyparser')
app.use(bodyParser())

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

  let userId = null
  let error = null

  try {
    if (prefix == 'facebook') {
      const res = await pgClient.query('SELECT "user" from accounts_facebook')
      if (res.rowCount > 0)
        userId = res.rows[0].user
    } else {
      throw new Error('unknown auth provider: ' + prefix)
    }

    if (userId == null) {
      while (true) {
        let done = true
        userId = randomstring.generate(12)
        try {
          await pgClient.query('INSERT INTO users (id, display_name) VALUES ($1, $2)', [userId, name])
        } catch (e) {
          done = false
        }

        if (done) break
      }
      await pgClient.query('INSERT INTO accounts_facebook (facebook_id, "user") VALUES ($1, $2)',
                           [id, userId])
    }
  } catch(e) {
    error = e
  }
  cb(error, userId)
})

passport.deserializeUser(async function(id, cb) {
  console.log("deserializeUser", id)

  const res = await pgClient.query('SELECT * FROM users WHERE id = $1', [id])
  console.log('res.rows[0]', res.rows[0])
  if (res.rowCount == 1) {
    const row = res.rows[0]
    const data = Object.keys(row).reduce((acc, cur) => {acc[camelCase(cur)] = row[cur]; return acc}, {})
    console.log('convert', row, data)
    cb(null, data)
  } else {
    console.log('Invalid user?', id)
    console.log(res)
    cb(null, false)
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
               E('a', {class: "dropdown-item", href: "/users/" + ctx.state.user.id}, 'Profile'),
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

function localize(lang, word) {
  if (lang == 'en') {
    return (...arg) => [word, ...arg]
  } else {
    return {
      ja: {
        "Games": () => 'ゲーム',
        "Playlist": () => 'プレイリスト',
        "Help": () => 'ヘルプ',
        'Welcome to the Adventure Bookshelves!': () => 'Adventure Bookshelves へようこそ！',
        'Continue Game': () => '続きから遊ぶ',
        'Start a New Game': () => '初めから遊ぶ',
        "log in with Facebook": () => 'Facebook でログイン',
        "Logout": () => 'ログアウト',
        "You are successfully logged out. ": () => 'ログアウトできました。',
        "Log in with Facebook again": () => 'もう一度 Facebook でログイン',
        " or ": () => 'または',
        "Back to Home.": () => 'ホームに戻る',
        "Logging in with Facebook": () => 'Facebook でログイン中',
        "Logging in with Facebook. Be patient...": () => 'Facebook でログイン中です。しばらくお待ちください。',
        'Your games': () => '自分のゲーム',
        'Create a New Game': () => '新しくゲームを作る',
        'Scenario YAML URL': () => 'シナリオ YAML URL',
        'Make sure you specify a "raw" URL.': () => '"raw" URL を指定してください。',
        'Submit': () => '送信',
        'Games by ': name => [name, 'のゲーム'],
        'Profile': () => 'プロフィール',
        'Published by ': name => [name, '発行'],
        'New Game': () => 'はじめから遊ぶ',
        'Unpublish': () => '非公開にする',
        'Publish': () => '公開する',
        'Update': () => '更新',
        'Version Error': () => 'バージョンエラー',
        'Please specify a higher version number than the latest one: '
        : () => '最新坂よりも大きなバージョン番号を指定してください：',
        'Return to ': elem => [elem, 'へ戻る'],
        "Session": () => 'セッション',
        "Start Playing": () => '始める',
        'Publisher Name': () => '発行者名',
        'Save': () => '保存',
      }
    }[lang][word]
  }
}

async function constructPage(ctx, title, ...content) {
  const loc = orig => localize('ja', orig)()
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
                      E('a', {class: "nav-link", href: "/games"}, loc("Games"))),
                    E('li', {class: "nav-item"},
                      E('a', {class: "nav-link", href: "/sessions"}, loc("Playlist"))),
                    E('li', {class: "nav-item"},
                      E('a', {class: "nav-link", href: 'https://github.com/torus/node-adv-game/wiki'},
                        loc("Help")))),
                  await accountMenu(ctx))),
              E('div', {class: 'container'},
                E('div', {style: 'min-height:20ex'},
                  content),
                E('footer', {},
                  E('hr'),
                  E('p', {},
                    'Adventure Bookshelves by ',
                    E('a', {href: 'https://twitter.com/torus'}, '@torus'),
                    ' / ',
                    E('a', {href: 'https://github.com/torus/node-adv-game'}, 'GitHub'))))))
  let doc = new E.libxml.Document();
  return "<!DOCTYPE html>" + e(doc).toString();
}

router.get('/', async ctx => {
  const loc = orig => localize('ja', orig)()
  ctx.body = await constructPage(
    ctx,
    'Adventure Bookshelves',
    E('h1', {}, loc('Welcome to the Adventure Bookshelves!')),
    doc => {
      if (ctx.isAuthenticated()) {
        return E('ul', {},
                 E('li', {},
                   E('a', {href: '/sessions'}, loc('Continue Game'))),
                 E('li', {},
                   E('a', {href: '/games'}, loc('Start a New Game'))))
      } else {
        return E('p', {},
                 E('a', {href: "/login/facebook"}, loc("log in with Facebook")))
      }
    }
  )
})

router.get('/logout', async ctx => {
  const loc = orig => localize('ja', orig)()
  if (ctx.isAuthenticated()) {
    ctx.logout();
  }
  ctx.body = await constructPage(
    ctx,
    loc("Logout"),
    E('p', {},
      loc("You are successfully logged out. "),
      E('a', {href: "/login/facebook"}, loc("Log in with Facebook again")),
      loc(" or "),
      E('a', {href: "/"}, loc("Back to Home."))));
})

router.get('/login/facebook', async ctx => {
  const loc = orig => localize('ja', orig)()
  ctx.body = await constructPage(
    ctx,
    loc("Logging in with Facebook"),
    E('p', {},
      loc("Logging in with Facebook. Be patient...")),
    E('script', {}, "location.href = '/login/facebook/real'"));
})

router.get('/login/facebook/real', passport.authenticate('facebook'))

router.get('/login/facebook/return',
           passport.authenticate('facebook', {
             successRedirect: '/',
             failureRedirect: '/'
           })
          )

router.get('/games', async ctx => {
  const loc = orig => localize('ja', orig)()

  const res = await pgClient.query(
    'SELECT id, title, updated_at FROM scenarios WHERE is_published ORDER BY updated_at DESC LIMIT 10')
  const scenarios = res.rows

  ctx.body = await constructPage(
    ctx,
    loc('Games'),
    E('h1', {}, loc('Games')),
    E('ul', {},
      scenarios.map(g => E('li', {}, E('a', {href: "/games/" + g.id}, g.title)))),
    E('p', {}, E('a', {href: ['/games', 'byPublisher', ctx.state.user.id].join('/')}, loc('Your games'))))
})

router.get('/games/create', async ctx => {
  const loc = orig => localize('ja', orig)()
  ctx.body = await constructPage(
    ctx,
    loc('Create a New Game'),
    E('h1', {}, loc('Create a New Game')),
    E('form', {method: 'post', action: '/games'},
      E('div', {class: 'form-group'},
        E('label', {'for': 'inputURL'}, loc('Scenario YAML URL')),
        E('input', {type: 'text', class: 'form-control', id: 'inputURL', name: 'url',
                    'aria-describedby': 'URLHelp',
                    placeholder: 'https://raw.githubusercontent.com/torus/node-adv-game/master/data/island.yaml'}),
        E('small', {id: 'URLHelp', class: 'form-text text-muted'},
          loc('Make sure you specify a "raw" URL.'))),
      E('button', {type: 'submit', class: 'btn btn-primary'}, loc('Submit')))
  )
})

router.post('/games', async ctx => {
  const url = ctx.request.body.url
  console.log('loading a scenario', url)

  let id, key

  const doc = yaml.safeLoad(await rp(url))
  const date = Date.now()

  const scenario = extractPackageFromYaml(doc)
  const title = scenario.title
  const desc = scenario.desc
  const ver = scenario.version
  const publisherId = ctx.state.user.id

  while (true) {
    let done = true
    id = randomstring.generate(12)
    try {
      await pgClient.query(
        'INSERT INTO scenarios (id, title, description, updated_at, publisher, version, url, is_published) '
          + 'VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
        [id, title, desc, new Date(), publisherId, ver, url, false])
    } catch (e) {
      done = false
    }

    if (done) break
  }

  ctx.redirect('/games')
})

async function getPublisherName(userId) {
  console.log('getPublisherName', userId)

  const res = await pgClient.query('SELECT display_name FROM users WHERE id = $1', [userId])
  return res.rows[0].display_name
}

router.get('/games/byPublisher/:publisherId', async ctx => {
  const loc1 = orig => localize('ja', orig)
  const loc = orig => loc1(orig)()
  const publisherId = ctx.params.publisherId
  const userId = ctx.state.user.id

  const res = await (publisherId == userId
                     ? pgClient.query('SELECT id, title FROM scenarios WHERE publisher = $1', [publisherId])
                     : pgClient.query('SELECT id, title FROM scenarios WHERE publisher = $1 AND is_published',
                                      [publisherId]))

  ctx.body = await constructPage(
    ctx,
    loc('Games'),
    E('h1', {}, loc1('Games by ')(await getPublisherName(publisherId))),
    E('ul', {},
      res.rows.map(g => E('li', {}, E('a', {href: "/games/" + g.id}, g.title)))),
    E('p', {}, E('a', {href: '/users/' + publisherId}, loc('Profile'))))
})

router.get('/games/:gameid', async ctx => {
  const loc1 = orig => localize('ja', orig)
  const loc = orig => loc1(orig)()
  const gameId = ctx.params.gameid

  const res = await pgClient.query(
    'SELECT title, publisher, description, is_published, url FROM scenarios WHERE id = $1', [gameId])
  const scenario = res.rows[0]

  ctx.body = await constructPage(
    ctx,
    scenario.title,
    E('h1', {}, scenario.title),
    E('p', {}, loc1('Published by ')(await getPublisherName(scenario.publisher))),
    E('p', {}, scenario.description),
    E('form', {method: 'post', action: '/sessions'},
      E('input', {type: 'hidden', name: 'gameId', value: gameId}),
      E('p', {}, E('button', {type: "submit", "class": "btn btn-primary"}, loc('New Game')))),

    doc => {
      if (scenario.publisher == ctx.state.user.id) {
        return E('div', {class: 'row'},
                 E('div', {class: 'col'},
                   E('h2', {}, 'Overview'),
                   E('table', {class: 'table', style: 'overflow: hidden'},
                     E('tbody', {},
                       Object.keys(scenario).reduce((part, key) => {
                         part.push(E('tr', {},
                                     E('th', {scope: 'row'}, key),
                                     E('td', {}, scenario[key].toString())))
                         return part
                       }, []))),
                   E('form', {method: 'post', action: '/games/' + gameId},
                     E('div', {class: 'form-group'},
                       scenario.is_published
                       ? E('button', {type: 'submit', class: 'btn btn-danger', name: 'published',
                                      value: 'false'}, loc('Unpublish'))
                       : E('button', {type: 'submit', class: 'btn btn-primary', name: 'published',
                                      value: 'true'}, loc('Publish'))
                      )),

                   E('h2', {}, loc('Update')),
                   E('form', {method: 'post', action: '/games/' + gameId},
                     E('div', {class: 'form-group'},
                       E('label', {'for': 'inputURL'}, loc('Scenario YAML URL')),
                       E('input', {type: 'text', class: 'form-control', id: 'inputURL', name: 'url',
                                   'aria-describedby': 'URLHelp',
                                   value: scenario.url}),
                       E('small', {id: 'URLHelp', class: 'form-text text-muted'},
                         loc('Make sure you specify a "raw" URL.'))),
                     E('button', {type: 'submit', class: 'btn btn-primary', name: 'update',
                                  value: 'true'}, loc('Update')))))
      } else {
        return []
      }
    }
  )
})

function extractPackageFromYaml(doc) {
  return doc[0].package.reduce(merge, {})
}

router.post('/games/:gameId', async ctx => {
  const loc1 = orig => localize('ja', orig)
  const loc = orig => loc1(orig)()

  const gameId = ctx.params.gameId
  const params = ctx.request.body
  const publisherId = ctx.state.user.id
  const updated = false

  const res = await pgClient.query('SELECT version, is_published FROM scenarios WHERE id = $1', [gameId])
  const scenario = res.rows[0]

  if (params.update) {
    const url = params.url

    const doc = yaml.safeLoad(await rp(url))
    console.log('doc', doc[0])
    const newScenario = extractPackageFromYaml(doc)
    console.log('newScenario', newScenario)
    const ver = newScenario.version
    if (semver.gt(ver, scenario.version) || !scenario.is_published && semver.eq(ver, scenario.version)) {
      const date = Date.now()

      const title = newScenario.title
      const desc = newScenario.desc
      const publisherId = ctx.state.user.id

      while (true) {
        let done = true
        try {
          await pgClient.query(
            'UPDATE scenarios SET id = $1, title = $2, description = $3, updated_at = $4, ' +
              'publisher = $5, version = $6, url = $7, is_published = $8',
            [gameId, title, desc, new Date(), publisherId, ver, url, false])
        } catch (e) {
          done = false
        }

        if (done) break
      }

      delete gameCache[gameId]
    } else {
      ctx.body = await constructPage(
        ctx,
        loc('Version Error'),
        E('h1', {}, loc('Version Error')),
        E('p', {}, loc('Please specify a higher version number than the latest one: '), scenario.version),
        E('p', {}, loc1('Return to ')(E('a', {href: ['/games', gameId].join('/')}, scenario.title)))
      )
      return
    }
  }

  if (params.published) {
    await pgClient.query(
      'UPDATE scenarios SET is_published = $1', [JSON.parse(params.published)])
  }

  ctx.redirect(['/games', gameId].join('/'))
})

router.get('/sessions/:sessId', async ctx => {
  const loc1 = orig => localize('ja', orig)
  const loc = orig => loc1(orig)()

  const sessId = ctx.params.sessId
  const res = await pgClient.query(
    'SELECT sc.title FROM sessions se JOIN scenarios sc ON (se.scenario = sc.id) WHERE se.id = $1',
    [sessId])
  const scenario = res.rows[0]

  ctx.body = await constructPage(
    ctx,
    loc("Session"),
    E('h1', {}, scenario.title),
    E('p', {}, E('a', {href: ['/stage', sessId].join('/')}, loc("Start Playing"))))
})

router.get('/sessions', async ctx => {
  const loc1 = orig => localize('ja', orig)
  const loc = orig => loc1(orig)()

  const userId = ctx.state.user.id

  console.log('userId', userId)

  const res = await pgClient.query(
    'SELECT se.id AS sid, sc.title, sc.version, st.updated_at AS update FROM sessions se JOIN scenarios sc ' +
      'ON (se.scenario = sc.id) JOIN current_stages st ON (st.session = se.id) WHERE se.user = $1 ORDER BY st.updated_at DESC',
    [userId])
  const sessions = res.rows

  ctx.body = await constructPage(
    ctx,
    loc('Playlist'),
    E('h1', {}, loc('Continue Game')),
    E('ul', {},
      sessions.map(ent => E('li', {},
                            E('a', {href: ['/sessions', ent.sid].join('/')},
                              ent.title, ' (ver. ', ent.version, ') ',
                              ent.update ? ent.update.toString() : '-'
                             )))))
})

router.post('/sessions', async ctx => {
  let gameId = ctx.request.body.gameId
  console.log('sessions', gameId)

  const userId = ctx.state.user.id
  let id

  while (true) {
    let done = true
    id = randomstring.generate(12)
    try {
      await pgClient.query('INSERT INTO sessions (id, "user", scenario) VALUES ($1, $2, $3)',
                           [id, userId, gameId])
    } catch (e) {
      done = false
    }

    if (done) break
  }

  ctx.redirect('/sessions/' + id)
})

function textListToElements(list) {
  const flatten = list.map(line => line.split(/\n/)).reduce((part, lines) => part.concat(lines)).
        filter(line => line.length > 0)
  console.log('flatten', flatten)
  return E('p', {}, flatten.slice(1).reduce((part, line) => {
    return part.concat([E('br'), line])
  }, [flatten[0]]))
}

let Speak = function(character, lines) {
  this.character = character
  const flatten = lines.map(line => line.split(/\n/)).reduce((part, lines) => part.concat(lines)).
        filter(line => line.length > 0)
  this.lines = flatten
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
  await pgClient.query('BEGIN')
  await pgClient.query('DELETE FROM session_states WHERE session = $1 AND key = $2', [session.id, param])
  await pgClient.query('INSERT INTO session_states (session, key, value) VALUES ($1, $2, $3)',
                       [session.id, param, value])
  await pgClient.query('COMMIT')
}

async function getUserParam(session, param) {
  const res = await pgClient.query('SELECT value FROM session_states WHERE session = $1 AND key = $2',
                                   [session.id, param])
  if (res.rowCount > 0) {
    return res.rows[0].value
  } else {
    return null
  }
}

let gameCache = {}

const GameRuntime = function() {
  this.inst = []
}

GameRuntime.prototype.addInstruction = function(command, ...args) {
  this.inst.push([command, ...args])
}

function sceneCommands() {
  let sceneMap = {}
  let sceneCmd = {}

  sceneCmd.scene = (...args) => {
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
      const runtime = new GameRuntime()

      for (let i = 0; i < procs.length; i ++) {
        await procs[i](runtime, session)
      }
      return runtime
    }

    sceneMap[self.name] = self

    return self
  }

  sceneCmd.name = name => scene => {scene.name = name; return async (runtime, session) => {
    console.log("scene", name)
  }}
  sceneCmd.stage = stage => scene => {scene.stage = stage; return async (runtime, session) => {}}
  sceneCmd.desc = (...texts) => scene => async (runtime, session) => {
    runtime.addInstruction('desc', texts)
  }
  sceneCmd.speak = (actor, ...texts) => scene => async (runtime, session) => {
    // console.log('runtime', runtime)
    runtime.addInstruction('speak', actor, texts)
  }
  sceneCmd.link = destScene => scene => {
    scene.linkedSceneSet[destScene] = true
    return async (runtime, session) => {

      let key = "currentScene-" + sceneMap[destScene].stage
      await setUserParam(session, key, destScene)

      runtime.addInstruction('link', sceneMap[destScene].stage)

      // for action handling
      return action => {}
    }
  }
  sceneCmd.when = (param, ...content) => scene => {
    let valPromise = null
    if (param instanceof Function) {
      valPromise = param(scene)
    }

    let contentPromises = content.map(p => p(scene))

    return async (runtime, session) => {
      let val
      if (valPromise) {
        val = await valPromise(runtime, session)
      } else {
        val = await getUserParam(session, param)
      }

      if (val == 1) {
        for (let i = 0; i < contentPromises.length; i ++) {
          await contentPromises[i](runtime, session)
        }
      }
    }
  }
  sceneCmd.not = param => scene => async (runtime, session) => {
    let val = await getUserParam(session, param)
    return (val == null) || (val == 0)
  }
  sceneCmd.action = (...content) => scene => {
    let contentPromises = content.map(p => p(scene))

    return async (runtime, session) => {
      let action = {}
      for (let i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](runtime, session))(action)
      }

      runtime.addInstruction('action', action)
    }
  }
  sceneCmd.label = text => scene => async (runtime, session) => async action => {
    action.label = text
  }
  sceneCmd.after = (...content) => scene => async (runtime, session) => async action => {
    let hndlid = actionHandlerCount++
    action.id = hndlid

    let contentPromises = content.map(p => p(scene))

    actionHandlers[hndlid] = async ctx => {
      console.log('actionHandlers', hndlid, action)
      for (let i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](runtime, session))(action)
      }

      ctx.redirect(['/stage', session.id, scene.stage].join('/'))
    }
  }
  sceneCmd.flagUp = param => scene => async (runtime, session) => async action => {
    await setUserParam(session, param, 1)
  }
  sceneCmd.flagDown = param => scene => async (runtime, session) => async action => {
    await setUserParam(session, param, 0)
  }
  sceneCmd.condition = param => scene => async (runtime, session) => {}

  let sceneCount = 0
  sceneCmd.intro = (...content) => scene => {
    let id = sceneCount ++
    let visitedKey = 'visited-' + id
    return async (runtime, session) => {
      let visited = await getUserParam(session, visitedKey)
      if (visited) {
      } else {
        await setUserParam(session, visitedKey, 1)
        for (let i = 0; i < content.length; i ++) {
          await content[i](scene)(runtime, session)
        }
      }
    }
  }

  return sceneCmd
}

function converterFromCommands(commands) {
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

  return conv
}

function makeSubCommands(cmd, ...keys) {
  function mkFunc(command, key) {
    command[key] = arg => obj => {obj[key] = arg}
  }

  keys.forEach(key => {
    mkFunc(cmd, key)
  })
}

function makeCommand(destMap) {
  return (...args) => {
    const self = {}
    args.forEach(arg => arg(self))
    destMap[self.name] = self
  }
}

function stageCommands(stageMap) {
  const cmd = {}
  cmd.stage = makeCommand(stageMap)
  makeSubCommands(cmd, 'name', 'label')
  return cmd
}

function characterCommands(charMap) {
  const cmd = {}
  cmd.character = makeCommand(charMap)
  makeSubCommands(cmd, 'name', 'label', 'image')
  return cmd
}

function packageCommands(packageMap) {
  const cmd = {}
  cmd.package = makeCommand(packageMap)
  makeSubCommands(cmd, 'title', 'desc', 'version', 'credit')
  return cmd
}

async function loadGame(gameId) {
  if (gameCache[gameId])
    return gameCache[gameId]

  const res = await pgClient.query('SELECT url FROM scenarios WHERE id = $1', [gameId])
  const url = res.rows[0].url

  console.log('loading from URL:', url)
  let doc = yaml.safeLoad(await rp(url))

  const stageMap = {}
  const stgConv = converterFromCommands(stageCommands(stageMap))
  doc.filter(e => e.stage).map(stgConv)

  const charMap = {}
  const chrConv = converterFromCommands(characterCommands(charMap))
  doc.filter(e => e.character).map(chrConv)

  const packageInfo = {}
  const pkgConv = converterFromCommands(packageCommands(packageInfo))
  doc.filter(e => e.package).map(pkgConv)
  // console.log('packageInfo', packageInfo)

  const conv = converterFromCommands(sceneCommands())
  let sceneArray = doc.filter(e => e.scene).map(elem => conv(elem))

  makeStages(stageMap, sceneArray)

  return gameCache[gameId] = {stages: stageMap, package: packageInfo, characters: charMap,
                              firstStage: sceneArray[0].stage}
}

async function makeStages(stages, scenes) {
  let scns = scenes.reduce((acc, cur, idx, arr) => {acc[cur.name] = arr[idx]; return acc}, {})
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
    }) (scene, stage, stageDisplays[stage])
  }

  for (let s in stages) {
    stages[s].display = stageDisplays[s]
  }

  return stages
}

async function allStages(gameId) {
  return (await loadGame(gameId)).stages
}

async function stageTitle(gameId, id) {
  return (await allStages(gameId))[id].label;
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

async function characters(gameId) {
  return (await loadGame(gameId)).characters
}

async function firstStage(gameId) {
  return (await loadGame(gameId)).firstStage
}

router.get('/stage/:sessId', async ctx => {
  const sessId = ctx.params.sessId
  const res = await pgClient.query('SELECT scenario FROM sessions WHERE id = $1', [sessId])
  const gameId = res.rows[0].scenario

  let currentStage = false

  const session = new GameSession(ctx.state, sessId)
  const res2 = await pgClient.query('SELECT stage FROM current_stages WHERE session = $1', [sessId])
  if (res2.rowCount > 0) {
    currentStage = res2.rows[0].stage
  } else {
    currentStage = await firstStage(gameId)
    await pgClient.query('INSERT INTO current_stages (session, stage, updated_at) VALUES ($1, $2, now())',
                         [sessId, currentStage])
  }

  ctx.redirect(['/stage', sessId, currentStage].join('/'))
})

router.get('/stage/:sessId/:stageid', async ctx => {
  let sessId = ctx.params.sessId
  let id = ctx.params.stageid

  const res = await pgClient.query('SELECT scenario FROM sessions WHERE id = $1', [sessId])
  const gameId = res.rows[0].scenario

  let title = await stageTitle(gameId, id)
  let chars = await characters(gameId)
  let session = new GameSession(ctx.state, sessId)

  await pgClient.query('UPDATE current_stages SET stage = $1, updated_at = now() WHERE session = $2',
                       [id, sessId])

  let stages = await allStages(gameId)
  let runtime = await stages[id].display(session)

  let disp = []
  let actions = []
  let moves = []
  runtime.inst.forEach(inst => {
    ({
      desc: lines => {
        disp.push(textListToElements(lines))
      },
      speak: (actor, texts) => {
        disp.push(new Speak(actor, texts).render(chars))
      },
      link: stage => {
        console.log('stage', stage)
        moves.push(stages[stage])
      },
      action: action => {
        console.log('action', action)
        actions.push(action)
      }
    })[inst[0]].apply(null, inst.slice(1))
  })

  ctx.body = await constructPage(
    ctx,
    title,
    E("h1", {}, title),
    disp,
    doc => {
      if (actions.length > 0) {
        return E("ul", {id: "actionList"}, actions.map(action => {
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
          console.log('stage', stage)
          return E("li", {}, E("a", {href: ['/stage', session.id, stage.name].join('/')}, stage.label + 'へ行く'));
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
  let id = ctx.params.id
  let action = actionHandlers[id]
  if (action) {
    await action(ctx)
    delete actionHandlers[id]
  }
})

router.get('/users/:userId', async ctx => {
  const loc1 = orig => localize('ja', orig)
  const loc = orig => loc1(orig)()

  const userId = ctx.params.userId

  const displayName = await getPublisherName(userId)

  const form =
        userId == ctx.state.user.id
        ? [
          E('hr'),
          E('form', {method: 'post', action: '/users/' + userId},
            E('div', {class: 'form-group'},
              E('label', {'for': 'inputName'}, loc('Publisher Name')),
              E('input', {type: 'text', class: 'form-control', id: 'inputName', name: 'displayName',
                          value: displayName})),
            E('button', {type: 'submit', class: 'btn btn-primary', name: 'save', value: 'true'},
              loc('Save'))),
          E('hr'),
          E('p', {}, E('a', {href: '/games/create'}, loc('Create a New Game')))]
        : []

  ctx.body = await constructPage(
    ctx,
    displayName,
    E('h1', {}, displayName),
    E('p', {}, E('a', {href: ['/games', 'byPublisher', ctx.state.user.id].join('/')},
                 loc1('Games by ')(displayName))),
    ...form
  )
})

router.post('/users/:userId', async ctx => {
  const userId = ctx.params.userId

  if (userId == ctx.state.user.id) {
    const displayName = ctx.request.body.displayName
    await pgClient.query('UPDATE users SET display_name = $1 WHERE id = $2', [displayName, userId])
  }

  ctx.redirect('/users/' + userId)
})

async function setupDatabase() {
  console.log('Setting up Database.')

  const stats = yaml.safeLoad(fs.readFileSync('schema.yaml'))
  for (let i = 0; i < stats.length; i ++) {
    let stat = stats[i]
    console.log('Executing:')
    console.log(stat)

    try {
      await pgClient.query(stat)
    } catch (e) {
      console.log('Error during execution of SQL statement:')
      console.log(e.message)
    }
  }
}

setupDatabase().then(() => {
  console.log('Starting server.')
  app.listen(3000);
})
