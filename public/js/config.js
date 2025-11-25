/**
 * Configuration Module
 * Manages application settings using localStorage
 */

const Config = {
    // Default settings
    defaults: {
        imageFolder: 'img/',
        jsonUrl: 'data/image-data.json'
    },

    // Storage key
    STORAGE_KEY: 'svg_tool_config',

    /**
     * Load settings from localStorage or use defaults
     * @returns {Object} The current settings
     */
    load: function () {
        const stored = localStorage.getItem(this.STORAGE_KEY);
        if (stored) {
            try {
                const parsed = JSON.parse(stored);
                // Merge with defaults to ensure all keys exist
                return { ...this.defaults, ...parsed };
            } catch (e) {
                console.error('Failed to parse settings:', e);
                return this.defaults;
            }
        }
        return this.defaults;
    },

    /**
     * Save settings to localStorage
     * @param {Object} settings - The settings to save
     */
    save: function (settings) {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
        // Dispatch event to notify other components
        window.dispatchEvent(new CustomEvent('configChanged', { detail: settings }));
    },

    /**
     * Get a specific setting value
     * @param {String} key - The setting key
     * @returns {*} The setting value
     */
    get: function (key) {
        const settings = this.load();
        return settings[key];
    },

    /**
     * Reset settings to defaults
     */
    reset: function () {
        localStorage.removeItem(this.STORAGE_KEY);
        window.dispatchEvent(new CustomEvent('configChanged', { detail: this.defaults }));
        return this.defaults;
    }
};

// Expose Config globally
window.Config = Config;
