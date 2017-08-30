var should = require('should')
var libxml = require('libxmljs')
var Element = require('libxmljs/lib/element')

var E = require('libxmljs-lazy-builder')

describe('libxmljs-lazy-builder', function() {
  it('should return a function', function() {
    E("root").should.be.a.Function()
  })
  it('can take attributes', function() {
    E("root", {a: 123}).should.be.a.Function()
  })
  it('can take children', function() {
    E("root", {}, E("child"), E("child")).should.be.a.Function()
  })
})

describe('function returned from libxmljs-lazy-builder', function() {
  it('should take a document and return an Element', function() {
    var doc = new libxml.Document()
    E("root")(doc).should.be.an.instanceof(Element)
  })

  describe('with no attributes', function() {
    it('should take a document and return an Element with the attributes', function() {
      var doc = new libxml.Document()
      var elem = E("root", {})(doc)
      elem.toString().should.be.equal('<root/>')
    })
  })

  describe('with attributes', function() {
    it('should take a document and return an Element with the attributes', function() {
      var doc = new libxml.Document()
      var elem = E("root", {key: "value", anotherKey: "lueva"})(doc)
      elem.should.be.an.instanceof(Element)
      elem.attr("key").value().should.be.equal("value")
      elem.attr("anotherKey").value().should.be.equal("lueva")
      elem.toString().should.be.equal('<root key="value" anotherKey="lueva"/>')
    })
  })

  describe('with text', function() {
    it('should take a document and return an Element with the text', function() {
      var doc = new libxml.Document()
      var elem = E("root", {}, "content text")(doc)
      elem.toString().should.be.equal('<root>content text</root>')
    })
  })

  describe('with children', function() {
    it('should take a document and return an Element with the children', function() {
      var doc = new libxml.Document()
      var elem = E("root", {}, E("kit"), E("kat"))(doc)
      elem.toString().should.be.equal('<root><kit/><kat/></root>')
    })
  })

  describe('with children as an array', function() {
    it('should take a document and return an Element with the children', function() {
      var doc = new libxml.Document()
      var elem = E("root", {}, [E("kit"), E("kat")])(doc)
      elem.toString().should.be.equal('<root><kit/><kat/></root>')
    })
  })

  describe('with children including text', function() {
    it('should take a document and return an Element with the children', function() {
      var doc = new libxml.Document()
      var elem = E("root", {}, E("kit"), "mars", E("kat"))(doc)
      elem.toString().should.be.equal('<root><kit/>mars<kat/></root>')
    })
  })
})
