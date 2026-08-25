import { Engine } from './core/engine.js'

export const engine = new Engine({
    routes: ['*.html', '/routes/*'],
    enabled: true,
})

function initDemoWidget() {
    const widget = document.querySelector(
        '[data-cache-id="demo-clicks-wrapper"]'
    )
    if (!widget || widget.dataset.initialized) return

    let clicks = 0
    const btn = widget.querySelector('.demo-btn')
    const clicksSpan = widget.querySelector('.demo-clicks')

    const updateDisplay = () => {
        clicksSpan.textContent = clicks
    }

    widget.addEventListener('spa:save', (e) => {
        e.detail.state.clicks = clicks
    })

    widget.addEventListener('spa:restore', (e) => {
        const savedClicks = e.detail?.state?.clicks
        if (savedClicks !== undefined) {
            clicks = savedClicks
            updateDisplay()
        }
    })

    btn.addEventListener('click', () => {
        clicks++
        updateDisplay()
    })

    widget.dataset.initialized = 'true'
}

initDemoWidget()

document.addEventListener('spa:rendered', initDemoWidget)
