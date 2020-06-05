import { HandlerBuilder } from './ujs'
import configureMockStore from 'redux-mock-store'
import thunk from 'redux-thunk'
import fetchMock from 'fetch-mock'
import React from 'react'
import { JSDOM } from 'jsdom'
import { render } from 'react-dom'
import * as helpers from './helpers'

describe('ujs', () => {
  function createFakeEvent() {
    return {
      preventDefault: () => {},
      target: {
        nodeName: 'A',
        parentNode: 'DIV',
        href: '/foo',
        getAttribute: (attr) => {
          if(attr === 'href') {
            return '/foo'
          }
          if(attr === 'data-visit') {
            return true
          }
        }
      }
    }
  }

  function createFakeVisitGraftEvent() {
    return {
      preventDefault: () => {},
      target: {
        nodeName: 'A',
        parentNode: 'DIV',
        href: '/foo',
        getAttribute: (attr) => {
          if(attr === 'href') {
            return '/foo?bzq=data.hello'
          }
          if(attr === 'data-placeholder') {
            return '/current'
          }
          if(attr === 'data-visit') {
            return true
          }
        }
      }
    }
  }

  function createFakeRemoteEvent() {
    return {
      preventDefault: () => {},
      target: {
        nodeName: 'A',
        parentNode: 'DIV',
        href: '/foo',
        getAttribute: (attr) => {
          if(attr === 'href') {
            return '/foo'
          }
          if(attr === 'data-remote') {
            return true
          }
        }
      }
    }
  }

  describe('onClick', () => {
    it('calls visit on a valid link', () => {
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }
      const store = {}

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })

      spyOn(builder, 'visit')

      const {onClick} = builder.handlers()
      onClick(createFakeEvent())

      expect(builder.visit).toHaveBeenCalledWith('/foo', {method: 'GET'})
    })

    it('calls visit with a placeholder when bzq is present on a valid link', () => {
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }
      const store = {
        getState: () => {
          return {
            breezy: {
              currentUrl: '/current'
            }
          }
        }
      }

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })

      spyOn(builder, 'visit')

      const {onClick} = builder.handlers()
      onClick(createFakeVisitGraftEvent())

      expect(builder.visit).toHaveBeenCalledWith('/foo?bzq=data.hello', {method: 'GET', placeholderKey: '/current'})
    })

    it('calls remote if a link is enabled with remote', () => {
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }
      const store = {}

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })

      spyOn(builder, 'remote')

      const {onClick} = builder.handlers()
      onClick(createFakeRemoteEvent())

      expect(builder.remote).toHaveBeenCalledWith('/foo', {method: 'GET'})
    })

    it('does not call visit on an link does not have the visit attribute data-visit', () => {
      const store = {}
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })
      spyOn(builder, 'visit')
      const fakeEvent = createFakeEvent()
      fakeEvent.target.getAttribute = (attr) => {
        if(attr === 'href') {
          return '/foo'
        }
      }

      const {onClick} = builder.handlers()
      onClick(fakeEvent)

      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {})
    })

    it('does not call visit on an non-standard link', () => {
      const store = {}
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })
      spyOn(builder, 'visit')

      const {onClick} = builder.handlers()

      let fakeEvent = createFakeEvent()
      fakeEvent.which = 2
      onClick(fakeEvent)
      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {})

      fakeEvent = createFakeEvent()
      fakeEvent.metaKey = 1
      onClick(fakeEvent)
      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {})

      fakeEvent = createFakeEvent()
      fakeEvent.metaKey = 1
      onClick(fakeEvent)
      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {})

      fakeEvent = createFakeEvent()
      fakeEvent.ctrlKey= 1
      onClick(fakeEvent)
      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {})

      fakeEvent = createFakeEvent()
      fakeEvent.shiftKey= 1
      onClick(fakeEvent)
      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {})

      fakeEvent = createFakeEvent()
      fakeEvent.altKey= 1
      onClick(fakeEvent)
      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {})

      fakeEvent = createFakeEvent()
      onClick(fakeEvent)
      expect(builder.visit).toHaveBeenCalledWith('/foo', {method: 'GET'})
    })
  })

  describe('onSubmit', () => {
    function createFakeFormEvent() {
      return {
        preventDefault: () => {},
        target: {
          nodeName: 'FORM',
          href: '/foo',
          getAttribute: (attr) => {
            if(attr === 'action') {
              return '/foo'
            }
            if(attr === 'method') {
              return 'POST'
            }
            if(attr === 'data-visit') {
              return true
            }
          }
        }
      }
    }

    function createFakeRemoteFormEvent() {
      return {
        preventDefault: () => {},
        target: {
          nodeName: 'FORM',
          href: '/foo',
          getAttribute: (attr) => {
            if(attr === 'action') {
              return '/foo'
            }
            if(attr === 'method') {
              return 'POST'
            }
            if(attr === 'data-remote') {
              return true
            }
          }
        }
      }
    }

    it('succssfully posts a form with a visit attribute', () => {
      const store = {}
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })
      spyOn(builder, 'visit')
      global.FormData = () => {}
      spyOn(global, 'FormData').and.returnValue({some: 'Body'})

      const {onSubmit} = builder.handlers()
      const fakeFormEvent = createFakeFormEvent()
      onSubmit(fakeFormEvent)

      expect(global.FormData).toHaveBeenCalledWith(fakeFormEvent.target)
      expect(builder.visit).toHaveBeenCalledWith('/foo', {
        method: 'POST',
        headers: {
          "content-type": null,
        },
        body: {some: 'Body'}
      })
    })

    it('succssfully posts a form with a remote attribut', () => {
      const store = {}
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })
      spyOn(builder, 'remote')
      global.FormData = () => {}
      spyOn(global, 'FormData').and.returnValue({some: 'Body'})

      const {onSubmit} = builder.handlers()
      const fakeFormEvent = createFakeRemoteFormEvent()
      onSubmit(fakeFormEvent)

      expect(global.FormData).toHaveBeenCalledWith(fakeFormEvent.target)
      expect(builder.remote).toHaveBeenCalledWith('/foo', {
        method: 'POST',
        headers: {
          "content-type": null,
        },
        body: {some: 'Body'}
      })
    })

    it('does not posts a form without a visit attribute', () => {
      const store = {}
      const ujsAttributePrefix = 'data'
      const navigatorRef = {
        current: {
          navigateTo: () => {}
        }
      }

      const builder = new HandlerBuilder({
        ujsAttributePrefix,
        store,
        navigatorRef
      })
      spyOn(builder, 'visit')
      global.FormData = () => {}
      spyOn(global, 'FormData').and.returnValue({some: 'Body'})

      const {onSubmit} = builder.handlers()
      const fakeFormEvent = createFakeFormEvent()
      fakeFormEvent.target.getAttribute = (attr) => {
        if(attr === 'action') {
          return '/foo'
        }
        if(attr === 'method') {
          return 'POST'
        }
        if(attr === 'data-visit') {
          return false
        }
      }
      onSubmit(fakeFormEvent)

      expect(builder.visit).not.toHaveBeenCalledWith('/foo', {
        method: 'POST',
        body: {some: 'Body'}
      })
    })
  })
})