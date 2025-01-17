/**
 * MIT License
 *
 * Copyright (c) 2017-present, Elasticsearch BV
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in
 * all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
 * THE SOFTWARE.
 *
 */

import { USER_INTERACTION } from '../constants'

export function observePageClicks(transactionService) {
  const clickHandler = event => {
    // Real user clicks interactions will always be related to an Element.
    // And since the goal is to maximise the capture of such interactions
    // events synthetically dispatched through Window (window.dispatch) and Document (document.dispatch)
    // will not be handled.
    if (event.target instanceof Element) {
      createUserInteractionTransaction(transactionService, event.target)
    }
  }

  const eventName = 'click'
  const useCapture = true
  window.addEventListener(eventName, clickHandler, useCapture)

  return () => {
    window.removeEventListener(eventName, clickHandler, useCapture)
  }
}

function createUserInteractionTransaction(transactionService, target) {
  const { transactionName, context } = getTransactionMetadata(target)

  /**
   * We reduce the reusability threshold to make sure
   * we only capture async activities (e.g. network)
   * related to this interaction.
   */
  const tr = transactionService.startTransaction(
    `Click - ${transactionName}`,
    USER_INTERACTION,
    {
      managed: true,
      canReuse: true,
      reuseThreshold: 300
    }
  )

  if (tr && context) {
    tr.addContext(context)
  }
}

function getTransactionMetadata(target) {
  const metadata = {
    transactionName: null,
    context: null
  }

  const tagName = target.tagName.toLowerCase()

  // use custom html attribute 'data-transaction-name' - otherwise fall back to "tagname" + "name"-Attribute
  let transactionName = tagName
  if (!!target.dataset.transactionName) {
    transactionName = target.dataset.transactionName
  } else {
    const name = target.getAttribute('name')
    if (!!name) {
      transactionName = `${tagName}["${name}"]`
    }
  }

  metadata.transactionName = transactionName

  let classes = target.getAttribute('class')
  if (classes) {
    metadata.context = { custom: { classes } }
  }

  return metadata
}
