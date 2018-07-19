module.exports = p => {
  const db = p

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

  function convert(doc) {
    const stageMap = {}
    const charMap = {}

    const stgConv = converterFromCommands(stageCommands(stageMap))
    const chrConv = converterFromCommands(characterCommands(charMap))
    const conv = converterFromCommands(require('./commands/sceneCommands')(db))

    doc.filter(e => e.stage).map(stgConv)
    doc.filter(e => e.character).map(chrConv)
    const sceneArray = doc.filter(e => e.scene).map(elem => conv(elem))

    return {stageMap: stageMap, charMap: charMap, sceneArray: sceneArray}
  }

  return {
    actionHandlers: actionHandlers
    , convertScenario: convert
  }
}
