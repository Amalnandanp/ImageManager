/**
 * Search Logic for JSON Viewer
 */

const SearchUtils = {
    /**
     * Performs a search on the JSON data
     * @param {Object} data - The full JSON data object
     * @param {String} query - The search query
     * @returns {Object} - Filtered data containing only matching items (preserving structure)
     */
    search: function (data, query) {
        if (!query || query.trim() === '') {
            return data;
        }

        const normalizedQuery = query.toLowerCase().trim();
        const result = {};
        let hasMatch = false;

        for (const [key, value] of Object.entries(data)) {
            // If it's an item (has img), check if it matches
            if (value.img && typeof value.img === 'string') {
                if (this.isMatch(key, value, normalizedQuery)) {
                    result[key] = value;
                    hasMatch = true;
                }
            }
            // If it's a category/object, recurse
            else if (typeof value === 'object' && value !== null) {
                const subResult = this.search(value, normalizedQuery);
                if (Object.keys(subResult).length > 0) {
                    result[key] = subResult;
                    hasMatch = true;
                }
            }
        }

        return result;
    },

    /**
     * Checks if an item matches the query
     * @param {String} key - The key of the item (context)
     * @param {Object} item - The item object (containing img, text, para)
     * @param {String} query - The normalized search query
     * @returns {Boolean}
     */
    isMatch: function (key, item, query) {
        // Check key (context)
        if (this.fuzzyMatch(key, query)) return true;

        // Check image filename
        if (item.img && this.fuzzyMatch(item.img, query)) return true;

        // Check text
        if (item.text && this.fuzzyMatch(item.text, query)) return true;

        // Check para
        if (item.para && this.fuzzyMatch(item.para, query)) return true;

        return false;
    },

    /**
     * Simple fuzzy match: checks if all query terms are present in the text
     * @param {String} text - The text to search in
     * @param {String} query - The search query
     * @returns {Boolean}
     */
    fuzzyMatch: function (text, query) {
        if (!text) return false;
        const normalizedText = String(text).toLowerCase();
        const normalizedQuery = String(query).toLowerCase();

        // Split query into terms (e.g., "hr employee" -> ["hr", "employee"])
        const terms = normalizedQuery.split(/\s+/);

        // Check if ALL terms are present in the text
        return terms.every(term => normalizedText.includes(term));
    },

    /**
     * Highlights matching text in a string
     * @param {String} text - The original text
     * @param {String} query - The search query
     * @returns {String} - HTML string with highlighted matches
     */
    highlightText: function (text, query) {
        if (!text || !query || query.trim() === '') return text;

        const terms = query.toLowerCase().trim().split(/\s+/).filter(t => t.length > 0);
        if (terms.length === 0) return text;

        let highlightedText = text;

        // Sort terms by length (descending) to avoid replacing inside already replaced tags
        // This is a simple implementation and might have edge cases with overlapping terms
        terms.sort((a, b) => b.length - a.length);

        terms.forEach(term => {
            // Escape special regex characters
            const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            const regex = new RegExp(`(${escapedTerm})`, 'gi');
            highlightedText = highlightedText.replace(regex, '<span class="highlight">$1</span>');
        });

        return highlightedText;
    }
};
