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
      const {packageInfo} = scenario().convertScenario(doc)
      packageInfo.should.equal({
        name: 'yama',
        label: 'Mountain'
      })
    })
  })
})
