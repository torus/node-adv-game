var should = require('should')

describe('async/await', function() {
  it('work asynchronously!', function(done) {
    var f = new Promise (resolve => {
      setTimeout(() => {
        resolve("f")
      }, 100)
    })

    var g = async () => {
      var x = await f
      return "g" + x
    }

    g().then(v => {
      v.should.be.equal("gf")
      done()
    })
  })
})
