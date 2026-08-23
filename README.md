# Vanilla JS SPA Engine

A Single Page Application engine built with plain JavaScript. It converts multi-page websites into single-page applications without requiring external libraries.

## How to Use the Engine

### 1. Initialization
Import the engine in your main JavaScript file and define which URL paths the engine should manage.

```javascript
import { Engine } from './core/engine.js';

const engine = new Engine({
    enabled: true, // Turn the SPA behavior on or off
    routes: [
        '*.html',        // Matches all HTML files
        '/site/*',       // Matches anything in the /site/ folder
        '/exact-path',   // Exact path match
        /^\/api\/.*$/,   // Regular expressions
        (path) => path.startsWith('/dynamic') // Custom functions
    ]
});
```

### 2. Protect Core Scripts
To stop the engine from running your main application code again every time a new page loads, you must add the `data-spa-core` attribute to your main script tag in your HTML.

```html
<script type="module" src="./app.js" data-spa-core></script>
```

### 3. Exclude Specific Links
If you want a specific link to trigger a normal page reload instead of being handled by the engine, add the `data-no-spa` attribute:

```html
<a href="/about.html" data-no-spa="true">Normal Page Reload</a>
```

### 4. Component Caching
To keep a component's state (like text in an input field or a checkbox) when moving between pages, add a unique `data-cache-id` to its container.

```html
<div data-cache-id="my-sidebar">
    <!-- Component content -->
</div>
```
When a user clicks a link, the engine takes this exact HTML element and places it into the new page. You can listen for the `spa:save` and `spa:restore` events on this element to save and load your custom JavaScript data.

---

## How it Works

1. **Click Detection**: The engine listens for all clicks on the page. When it detects a click on a link, it checks if the link matches your defined routes and ensures the user isn't holding down a modifier key (like Ctrl or Command).
2. **Fetching Content**: If the link matches, the engine stops the default browser loading process, shows a loading bar, and downloads the new HTML content using the `fetch` function. 
3. **Updating the Page**: The engine reads the new HTML, extracts the body and the title, and replaces the current page content. During this process, it keeps track of the cached components and places them in the new page. A limit is enforced on how many components are kept in memory to prevent the application from slowing down over time.
4. **Running Scripts**: Browsers do not run scripts when HTML is updated this way. The engine manually copies all new script tags and inserts them into the page to force the browser to run them (ignoring scripts marked with `data-spa-core`).
5. **Browser History**: The engine updates the web address bar and manages the back and forward browser buttons using the History API.

---

## Architecture Flow

```mermaid
sequenceDiagram
    autonumber
    actor User
    participant Router as Engine Router
    participant Cache as Component Cache
    participant UI as Loading Bar
    participant Net as Server / Network
    participant DOM as Browser DOM

    User->>Router: Clicks internal link
    Router->>Router: Validates route & stops normal page reload
    
    Router->>UI: Show loading bar
    Router->>Cache: Save cached components ('data-cache-id' elements)
    
    Router->>Net: Fetch new page
    Net-->>Router: Returns HTML content
    
    Router->>Cache: Restore cached components into new page
    Router->>DOM: Replace document.body
    Router->>DOM: Parse & execute new <script> tags
    
    Router->>UI: Hide loading bar
    Router->>Router: Update URL history
```

## How to Run

The files need to be served via a local web server because ES6 modules are used.

1. Install the local server:
   ```bash
   npm install
   ```

2. Start the application:
   ```bash
   npm start
   ```

3. Run the unit tests:
   ```bash
   npm test
   ```
