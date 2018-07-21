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
})
