"use strict"

const Koa = require('koa');
const Router = require('koa-router');

const app = new Koa();
const router = new Router();

const passport = require('koa-passport');
const Strategy = require('passport-facebook').Strategy;

const pg = require('pg')
const pgClient = new pg.Client()

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

app.use(require('koa-static')('./static'))

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
        'Game': () => 'ゲーム',
        'Last Updated': () => '最終更新'
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
                href: "https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/css/bootstrap.min.css",
                integrity: "sha384-WskhaSGFgHYWDcbwN70/dfYBj47jz9qbsMId/iRN3ewGhXQFZCSftd1LZCfmhktB",
                crossorigin: "anonymous"
              }),
              E('script', {
                src: "https://code.jquery.com/jquery-3.3.1.slim.min.js",
                integrity: "sha384-q8i/X+965DzO0rT7abK41JStQIAqVgRVzpbzo5smXKp4YfRvH+8abtTE1Pi6jizo",
                crossorigin: "anonymous"
              }, " "),
              E('script', {
                src: "https://cdnjs.cloudflare.com/ajax/libs/popper.js/1.14.3/umd/popper.min.js",
                integrity: "sha384-ZMP7rVo3mIykV+2+9J3UJ46jBk0WLaUAdn689aCwoqbBJiSnjAK/l8WvCWPIPm49",
                crossorigin: "anonymous"
              }, " "),
              E('script', {
                src: "https://stackpath.bootstrapcdn.com/bootstrap/4.1.1/js/bootstrap.min.js",
                integrity: "sha384-smHYKdLADwkXOn1EmN1qk/HfnUcbVRZyYmZ4qpPea6sjB/pTJ0euyQp0Mk8ck+5T",
                crossorigin: "anonymous"
              }, " "),
              E('link', {
                rel: "stylesheet",
                href: "/adv.css"
              }),
              E('script', {src: "/script.js"}, ' '),
              E('title', {}, title)),

            E('body', {style: "padding-top: 5rem"},
              E('nav', {class: "navbar navbar-expand-md navbar-light bg-light fixed-top"},
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
    E('table', {class: 'table'},
      E('thead', {},
        E('tr', {},
          E('th', {scope: 'col'}, loc('Game')),
          E('th', {scope: 'col'}, loc('Last Updated')))),
      sessions.map(ent => E('tr', {},
                            E('td', {},
                              E('a', {href: ['/sessions', ent.sid].join('/')}, ent.title)),
                            E('td', {},
                              (u => u ? u.toLocaleString() : '-')(ent.update))))))
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
  return E('div', {class: 'row adv-one-by-one'},
           E('div', {class: 'col-1'}, ' '),
           E('div', {class: 'col'},
             E('p', {},
               flatten.slice(1).reduce((part, line) => {
                 return part.concat([E('br'), line])
               }, [flatten[0]]))
            ))
}

let Speak = function(character, lines) {
  this.character = character
  const flatten = lines.map(line => line.split(/\n/)).reduce((part, lines) => part.concat(lines)).
        filter(line => line.length > 0)
  this.lines = flatten
}

Speak.prototype.render = function(characters) {
  let lines = this.lines.slice()
  let charName = characters[this.character].label

  return E('div', {class: 'row adv-one-by-one'},
           E('div', {class: 'col-2', style: 'text-align: center'},
             E('img', {src: characters[this.character].image, style: 'max-width: 5ex'}),
             E('br', {}),
             charName),
           E('div', {class: 'col', style: 'border-witdh: 1px; border: solid gray; border-radius: 10px'},
             lines.slice(1).reduce((part, line) => {
               return part.concat([E('br'), line])
             }, [lines[0]])))
}

let GameSession = function(webState, sessionId) {
  if (!sessionId)
    throw new Error("sessionId not specified")

  this.webState = webState
  this.id = sessionId
}

let gameCache = {}

const {converterFromCommands, sceneCommands, packageCommands, characterCommands, stageCommands, actionHandlers, getUserParam} = require('./scenario')(pgClient)

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
    E('div', {class: 'row adv-next-button-row'},
      E('div', {class: 'col adv-next-button-col'},
        E("button", {type: 'button', class: 'btn btn-light'}, '▼'))),
    E('div', {class: 'row adv-options'},
      E('div', {class: 'col'},
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
        }))
  )
})

router.post('/action/:id', async ctx => {
  let id = ctx.params.id
  let action = actionHandlers[id]
  if (!action)
    throw new Error("No action defined. Maybe, accessed twice?")

  const {runtime, session, stage, label} = await action(ctx)
  delete actionHandlers[id]

  const title = label
  const res = await pgClient.query('SELECT scenario FROM sessions WHERE id = $1', [session.id])
  const gameId = res.rows[0].scenario
  const stages = await allStages(gameId)
  const chars = await characters(gameId)

  let disp = []
  let moves = []
  let nextStage = stage.name
  runtime.inst.forEach(inst => {
    ({
      desc: lines => {
        disp.push(textListToElements(lines))
      },
      speak: (actor, texts) => {
        disp.push(new Speak(actor, texts).render(chars))
      },
      link: stage => {
        console.log('next stage', stage)
        nextStage = stage
      }
    })[inst[0]].apply(null, inst.slice(1))
  })

  const link = ['/stage', session.id, nextStage].join('/')

  if (disp.length > 0) {
    ctx.body = await constructPage(
      ctx,
      title,
      E("h1", {}, title),
      disp,
      E('div', {class: 'row adv-next-button-row'},
        E('div', {class: 'col adv-next-button-col'},
          E("button", {type: 'button', class: 'btn btn-light'}, '▼'))),
      E('div', {class: 'row adv-options'},
        E('div', {class: 'col adv-next-button-col'},
          E("a", {class: 'btn btn-light', href: link}, '▼')))
    )
  } else {
    ctx.redirect(link)
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
