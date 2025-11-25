/**
 * Database Module
 * Handles IndexedDB operations for persistent local file access
 */

const DB = {
    dbName: 'SVGToolDB',
    dbVersion: 1,
    db: null,

    /**
     * Initialize the database
     * @returns {Promise} Resolves when DB is ready
     */
    init: function () {
        return new Promise((resolve, reject) => {
            if (this.db) {
                resolve(this.db);
                return;
            }

            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = (event) => {
                console.error('IndexedDB error:', event.target.error);
                reject(event.target.error);
            };

            request.onsuccess = (event) => {
                this.db = event.target.result;
                console.log('IndexedDB initialized');
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Store JSON file handle
                if (!db.objectStoreNames.contains('files')) {
                    db.createObjectStore('files');
                }

                // Store Image file handles
                if (!db.objectStoreNames.contains('images')) {
                    db.createObjectStore('images');
                }
            };
        });
    },

    /**
     * Store the JSON data file
     * @param {File} file - The JSON file object
     * @returns {Promise}
     */
    setJsonFile: function (file) {
        return this.performTransaction('files', 'readwrite', (store) => {
            store.put(file, 'jsonFile');
        });
    },

    /**
     * Retrieve the JSON data file
     * @returns {Promise<File>}
     */
    getJsonFile: function () {
        return this.performTransaction('files', 'readonly', (store) => {
            return store.get('jsonFile');
        });
    },

    /**
     * Store a list of image files
     * @param {FileList} fileList - The list of image files
     * @returns {Promise}
     */
    setImageFiles: function (fileList) {
        return new Promise(async (resolve, reject) => {
            await this.init();
            const transaction = this.db.transaction(['images'], 'readwrite');
            const store = transaction.objectStore('images');

            // Clear existing images first
            store.clear().onsuccess = () => {
                let count = 0;
                Array.from(fileList).forEach(file => {
                    // Only store image files
                    if (file.type.startsWith('image/') || file.name.endsWith('.svg')) {
                        store.put(file, file.name);
                        count++;
                    }
                });

                transaction.oncomplete = () => {
                    console.log(`Stored ${count} images in DB`);
                    resolve(count);
                };
            };

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    /**
     * Retrieve a specific image file
     * @param {String} filename - The name of the file
     * @returns {Promise<File>}
     */
    getImageFile: function (filename) {
        return this.performTransaction('images', 'readonly', (store) => {
            return store.get(filename);
        });
    },

    /**
     * Helper to perform a transaction
     */
    performTransaction: function (storeName, mode, callback) {
        return new Promise(async (resolve, reject) => {
            await this.init();
            const transaction = this.db.transaction([storeName], mode);
            const store = transaction.objectStore(storeName);

            let request;
            try {
                request = callback(store);
            } catch (e) {
                reject(e);
                return;
            }

            if (request) {
                request.onsuccess = (event) => {
                    resolve(event.target.result);
                };
                request.onerror = (event) => {
                    reject(event.target.error);
                };
            } else {
                transaction.oncomplete = () => {
                    resolve();
                };
            }

            transaction.onerror = (event) => {
                reject(event.target.error);
            };
        });
    },

    /**
     * Clear all data
     */
    clear: function () {
        return new Promise(async (resolve, reject) => {
            await this.init();
            const transaction = this.db.transaction(['files', 'images'], 'readwrite');
            transaction.objectStore('files').clear();
            transaction.objectStore('images').clear();
            transaction.oncomplete = () => resolve();
            transaction.onerror = (e) => reject(e);
        });
    }
};

// Expose globally
window.DB = DB;
