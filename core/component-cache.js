export class ComponentCache {
    /**
     * Initializes the component cache with a maximum capacity.
     * @param {!number=} opt_maxSize Maximum number of components to cache.
     * @constructor
     */
    constructor(maxSize = 10) {
        this.cache = new Map()
        this.maxSize = maxSize
    }

    /**
     * Captures and stores state for all cacheable components in the container.
     * @param {!HTMLElement} container DOM element to scan for components.
     */
    save(container) {
        if (!container) return

        container.querySelectorAll('[data-cache-id]').forEach((node) => {
            const id = node.getAttribute('data-cache-id')

            if (this.cache.has(id)) {
                this.cache.delete(id)
            }

            const state = {}

            node.dispatchEvent(
                new CustomEvent('spa:save', {
                    detail: { state },
                })
            )

            this.cache.set(id, { node, state })

            if (this.cache.size > this.maxSize) {
                const oldestKey = this.cache.keys().next().value
                this.cache.delete(oldestKey)
            }
        })
    }

    /**
     * Restores cached component nodes and states into the target container.
     * @param {!HTMLElement} newContainer Incoming container with placeholder elements.
     */
    restore(newContainer) {
        if (!newContainer) return

        newContainer
            .querySelectorAll('[data-cache-id]')
            .forEach((placeholder) => {
                const id = placeholder.getAttribute('data-cache-id')
                const cached = this.cache.get(id)

                if (cached && cached.node) {
                    this.cache.delete(id)
                    this.cache.set(id, cached)

                    placeholder.replaceWith(cached.node)

                    cached.node.dispatchEvent(
                        new CustomEvent('spa:restore', {
                            detail: { state: cached.state },
                        })
                    )
                }
            })
    }
}
