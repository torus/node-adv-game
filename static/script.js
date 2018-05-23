$(document).ready(function() {
  var elems = $('.adv-one-by-one')
  var options = $('.adv-options')
  elems.hide()
  options.hide()

  elems.each(function (i) {
    console.log(i)
    ;(function(i, e){
      e.on('click', function() {
        console.log('clicked', i)
        if (i != elems.length - 1) {
          e.hide()
          $(elems[i + 1]).show()
        } else {
          options.show()
        }
      })
    })(i, $(this))
  })
  $(elems[0]).show()
})
