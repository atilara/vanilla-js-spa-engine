import {
    it,
    assertEqual,
    assertTrue,
    assertFalse,
} from './test-micro-framework.js'
import { Engine } from '../src/core/engine.js'
import { ComponentCache } from '../src/core/component-cache.js'
import { LoadingBar } from '../src/core/loading-bar.js'

function createLink(href, attrs = {}) {
    const a = document.createElement('a')
    a.href = href
    for (const [key, value] of Object.entries(attrs)) {
        a.setAttribute(key, value)
    }
    return a
}

function createMockPage(html) {
    const page = document.createElement('div')
    page.innerHTML = html
    return page
}

const testEngine = new Engine({
    routes: ['/about.html', '/site/*', (path) => path.startsWith('/api/')],
    enabled: true,
})

it('Engine: isRouteMatched should match exact string routes', () => {
    assertTrue(testEngine.isRouteMatched('/about.html'))
    assertFalse(testEngine.isRouteMatched('/contact.html'))
})

it('Engine: isRouteMatched should match wildcard routes', () => {
    assertTrue(testEngine.isRouteMatched('/site/dashboard.html'))
    assertTrue(testEngine.isRouteMatched('/site/settings'))
    assertFalse(testEngine.isRouteMatched('/other/dashboard.html'))
})

it('Engine: isRouteMatched should match function routes', () => {
    assertTrue(testEngine.isRouteMatched('/api/users'))
    assertFalse(testEngine.isRouteMatched('/graphql'))
})

it('Engine: shouldIntercept should return false for data-no-spa links', () => {
    const link1 = createLink('/about.html', { 'data-no-spa': 'true' })
    const link2 = createLink('/about.html', { 'data-no-spa': '' })
    assertFalse(testEngine.shouldIntercept(link1))
    assertFalse(testEngine.shouldIntercept(link2))
})

it('Engine: shouldIntercept should return false for external domains', () => {
    const link = createLink('https://example.com/about.html')
    assertFalse(testEngine.shouldIntercept(link))
})

it('Engine: shouldIntercept should return false for hash links on the same page', () => {
    const link = createLink(window.location.pathname + '#section1')
    assertFalse(testEngine.shouldIntercept(link))
})

it('Engine: shouldIntercept should return true for valid SPA links', () => {
    const origin = window.location.origin
    const link = createLink(`${origin}/about.html`)
    assertTrue(testEngine.shouldIntercept(link))
})

it('Engine: shouldIntercept should return true for wildcard SPA links', () => {
    const origin = window.location.origin
    const link = createLink(`${origin}/site/profile`)
    assertTrue(testEngine.shouldIntercept(link))
})

it('Engine: shouldIntercept should return false if engine is disabled', () => {
    const disabledEngine = new Engine({ enabled: false, routes: ['*'] })
    const link = createLink(`${window.location.origin}/about.html`)
    assertFalse(disabledEngine.shouldIntercept(link))
})

it('Engine: shouldIntercept should return false for links with target="_blank"', () => {
    const link = createLink(`${window.location.origin}/about.html`, {
        target: '_blank',
    })
    assertFalse(testEngine.shouldIntercept(link))
})

it('Engine: shouldIntercept should return false for download links', () => {
    const link = createLink(`${window.location.origin}/file.pdf`, {
        download: '',
    })
    assertFalse(testEngine.shouldIntercept(link))
})

it('Engine: renderPage should correctly update document.title and document.body', () => {
    const originalTitle = document.title
    const originalChildren = Array.from(document.body.childNodes)

    const fakeHTML =
        '<html><head><title>Injected SPA Title</title></head><body><h1 id="injected-header">New SPA Content</h1></body></html>'
    testEngine.renderPage(fakeHTML)

    const isTitleUpdated = document.title === 'Injected SPA Title'
    const isInjectedHeaderPresent =
        document.getElementById('injected-header') !== null

    document.title = originalTitle
    document.body.replaceChildren(...originalChildren)

    assertTrue(isTitleUpdated)
    assertTrue(isInjectedHeaderPresent)
})

it('Engine: executeScripts should clone and replace script tags to force execution', () => {
    const container = document.createElement('div')
    container.innerHTML =
        '<script id="test-script">window.__TEST_VAR = true;</script>'

    const originalScript = container.querySelector('script')
    testEngine.executeScripts(container)
    const newScript = container.querySelector('script')

    assertFalse(originalScript === newScript)
    assertEqual(newScript.textContent, 'window.__TEST_VAR = true;')
})

it('Engine: executeScripts should ignore scripts with data-spa-core to prevent re-initialization', () => {
    const container = document.createElement('div')
    container.innerHTML = `
        <script src="main.bundle.js" data-spa-core></script>
        <script src="analytics.js" data-spa-core></script>
    `

    const originalScripts = Array.from(container.querySelectorAll('script'))
    testEngine.executeScripts(container)
    const newScripts = Array.from(container.querySelectorAll('script'))

    assertTrue(originalScripts[0] === newScripts[0])
    assertTrue(originalScripts[1] === newScripts[1])
})

it('ComponentCache: should correctly save DOM nodes marked with data-cache-id', () => {
    const cache = new ComponentCache()
    const page = createMockPage(
        '<div data-cache-id="widget-1">Live Original Node</div>'
    )

    cache.save(page)

    assertTrue(cache.cache.has('widget-1'))
    assertEqual(
        cache.cache.get('widget-1').node.innerHTML,
        'Live Original Node'
    )
})

it('ComponentCache: should correctly dispatch spa:save and store custom state', () => {
    const cache = new ComponentCache()
    const page = createMockPage('<div data-cache-id="widget-2"></div>')
    const widget = page.firstElementChild

    widget.addEventListener('spa:save', (e) => {
        e.detail.state.activeTab = 'profile'
    })

    cache.save(page)
    assertEqual(cache.cache.get('widget-2').state.activeTab, 'profile')
})

it('ComponentCache: should restore cached nodes and dispatch spa:restore', () => {
    const cache = new ComponentCache()

    const pageA = createMockPage(
        '<div data-cache-id="widget-3">Live State preserved</div>'
    )
    const liveNode = pageA.firstElementChild
    cache.save(pageA)

    const pageB = createMockPage(
        '<div data-cache-id="widget-3">Static Server Placeholder</div>'
    )

    let eventFired = false
    liveNode.addEventListener('spa:restore', () => (eventFired = true))

    cache.restore(pageB)

    assertTrue(pageB.firstElementChild === liveNode)
    assertEqual(pageB.firstElementChild.innerHTML, 'Live State preserved')
    assertTrue(eventFired)
})

it('ComponentCache: should retain native DOM state (like input.value) across simulated navigations', () => {
    const cache = new ComponentCache()

    const pageA = createMockPage(
        '<input type="text" data-cache-id="nav-input" />'
    )
    const inputNode = pageA.firstElementChild

    inputNode.value = 'Hello World from Page A'

    cache.save(pageA)

    const pageB = createMockPage(
        '<input type="text" data-cache-id="nav-input" />'
    )

    cache.restore(pageB)

    assertTrue(pageB.firstElementChild === inputNode)
    assertEqual(pageB.firstElementChild.value, 'Hello World from Page A')
})

it('ComponentCache: should evict the oldest entry when maxSize is exceeded (LRU limit)', () => {
    const cache = new ComponentCache(2)

    const pageA = createMockPage('<div data-cache-id="item1"></div>')
    const pageB = createMockPage('<div data-cache-id="item2"></div>')
    const pageC = createMockPage('<div data-cache-id="item3"></div>')

    cache.save(pageA)
    cache.save(pageB)
    cache.save(pageC)

    assertFalse(cache.cache.has('item1'))
    assertTrue(cache.cache.has('item2'))
    assertTrue(cache.cache.has('item3'))
    assertEqual(cache.cache.size, 2)
})

it('ComponentCache: should update access order on restore to prevent active items from being evicted', () => {
    const cache = new ComponentCache(2)

    const pageA = createMockPage('<div data-cache-id="item1"></div>')
    const pageB = createMockPage('<div data-cache-id="item2"></div>')

    cache.save(pageA)
    cache.save(pageB)

    const restorePage = createMockPage('<div data-cache-id="item1"></div>')
    cache.restore(restorePage)

    const pageC = createMockPage('<div data-cache-id="item3"></div>')
    cache.save(pageC)

    assertFalse(cache.cache.has('item2'))
    assertTrue(cache.cache.has('item1'))
    assertTrue(cache.cache.has('item3'))
})

it('LoadingBar: should inject the #spa-loading-bar element into the DOM', () => {
    const bar = new LoadingBar()
    bar.start()

    const element = document.getElementById('spa-loading-bar')
    assertTrue(element !== null)
    assertEqual(element.style.opacity, '1')
    assertEqual(element.style.width, '70%')

    element.remove()
})
