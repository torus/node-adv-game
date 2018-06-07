let db = null

const GameRuntime = function() {
  this.inst = []
}

GameRuntime.prototype.addInstruction = function(command, ...args) {
  this.inst.push([command, ...args])
}

const actionHandlers = {};
let actionHandlerCount = 0;

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
    return action => {}
  }
  sceneCmd.speak = (actor, ...texts) => scene => async (runtime, session) => {
    // console.log('runtime', runtime)
    runtime.addInstruction('speak', actor, texts)
    return action => {}
  }
  sceneCmd.link = destScene => scene => {
    scene.linkedSceneSet[destScene] = true
    return async (runtime, session) => {

      let key = "currentScene-" + sceneMap[destScene].stage
      await db.set(session, key, destScene)

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
        val = await db.get(session, param)
      }

      if (val == 1) {
        for (let i = 0; i < contentPromises.length; i ++) {
          await contentPromises[i](runtime, session)
        }
      }
    }
  }
  sceneCmd.not = param => scene => async (runtime, session) => {
    let val = await db.get(session, param)
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
      const runtime = new GameRuntime()
      console.log('actionHandlers', hndlid, action)
      for (let i = 0; i < contentPromises.length; i ++) {
        await (await contentPromises[i](runtime, session))(action)
      }

      return {runtime: runtime, session: session, stage: scene.stage, label: action.label}
    }
  }
  sceneCmd.flagUp = param => scene => async (runtime, session) => async action => {
    await db.set(session, param, 1)
  }
  sceneCmd.flagDown = param => scene => async (runtime, session) => async action => {
    console.log('flagging down', param)
    await db.set(session, param, 0)
  }
  sceneCmd.condition = param => scene => async (runtime, session) => {}

  let sceneCount = 0
  sceneCmd.intro = (...content) => scene => {
    let id = sceneCount ++
    let visitedKey = 'visited-' + id
    return async (runtime, session) => {
      let visited = await db.get(session, visitedKey)
      if (visited) {
      } else {
        await db.set(session, visitedKey, 1)
        for (let i = 0; i < content.length; i ++) {
          await content[i](scene)(runtime, session)
        }
      }
    }
  }

  return sceneCmd
}

module.exports = p => {
  db = p

  return {
    converterFromCommands: converterFromCommands
    , sceneCommands: sceneCommands
    , packageCommands: packageCommands
    , characterCommands: characterCommands
    , stageCommands: stageCommands
    , actionHandlers: actionHandlers
  }
}
