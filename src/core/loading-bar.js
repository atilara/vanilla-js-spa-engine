export class LoadingBar {
    constructor() {
        this.element = null
    }

    ensureElement() {
        if (!this.element) {
            this.element = document.createElement('div')
            this.element.id = 'spa-loading-bar'
            Object.assign(this.element.style, {
                position: 'fixed',
                top: '0',
                left: '0',
                height: '3px',
                width: '0%',
                backgroundColor: '#0070f3',
                transition: 'width 0.3s ease, opacity 0.3s ease',
                zIndex: '999999',
                opacity: '0',
                pointerEvents: 'none',
            })
        }

        if (!document.contains(this.element)) {
            const root = document.body || document.documentElement
            if (root) {
                root.appendChild(this.element)
            }
        }
    }

    start() {
        this.ensureElement()
        Object.assign(this.element.style, {
            transition: 'none',
            width: '0%',
            opacity: '1',
        })
        void this.element.offsetWidth

        Object.assign(this.element.style, {
            transition: 'width 0.4s ease, opacity 0.3s ease',
            width: '70%',
        })
    }

    done() {
        this.ensureElement()
        this.element.style.width = '100%'
        setTimeout(() => {
            if (!this.element) return
            this.element.style.opacity = '0'
            setTimeout(() => {
                if (this.element) {
                    this.element.style.width = '0%'
                }
            }, 300)
        }, 200)
    }
}
