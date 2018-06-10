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
