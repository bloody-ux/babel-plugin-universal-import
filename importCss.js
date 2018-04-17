/* eslint-disable */

var ADDED = {}

function prepareChunkNamePath(path) {
  return path.replace(/\//g, '-')
}

module.exports = function(chunkName, options) {
  var opts = options || {}
  // supported rewrite css chunk name to support pages in subfolder
  // the root cause is when webpack generates dynamic chunk name, it will replace slash with hyphen
  var getCssChunkName = function() {
    const cssPathIndent = options.cssPathIndent || 0
    const parts = chunkName.split('/')
    const prefix = parts.slice(0, cssPathIndent)
    const postfix = parts.slice(cssPathIndent)

    return [prefix.join('/'), postfix.join('-')].join('/')
  }

  var href = getHref(getCssChunkName(chunkName))
  if (!href) {
    if (process.env.NODE_ENV === 'development' && !opts.disableWarnings) {
      if (typeof window === 'undefined' || !window.__CSS_CHUNKS__) {
        console.warn(
          '[UNIVERSAL-IMPORT] no css chunks hash found at "window.__CSS_CHUNKS__". Make sure you are using: https://www.npmjs.com/package/extract-css-chunks-webpack-plugin . If you are not serving CSS, disregard this message.'
        )
        return
      }

      console.warn(
        '[UNIVERSAL-IMPORT] no chunk, ',
        chunkName,
        ', found in "window.__CSS_CHUNKS__". If you are not serving CSS for this chunk, disregard this message.'
      )
    }

    return
  }

  if (ADDED[href] === true) {
    return Promise.resolve()
  }
  ADDED[href] = true

  var head = document.getElementsByTagName('head')[0]
  var link = document.createElement('link')

  link.charset = 'utf-8'
  link.type = 'text/css'
  link.rel = 'stylesheet'
  link.timeout = 30000

  return new Promise(function(resolve, reject) {
    var timeout
    var img

    var onload = function() {
      // Check if we created the img tag.
      // If we did then the chunk was loaded via img.src
      // and we need to set the link.href which will then
      // load the resource from cache
      if (img) {
        link.href = href
        img.onerror = null // avoid mem leaks in IE.
      }
      link.onerror = null // avoid mem leaks in IE.
      clearTimeout(timeout)
      resolve()
    }

    link.onerror = function() {
      link.onerror = link.onload = null // avoid mem leaks in IE.
      clearTimeout(timeout)
      var message = 'could not load css chunk: ' + chunkName
      reject(new Error(message))
    }

    if (isOnloadSupported() && 'onload' in link) {
      link.onload = onload
      link.href = href
    } else {
      // Use img.src as a fallback to loading the css chunk in browsers
      // which don’t support link.onload
      // We use the img.onerror handler because an error will always fire
      // when parsing the response
      // Then we know the resource has been loaded
      img = document.createElement('img')
      img.onerror = onload
      img.src = href
    }

    timeout = setTimeout(link.onerror, link.timeout)
    head.appendChild(link)
  })
}

function getHref(chunkName) {
  if (typeof window === 'undefined' || !window.__CSS_CHUNKS__) return null
  return window.__CSS_CHUNKS__[chunkName]
}

// Checks whether the browser supports link.onload
// Reference: https://pie.gd/test/script-link-events/
function isOnloadSupported() {
  var userAgent = navigator.userAgent
  var supportedMajor = 535
  var supportedMinor = 24
  var match = userAgent.match(/\ AppleWebKit\/(\d+)\.(\d+)/)
  if (match) {
    var major = +match[1]
    var minor = +match[2]
    return (
      (major === supportedMajor && minor >= supportedMinor) ||
      major > supportedMajor
    )
  }
  // All other browsers support it
  return true
}
