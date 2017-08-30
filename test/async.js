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

  it('throws!', function(done) {
    var oneMoment = new Promise(resolve => {
      setTimeout(() => {
        resolve();
      }, 100);
    })

    var f = async () => {
      await oneMoment;

      throw "woo!";
      return "nee";
    }

    var g = async () => {
      var result = null;
      var err = null;
      try {
        result = await f();
      } catch (e) {
        err = e;
      }
      should.not.exist(result);
      err.should.be.equal('woo!');
    }

    g().then(done)
  })

  it('receives an exeption from a Promise', done => {
    var pitcher = new Promise((resolve, reject) => {
      return reject("ball");
    })

    var f = async () => {
      var result;
      try {
        result = await pitcher;
      } catch (e) {
        result = e;
      }

      result.should.be.equal("ball");
    }

    f().then(done);
  })
})
