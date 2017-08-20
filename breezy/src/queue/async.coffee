DoublyLinkedList = require('../doubly_linked_list')
Utils = require('../utils')

class Async
  constructor: ->
    @dll = new DoublyLinkedList
    @active = true

    Utils.on 'breezy:visit', => @drain()

  push:(req)->
    http = Utils.createRequest(req)

    element =
      http: http
      onload: (err, rsp) =>
        if err || !rsp.ok
          Utils.warn("The response had an error:' #{err.message}")
          req.onRequestError?(@optsForRespond(rsp))
        else
          req.respond(@optsForRespond(rsp))
      isDone: false

    @dll.push(element)

    http.send(req.payload)
    http.end (err, rsp) =>
      if @active
        element.isDone = true
        element.rsp = rsp
        element.err = err
        @attemptToProcess()

    return

  attemptToProcess: =>
    node = @dll.head
    while(node)
      traversingElement = node.element
      if !traversingElement.isDone
        node = null
      else
        node = node.next
        @dll.shift()
        err = traversingElement.err
        rsp = traversingElement.rsp
        traversingElement.onload(err, rsp)

  drain: ->
    @active = false
    node = @dll.head
    while(node)
      traversingElement = node.element
      traversingElement.http.abort()
      traversingElement.isDone = true
      node = node.next
    @dll = new DoublyLinkedList
    @active = true

  optsForRespond: (rsp) ->
    status: rsp.status
    header: rsp.header
    body: rsp.text


module.exports = Async

