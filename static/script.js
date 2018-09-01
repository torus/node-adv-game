var onClick = null

$(document).ready(function() {
  var nextButton = $('.adv-next-button-row')
  var elems = $('.adv-one-by-one')
  nextButton.hide()

  var options = $('.adv-options')

  if (elems.length > 1) {
    elems.hide()
    options.hide()
    nextButton.show()
  }

  var i = 0
  onClick = function() {
    elems = $('.adv-one-by-one')
    console.log('onClick before', i, '/', elems.length)
    console.log('clicked', i, elems.length)
    if (i != elems.length - 1) {
      $(elems[i + 1]).show()
      if (i == elems.length - 2) {
        options.show()
        nextButton.hide()
      } else {
        options.hide()
        nextButton.show()
        i ++
      }
    }
    console.log('onClick after', i)
  }

  $('.adv-next-button-col button').on('click', onClick)
  $('body').on('keydown', function(ev) {
    if (ev.key == " ")
      onClick()
  })

  $(elems[0]).show()
})

function doAction(actionId) {
  console.log('doAction', actionId)
  var label = $('#action-button-' + actionId).text()
  console.log('label', label)
  var nextButton = $('.adv-next-button-row')
  var options = $('.adv-options')

  $('#moveList').empty()
  $('#actionList').empty()

  $.post('/action/' + actionId
         , null
         , function(data) {
           var bodyElem = $('#display-body')
           if (data.disp.length > 0) {
             bodyElem.append($('<hr/>'))
             bodyElem.append($('<div>').text(label))
           }
           data.disp.forEach(function(html) {
             var elem = $(html)
             elem.hide()
             bodyElem.append(elem)
           })

           onClick()

           data.moves.forEach(function(elem) {$('#moveList').append(elem)})
           data.actions.forEach(function(elem) {$('#actionList').append(elem)})
         }
         , 'json'
  )

  return false
}
