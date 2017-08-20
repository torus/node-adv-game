const libxml = require('libxmljs')
const Element = require('libxmljs/lib/element')
const Text = require('libxmljs/lib/text')

module.exports = function(name, attrs) {
  var children = [];
  for (var i = 2; i < arguments.length; i ++) {
    children.push (arguments[i]);
  }
  return function (doc) {
    var elem = Element(doc, name);
    if (attrs) {
      for (var at in attrs) {
        elem.attr (at, attrs[at]);
      }
      for (var i = 0; i < children.length; i ++) {
        var c = children[i];
        var f = function (c) {
          if (typeof (c) == "function") {
            f (c (doc));
          } else if (c instanceof Element) { // Element
            elem.addChild (c);
          } else if (c instanceof Array) { // Array
            for (var i = 0; i < c.length; i ++) {
              f (c[i]);
            }
          } else {
            var cont = Text(doc, c);
            elem.addChild (cont);
          }
        }
        f (c);
      }
    }
    return elem;
  }
}
