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
      cmd.should.be.a.Function()

      let scn = {linkedSceneSet: {}}
      const func = cmd(scn)
      func.should.be.a.Function()

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
      handler.should.be.a.Function()
      should(handler()).be.exactly(undefined)
    })
  })
})
