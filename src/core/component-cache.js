const CACHE_ATTR = 'data-cache-id'
const CACHE_SELECTOR = `[${CACHE_ATTR}]`

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

        container.querySelectorAll(CACHE_SELECTOR).forEach((node) => {
            const id = node.getAttribute(CACHE_ATTR)
            const state = {}

            node.dispatchEvent(
                new CustomEvent('spa:save', {
                    detail: { state },
                })
            )

            this._touch(id, { node, state })
            this._evictOldestIfFull()
        })
    }

    /**
     * Restores cached component nodes and states into the target container.
     * @param {!HTMLElement} newContainer Incoming container with placeholder elements.
     */
    restore(newContainer) {
        if (!newContainer) return

        newContainer.querySelectorAll(CACHE_SELECTOR).forEach((placeholder) => {
            const id = placeholder.getAttribute(CACHE_ATTR)
            const cached = this.cache.get(id)

            if (cached && cached.node) {
                this._touch(id, cached)
                placeholder.replaceWith(cached.node)

                cached.node.dispatchEvent(
                    new CustomEvent('spa:restore', {
                        detail: { state: cached.state },
                    })
                )
            }
        })
    }

    /**
     * Refreshes the entry's access order in the LRU map.
     * @param {!string} id Component cache key.
     * @param {!Object} entry Cache entry holding node and state.
     * @private
     */
    _touch(id, entry) {
        this.cache.delete(id)
        this.cache.set(id, entry)
    }

    /**
     * Evicts the least recently used component when capacity is exceeded.
     * @private
     */
    _evictOldestIfFull() {
        if (this.cache.size > this.maxSize) {
            const oldestKey = this.cache.keys().next().value
            this.cache.delete(oldestKey)
        }
    }
}
