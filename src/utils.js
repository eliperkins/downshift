import preval from 'preval.macro'

let idCounter = 1

/**
 * Accepts a parameter and returns it if it's a function
 * or a noop function if it's not. This allows us to
 * accept a callback, but not worry about it if it's not
 * passed.
 * @param {Function} cb the callback
 * @return {Function} a function
 */
function cbToCb(cb) {
  return typeof cb === 'function' ? cb : noop
}
function noop() {}

function findParent(finder, node, rootNode) {
  if (node !== null && node !== rootNode.parentNode) {
    if (finder(node)) {
      if (node === document.body && node.scrollTop === 0) {
        // in chrome body.scrollTop always return 0
        return document.documentElement
      }
      return node
    } else {
      return findParent(finder, node.parentNode, rootNode)
    }
  } else {
    return null
  }
}

/**
 * Get the closest element that scrolls
 * @param {HTMLElement} node - the child element to start searching for scroll parent at
 * @param {HTMLElement} rootNode - the root element of the component
 * @return {HTMLElement} the closest parentNode that scrolls
 */
const getClosestScrollParent = findParent.bind(
  null,
  node => node.scrollHeight > node.clientHeight,
)

/**
 * Scroll node into view if necessary
 * @param {HTMLElement} node - the element that should scroll into view
 * @param {HTMLElement} rootNode - the root element of the component
 * @param {Boolean} alignToTop - align element to the top of the visible area of the scrollable ancestor
 */
// eslint-disable-next-line complexity
function scrollIntoView(node, rootNode) {
  const scrollParent = getClosestScrollParent(node, rootNode)
  if (scrollParent === null) {
    return
  }
  const scrollParentStyles = getComputedStyle(scrollParent)
  const scrollParentRect = scrollParent.getBoundingClientRect()
  const scrollParentBorderTopWidth = parseInt(
    scrollParentStyles.borderTopWidth,
    10,
  )
  const scrollParentBorderBottomWidth = parseInt(
    scrollParentStyles.borderBottomWidth,
    10,
  )
  const bordersWidth =
    scrollParentBorderTopWidth + scrollParentBorderBottomWidth
  const scrollParentTop = scrollParentRect.top + scrollParentBorderTopWidth
  const nodeRect = node.getBoundingClientRect()

  if (nodeRect.top < 0) {
    // the item above view
    scrollParent.scrollTop += nodeRect.top
    return
  }

  if (nodeRect.top > 0 && scrollParentRect.top < 0) {
    if (
      scrollParentRect.bottom > 0 &&
      nodeRect.bottom + bordersWidth > scrollParentRect.bottom
    ) {
      // the item is below scrollable area
      scrollParent.scrollTop +=
        nodeRect.bottom - scrollParentRect.bottom + bordersWidth
    }
    // item and parent top are on different sides of view top border (do nothing)
    return
  }

  const nodeOffsetTop = nodeRect.top + scrollParent.scrollTop
  const nodeTop = nodeOffsetTop - scrollParentTop
  if (nodeTop < scrollParent.scrollTop) {
    // the item is above the scrollable area
    scrollParent.scrollTop = nodeTop
  } else if (
    nodeTop + nodeRect.height + bordersWidth >
    scrollParent.scrollTop + scrollParentRect.height
  ) {
    // the item is below the scrollable area
    scrollParent.scrollTop =
      nodeTop + nodeRect.height - scrollParentRect.height + bordersWidth
  }
  // the item is within the scrollable area (do nothing)
}

/**
 * Simple debounce implementation. Will call the given
 * function once after the time given has passed since
 * it was last called.
 * @param {Function} fn the function to call after the time
 * @param {Number} time the time to wait
 * @return {Function} the debounced function
 */
function debounce(fn, time) {
  let timeoutId
  return wrapper
  function wrapper(...args) {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
      timeoutId = null
      fn(...args)
    }, time)
  }
}

/**
 * This is intended to be used to compose event handlers
 * They are executed in order until one of them calls
 * `event.preventDefault()`. Not sure this is the best
 * way to do this, but it seems legit...
 * @param {Function} fns the event hanlder functions
 * @return {Function} the event handler to add to an element
 */
function composeEventHandlers(...fns) {
  return (event, ...args) =>
    fns.some(fn => {
      fn && fn(event, ...args)
      return event.defaultPrevented
    })
}

/**
 * This generates a unique ID for all autocomplete inputs
 * @param {String} prefix the prefix for the id
 * @return {String} the unique ID
 */
function generateId(prefix) {
  return `${prefix}-${idCounter++}`
}

/**
 * This is only used in tests... Could be useful in SSR?
 * @param {Number} num The number to set the idCountry to
 */
function setIdCounter(num) {
  idCounter = num
}

/**
 * Returns the first argument that is not undefined
 * @param {...*} args the arguments
 * @return {*} the defined value
 */
function firstDefined(...args) {
  return args.find(a => typeof a !== 'undefined')
}

// eslint-disable-next-line complexity
function getA11yStatusMessage({
  isOpen,
  highlightedItem,
  selectedItem,
  resultCount,
  previousResultCount,
  itemToString,
}) {
  if (!isOpen) {
    if (selectedItem) {
      return itemToString(selectedItem)
    } else {
      return ''
    }
  }
  const resultCountChanged = resultCount !== previousResultCount
  if (!resultCount) {
    return 'No results.'
  } else if (!highlightedItem || resultCountChanged) {
    return `${resultCount} ${
      resultCount === 1 ? 'result is' : 'results are'
    } available, use up and down arrow keys to navigate.`
  }
  return itemToString(highlightedItem)
}

/**
 * Takes an argument and if it's an array, returns the first item in the array
 * otherwise returns the argument
 * @param {*} arg the maybe-array
 * @param {*} defaultValue the value if arg is falsey not defined
 * @return {*} the arg or it's first item
 */
function unwrapArray(arg, defaultValue) {
  arg = Array.isArray(arg) ? /* istanbul ignore next (preact) */ arg[0] : arg
  if (!arg && defaultValue) {
    return defaultValue
  } else {
    return arg
  }
}

/**
 * @param {Object} element (P)react element
 * @return {Boolean} whether it's a DOM element
 */
function isDOMElement(element) {
  /* istanbul ignore if */
  if (element.nodeName) {
    // then this is preact
    return typeof element.nodeName === 'string'
  } else {
    // then we assume this is react
    return typeof element.type === 'string'
  }
}

/**
 * React Native sets `navigator.product` to a constant `ReactNative`.
 * We can use this to determine if the target is React Native or not.
 * See https://github.com/facebook/react-native/issues/10881 for more info.
 * See https://github.com/facebook/react-native/blob/70c359000a2df091c3939f4c19db6024af992d43/Libraries/Core/InitializeCore.js#L194-L195 for more info.
 * @return {Boolean} whether or not the platform is React Native
 */
const isReactNative = Boolean(
  preval`module.exports = process.env.BUILD_REACT_NATIVE === 'true'`,
)

/**
 * @param {Object} element (P)react element
 * @return {Object} the props
 */
function getElementProps(element) {
  // props for react, attributes for preact
  return element.props || /* istanbul ignore next (preact) */ element.attributes
}

/**
 * Throws a helpful error message for required properties. Useful
 * to be used as a default in destructuring or object params.
 * @param {String} fnName the function name
 * @param {String} propName the prop name
 */
function requiredProp(fnName, propName) {
  throw new Error(`The property "${propName}" is required in "${fnName}"`)
}

const stateKeys = [
  'highlightedIndex',
  'inputValue',
  'isOpen',
  'selectedItem',
  'type',
]
/**
 * @param {Object} state The state object
 * @return {Object} State that is relevant to downshift
 */
function pickState(state = {}) {
  const result = {}
  stateKeys.forEach(k => {
    if (state.hasOwnProperty(k)) {
      result[k] = state[k]
    }
  })
  return result
}

export {
  cbToCb,
  composeEventHandlers,
  debounce,
  scrollIntoView,
  findParent,
  generateId,
  firstDefined,
  getA11yStatusMessage,
  unwrapArray,
  isDOMElement,
  isReactNative,
  getElementProps,
  noop,
  requiredProp,
  setIdCounter,
  pickState,
  isPlainObject,
}

/**
 * Simple check if the value passed is object literal
 * @param {*} obj any things
 * @return {Boolean} whether it's object literal
 */
function isPlainObject(obj) {
  return Object.prototype.toString.call(obj) === '[object Object]'
}
