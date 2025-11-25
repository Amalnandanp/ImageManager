/**
 * Common Navbar Component
 * Usage: <app-navbar page="home|json-viewer|settings"></app-navbar>
 */
class AppNavbar extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        const activePage = this.getAttribute('page') || 'home';
        this.render(activePage);
    }

    render(activePage) {
        this.innerHTML = `
            <nav class="app-navbar">
                <a href="index.html" class="navbar-brand">
                    <span style="font-size: 20px;">🛠️</span>
                    <span>SVG Tool</span>
                </a>

                <div class="navbar-links">
                    <a href="index.html" class="nav-link ${activePage === 'home' ? 'active' : ''}">
                        <span class="nav-icon">🏠</span>
                        <span>Home</span>
                    </a>
                    <a href="json-viewer.html" class="nav-link ${activePage === 'json-viewer' ? 'active' : ''}">
                        <span class="nav-icon">📊</span>
                        <span>JSON Viewer</span>
                    </a>
                    <a href="settings.html" class="nav-link ${activePage === 'settings' ? 'active' : ''}">
                        <span class="nav-icon">⚙️</span>
                        <span>Settings</span>
                    </a>
                </div>
            </nav>
        `;
    }
}

// Define the custom element
customElements.define('app-navbar', AppNavbar);
