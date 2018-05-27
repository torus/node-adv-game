$(document).ready(function() {
  var elems = $('.adv-one-by-one')
  var options = $('.adv-options')

  if (elems.length > 1) {
    elems.hide()
    options.hide()

    elems.each(function (i) {
      ;(function(i, e){
        e.on('click', function() {
          console.log('clicked', i)
          if (i != elems.length - 1) {
            $(elems[i + 1]).show()
            if (i == elems.length - 2) {
              options.show()
            }
          }
        })
      })(i, $(this))
    })
    $(elems[0]).show()
  }
})
