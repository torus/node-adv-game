const should = require('should')

describe('scenario', () => {
  const scenario = require('../lib/scenario')
  describe('convertScenario', () => {
    it('converts stage data', () => {
      const doc = [
        {stage: [
          {name: 'yama'},
          {label: 'Mountain'}
        ]}
      ]
      const {stageMap} = scenario().convertScenario(doc)
      stageMap.should.deepEqual({
        yama: {
          name: 'yama',
          label: 'Mountain'
        }
      })
    })
  })
})

describe('sceneCommands', () => {
  const sceneCommands = require('../lib/commands/sceneCommands')
  describe('scene', () => {
    it('returns scene object', () => {
      const scn = sceneCommands(null).scene()
      scn.should.have.property('display')
    })

    it('takes functions and they are called', () => {
      let called = 0
      const f = s => {
        called ++
      }
      const scn = sceneCommands(null).scene(f, f, f)
      scn.should.have.property('display')
      called.should.be.equal(3)
    })
  })

  describe('name', () => {
    it('names the scene', async () => {
      const cmd = sceneCommands(null).name('namae')
      cmd.should.be.a.Function()

      let scn = {}
      const func = cmd(scn)
      scn.name.should.equal('namae')
      func.should.be.a.Function()

      const prom = func(null, null)
      prom.should.be.an.instanceOf(Promise)

      await prom
    })
  })

  describe('stage', () => {
    it('specifies the stage ID', async () => {
      const cmd = sceneCommands(null).stage('steji')
      cmd.should.be.a.Function()

      let scn = {}
      const func = cmd(scn)
      scn.stage.should.equal('steji')
      func.should.be.a.Function()

      const prom = func(null, null)
      prom.should.be.an.instanceOf(Promise)

      await prom
    })
  })

  describe('desc', () => {
    it('shows description', async () => {
      const cmd = sceneCommands(null).desc('Lorem ipsum', 'dolor sit amet')
      cmd.should.be.a.Function()

      let scn = {}
      const func = cmd(scn)
      func.should.be.a.Function()

      let done = false
      const runtime = {
        addInstruction: function(cmd, texts) {
          cmd.should.be.equal('desc')
          texts.should.be.deepEqual(['Lorem ipsum', 'dolor sit amet'])
          done = true
        }
      }
      const prom = func(runtime, null)
      prom.should.be.an.instanceOf(Promise)
      const handler = await prom

      done.should.be.true()
      handler.should.be.a.Function()
      should(handler()).be.exactly(undefined)
    })
  })

  describe('speak', () => {
    it('adds lines', async () => {
      const cmd = sceneCommands(null).speak('acta', 'Lorem ipsum', 'dolor sit amet')
      cmd.should.be.a.Function()

      let scn = {}
      const func = cmd(scn)
      func.should.be.a.Function()

      let done = false
      const runtime = {
        addInstruction: function(cmd, actor, texts) {
          cmd.should.be.equal('speak')
          actor.should.be.equal('acta')
          texts.should.be.deepEqual(['Lorem ipsum', 'dolor sit amet'])
          done = true
        }
      }
      const prom = func(runtime, null)
      prom.should.be.an.instanceOf(Promise)
      const handler = await prom

      done.should.be.true()
      handler.should.be.a.Function()
      should(handler()).be.exactly(undefined)
    })
  })

  describe('link', () => {
    it('adds a link to the scene', async () => {
      let setCalled = 0
      const db = {
        set: async function(session, key, value) {
          key.should.be.equal('currentScene-dest')
          value.should.be.equal('anotherscene')
          setCalled ++
        }
      }
      const commands = sceneCommands(db)

      commands.scene(commands.stage('dest'), commands.name('anotherscene'))

      const cmd = commands.link('anotherscene')
      let scene = {linkedSceneSet: {}}
      const func = cmd(scene)

      let done = false
      const runtime = {
        addInstruction: function(cmd, scene) {
          cmd.should.be.equal('link')
          scene.should.be.equal('dest')
          done = true
        }
      }
      setCalled.should.be.equal(0)
      const prom = func(runtime, null)
      prom.should.be.an.instanceOf(Promise)

      const handler = await prom
      setCalled.should.be.equal(1)

      done.should.be.true()
      should(handler()).be.exactly(undefined)
    })
  })

  const makeDB = counterBox => ({
    get: async function(session, key) {
      counterBox[0] ++
      return {
        trueParam: true
        , one: 1
        , oneString: '1'
        , falseParam: false
        , zero: 0
        , zeroString: '0'
      }[key]
    }
  })

  const makeRuntime = argBox => ({
    addInstruction: function(...args) {
      argBox.push(args)
    }
  })

  const testWhen = async (param, expectedInstructions) => {
    let counterBox = [0]
    const db = makeDB(counterBox)

    const commands = sceneCommands(db)
    const cmd = commands.when(param, commands.desc('called!'))
    const func = cmd(null)

    const argsPassedToAddInstruction = []
    const runtime = makeRuntime(argsPassedToAddInstruction)

    counterBox[0].should.be.equal(0)
    const prom = func(runtime, null)
    prom.should.be.an.instanceOf(Promise)

    const handler = await prom
    should(handler).be.exactly(undefined)
    counterBox[0].should.be.equal(1)
    argsPassedToAddInstruction.should.be.deepEqual(expectedInstructions)
  }

  const testWhenNot = async (param, expectedInstructions) => {
    let counterBox = [0]
    const db = makeDB(counterBox)

    const commands = sceneCommands(db)
    const cmd = commands.when(commands.not(param), commands.desc('called!'))
    const func = cmd(null)

    const argsPassedToAddInstruction = []
    const runtime = makeRuntime(argsPassedToAddInstruction)

    counterBox[0].should.be.equal(0)
    const prom = func(runtime, null)
    prom.should.be.an.instanceOf(Promise)

    const handler = await prom
    should(handler).be.exactly(undefined)
    counterBox[0].should.be.equal(1)
    argsPassedToAddInstruction.should.be.deepEqual(expectedInstructions)
  }

  describe('when', () => {
    it('executes the body when the condition is fulfilled', async () => {
      await testWhen('trueParam', [['desc', ['called!']]])
      await testWhen('one', [['desc', ['called!']]])
      await testWhen('oneString', [['desc', ['called!']]])
    })

    it('doesn\'t execute the body when the condition is not fulfilled', async () => {
      await testWhen('falseParam', [])
      await testWhen('zero', [])
      await testWhen('zeroString', [])
    })
  })

  describe('not', () => {
    it('returns false if the value is true', async () => {
      let counterBox = [0]
      const db = makeDB(counterBox)
      const commands = sceneCommands(db)
      const cmd = commands.not('trueParam')
      const func = cmd(null)
      const prom = func(null, null)
      const ret = await prom
      ret.should.be.false()
    })

    it('returns true if the value is false', async () => {
      const db = makeDB([])
      const commands = sceneCommands(db)
      const cmd = commands.not('falseParam')
      const func = cmd(null)
      const prom = func(null, null)
      const ret = await prom
      ret.should.be.true()
    })

    it('returns true if the param is not existing', async () => {
      const db = makeDB([])
      const commands = sceneCommands(db)
      const cmd = commands.not('nonExisting')
      const func = cmd(null)
      const prom = func(null, null)
      const ret = await prom
      ret.should.be.true()
    })

    it('works nicely with when', async () => {
      await testWhenNot('falseParam', [['desc', ['called!']]])
      await testWhenNot('zero', [['desc', ['called!']]])
      await testWhenNot('zeroString', [['desc', ['called!']]])
      await testWhenNot('trueParam', [])
      await testWhenNot('one', [])
      await testWhenNot('oneString', [])
    })
  })

  describe('action', () => {
    it('creates an action', async () => {
      const commands = sceneCommands(null)
      let called = false
      const cmd = commands.action(scn => new Promise((res, rej) => {
        called = true
        res()
      }))

      const scene = {
        name: "scene-name"
      }
      const func = cmd(scene)
      await func

      called.should.be.ok()
    })
  })

  describe('label', () => {
    it('specifies label on an action', async () => {
      const commands = sceneCommands(null)
      let called = false
      const cmd = commands.label('action-label')
      const prom = await cmd(null)(null, null)

      const action = {}
      await prom(action)
      action.should.have.property('label').which.equal('action-label')
    })
  })

  describe('after', () => {
    it('specifies thing to be done after the action is executed', async () => {
      const actionHandlers = {}
      const commands = sceneCommands(null, actionHandlers)
      let result = 0
      const actionFunc = (n) => scene => async (runtime, session) => async action => {
        result += n
        scene.should.have.property('stage').which.equal('stage obj')
      }
      const cmd = commands.after(actionFunc(1), actionFunc(10), actionFunc(100))
      const scene = {
        stage: 'stage obj'
      }
      const prom = await cmd(scene)(null, null)
      const action = {}
      await prom(action)
      result.should.equal(0)
      const handles = Object.keys(actionHandlers)
      handles.should.have.length(1)
      const hndl = actionHandlers[handles[0]]
      hndl.should.be.a.Function()
      await hndl(null)
      result.should.equal(111)
    })
  })

  const makeFlagDB = tbl => ({
    set: (session, key, val) => {
      tbl[key] = val
    },
    get: (session, key) => tbl[key]
  })

  describe('flagUp', () => {
    it('sets flag to the TRUE value', async () => {
      const tbl = {}
      const db = makeFlagDB(tbl)
      const actionHandlers = {}
      const commands = sceneCommands(db, actionHandlers)
      const cmd = commands.flagUp('trueFlag')
      const func = cmd(null)
      const prom = await func(null, null)
      const action = {}
      await prom(action)

      tbl.should.deepEqual({trueFlag: 1})
    })
  })

  describe('flagDown', () => {
    it('sets flag to the FALSE value', async () => {
      const tbl = {falseFlag: 1, trueFlag: 1}
      const db = makeFlagDB(tbl)
      const actionHandlers = {}
      const commands = sceneCommands(db, actionHandlers)
      const cmd = commands.flagDown('falseFlag')
      const func = cmd(null)
      const prom = await func(null, null)
      const action = {}
      await prom(action)

      tbl.should.deepEqual({trueFlag: 1, falseFlag: 0})
    })
  })

  describe('condition', () => {
    it('throws if the value of a param is not true', async () => {
      const tbl = {falseFlag: 0, trueFlag: 1}
      const db = makeFlagDB(tbl)
      const actionHandlers = {}
      const commands = sceneCommands(db, actionHandlers)
      const cmd = commands.condition('falseFlag')
      const func = cmd(null)
      const prom = func(null, null)
      prom.should.be.rejectedWith('condition "falseFlag" not satisfied! Value: 0')
    })
  })
})
