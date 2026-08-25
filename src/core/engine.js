import { LoadingBar } from './loading-bar.js'
import { ComponentCache } from './component-cache.js'

export class Engine {
    /**
     * Initializes the SPA engine with routes and configuration.
     * @param {!Object=} opt_options Configuration options.
     * @constructor
     */
    constructor(options = {}) {
        this.routes = options.routes || []
        this.enabled = options.enabled !== undefined ? options.enabled : true
        this.loadingBar = new LoadingBar()
        this.componentCache = new ComponentCache()

        this.init()
    }

    init() {
        if (!this.enabled) {
            return
        }

        const start = () => {
            document.body.addEventListener('click', (e) => {
                const link = e.target.closest('a')
                if (!link) return

                if (
                    e.metaKey ||
                    e.ctrlKey ||
                    e.shiftKey ||
                    e.altKey ||
                    e.button !== 0
                ) {
                    return
                }

                if (this.shouldIntercept(link)) {
                    e.preventDefault()
                    this.navigateTo(link.href)
                }
            })

            window.addEventListener('popstate', () => {
                this.router(window.location.href)
            })
        }

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', start)
        } else {
            start()
        }
    }

    /**
     * Checks if a URL matches any registered route pattern.
     * @param {!string} url Target URL to test against routes.
     * @return {!boolean} True if the route matches.
     */
    isRouteMatched(url) {
        if (
            !this.routes ||
            !Array.isArray(this.routes) ||
            this.routes.length === 0
        ) {
            return false
        }

        const pathname = new URL(url, window.location.origin).pathname

        return this.routes.some((pattern) => {
            if (pattern instanceof RegExp) {
                return pattern.test(pathname)
            }
            if (typeof pattern === 'function') {
                return pattern(pathname)
            }
            if (typeof pattern === 'string') {
                const escaped = pattern
                    .replace(/[.+?^${}()|[\]\\]/g, '\\$&')
                    .replace(/\*/g, '.*')
                const regex = new RegExp(`^${escaped}$`)
                const cleanPath = pathname.replace(/^\//, '')
                return (
                    regex.test(pathname) ||
                    regex.test(cleanPath) ||
                    (pathname === '/' && (pattern === '/' || pattern === '*'))
                )
            }
            return false
        })
    }

    /**
     * Determines whether an anchor element should be intercepted for SPA.
     * @param {!HTMLAnchorElement} link Anchor element to check.
     * @return {!boolean} True if the link should be intercepted.
     */
    shouldIntercept(link) {
        if (!this.enabled || !link || link.tagName !== 'A') {
            return false
        }

        if (link.hasAttribute('data-no-spa')) {
            const val = link.getAttribute('data-no-spa')
            if (val === '' || val === 'true' || val === 'data-no-spa') {
                return false
            }
        }

        if (link.origin !== window.location.origin) {
            return false
        }

        if (link.pathname === window.location.pathname && link.hash) {
            return false
        }

        if (link.target && link.target !== '_self') {
            return false
        }
        if (link.hasAttribute('download')) {
            return false
        }

        return this.isRouteMatched(link.href)
    }

    /**
     * Navigates to a specified URL and pushes history state.
     * @param {!string} url Target URL to navigate to.
     */
    navigateTo(url) {
        window.history.pushState(null, null, url)
        this.router(url)
    }

    /**
     * Fetches and renders page content for the specified URL.
     * @param {!string=} opt_url Target URL to load.
     * @return {!Promise<void>}
     */
    async router(url = window.location.href) {
        this.loadingBar.start()

        try {
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error('Page not found')
            }

            const html = await response.text()
            this.renderPage(html)
        } catch (error) {
            document.body.innerHTML = '<h1>404</h1><p>Page not found.</p>'
        } finally {
            this.loadingBar.done()
        }
    }

    /**
     * Parses and renders incoming HTML into the document body.
     * @param {!string} html Raw HTML content of the page.
     */
    renderPage(html) {
        const parser = new DOMParser()
        const newDoc = parser.parseFromString(html, 'text/html')

        if (newDoc.title) {
            document.title = newDoc.title
        }

        this.componentCache.save(document.body)

        if (newDoc.body) {
            this.componentCache.restore(newDoc.body)
            document.body.replaceChildren(...newDoc.body.childNodes)
        } else {
            document.body.innerHTML = html
        }

        this.executeScripts(document.body)
        document.dispatchEvent(new CustomEvent('spa:rendered'))
    }

    /**
     * Re-creates and executes scripts found within the given container.
     * @param {!HTMLElement} container Container element containing scripts.
     */
    executeScripts(container) {
        const scripts = container.querySelectorAll('script')
        scripts.forEach((oldScript) => {
            if (oldScript.hasAttribute('data-spa-core')) {
                return
            }

            const newScript = document.createElement('script')
            Array.from(oldScript.attributes).forEach((attr) => {
                newScript.setAttribute(attr.name, attr.value)
            })
            newScript.textContent = oldScript.textContent
            oldScript.parentNode.replaceChild(newScript, oldScript)
        })
    }
}
