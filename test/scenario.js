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
  const sceneCommands = require('../lib/commands/sceneCommands')()
  describe('scene', () => {
    it('returns scene object', () => {
      const scn = sceneCommands.scene()
      scn.should.have.property('display')
    })

    it('takes functions and they are called', () => {
      let called = 0
      const f = s => {
        called ++
      }
      const scn = sceneCommands.scene(f, f, f)
      scn.should.have.property('display')
      called.should.be.equal(3)
    })
  })
})
