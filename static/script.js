$(document).ready(function() {
  var nextButton = $('.adv-next-button-row')
  var elems = $('.adv-one-by-one')
  nextButton.hide()

  if (elems.length > 1) {
    var options = $('.adv-options')

    elems.hide()
    options.hide()
    nextButton.show()

    var onClick = function() {
      console.log('clicked', i)
      if (i != elems.length - 1) {
        $(elems[i + 1]).show()
        if (i == elems.length - 2) {
          options.show()
          nextButton.hide()
        } else {
          i ++
        }
      }
    }

    var i = 0
    $('.adv-next-button-col button').on('click', onClick)
    $('body').on('keydown', function(ev) {
      if (ev.key == " ")
        onClick()
    })

    $(elems[0]).show()
  }
})
