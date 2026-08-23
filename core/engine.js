import { LoadingBar } from './loading-bar.js'
import { ComponentCache } from './component-cache.js'

export class Engine {
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

    navigateTo(url) {
        window.history.pushState(null, null, url)
        this.router(url)
    }

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
