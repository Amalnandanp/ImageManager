document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('contentContainer');
    const sidebarContainer = document.getElementById('sidebarContainer');
    const viewRadios = document.querySelectorAll('input[name="viewMode"]');
    const searchInput = document.getElementById('searchInput');
    const editModeToggle = document.getElementById('editModeToggle');
    const saveBtn = document.getElementById('saveBtn');

    let jsonData = null;
    let currentQuery = '';
    let isEditMode = false;
    let hasUnsavedChanges = false;

    // Load Data
    fetch('data/image-data.json')
        .then(response => response.json())
        .then(data => {
            jsonData = data;
            jsonData = data;
            renderCardView(data);
            renderSidebar(data);
        })
        .catch(error => {
            contentContainer.innerHTML = `<div class="loading" style="color: #dc3545;">Error loading data: ${error.message}</div>`;
        });

    // Edit Mode Toggle
    editModeToggle.addEventListener('change', (e) => {
        isEditMode = e.target.checked;
        refreshView();
    });

    // Save Changes
    saveBtn.addEventListener('click', async () => {
        await saveChanges();
    });

    // Search Logic
    searchInput.addEventListener('input', (e) => {
        currentQuery = e.target.value;
        refreshView();
    });

    function refreshView() {
        const filteredData = currentQuery ? SearchUtils.search(jsonData, currentQuery) : jsonData;
        renderCardView(filteredData, currentQuery);
        renderSidebar(filteredData);
    }

    // --- Card View Renderer ---
    function renderCardView(data, query = '') {
        contentContainer.innerHTML = '';

        if (Object.keys(data).length === 0) {
            contentContainer.innerHTML = '<div class="loading">No results found</div>';
            return;
        }

        // Iterate through top-level categories (hr, settings, etc.)
        for (const [category, catData] of Object.entries(data)) {
            const section = document.createElement('div');
            section.className = `category-section category-${category}`;
            section.id = sanitizeId(category);

            // Get color for this module
            const moduleColor = getModuleColor(category);
            const moduleBgColor = getModuleBgColor(category);

            // Apply background color to section
            section.style.backgroundColor = moduleBgColor;

            const title = document.createElement('h2');
            title.className = 'category-title';
            title.innerHTML = SearchUtils.highlightText(category, query);
            title.style.color = moduleColor;
            title.style.borderBottomColor = moduleColor;
            section.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'cards-grid';

            // Flatten the nested structure to find all items with "img"
            const items = [];
            findItems(catData, [category], items);

            if (items.length === 0) {
                // If category exists but no items (shouldn't happen with search filter but good safety)
                continue;
            } else {
                items.forEach(item => {
                    const card = createCard(item, query);
                    grid.appendChild(card);
                });
            }

            section.appendChild(grid);
            contentContainer.appendChild(section);
        }
    }

    function findItems(obj, path, results) {
        // Check if this object is an item (has 'img')
        if (obj.img && typeof obj.img === 'string') {
            results.push({
                path: path.join(' > '),
                data: obj
            });
            return;
        }

        // Otherwise traverse deeper
        for (const [key, value] of Object.entries(obj)) {
            if (typeof value === 'object' && value !== null) {
                findItems(value, [...path, key], results);
            }
        }
    }

    function createCard(item, query = '') {
        const card = document.createElement('div');
        card.className = 'data-card';
        // Create a unique ID for the card based on its path
        // item.path is like "hr > employee > default"
        card.id = sanitizeId(item.path);

        // Add copy button (positioned absolutely in top-right)
        const copyBtn = document.createElement('button');
        copyBtn.className = 'copy-btn-icon';
        copyBtn.innerHTML = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
            <rect x="5" y="5" width="9" height="9" rx="1.5" stroke="currentColor" stroke-width="1.5" fill="none"/>
            <path d="M3 10.5V3.5C3 2.67157 3.67157 2 4.5 2H10.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>
        </svg>`;
        copyBtn.title = 'Copy as TypeScript variables';
        copyBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            copyCardPath(item.path);
        });
        card.appendChild(copyBtn);

        const pathDiv = document.createElement('div');
        pathDiv.className = 'card-path';
        // Remove the top-level category from path for cleaner display since it's already grouped
        const displayPath = item.path.split(' > ').slice(1).join(' > ');
        pathDiv.innerHTML = SearchUtils.highlightText(displayPath || 'default', query);

        const imgDiv = document.createElement('div');
        imgDiv.className = 'card-image';
        const img = document.createElement('img');
        img.src = `img/${item.data.img}`;
        img.alt = item.data.img;
        img.onerror = () => { img.src = 'data:image/svg+xml,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100"><rect width="100%" height="100%" fill="%23eee"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="%23999">No Image</text></svg>'; };
        imgDiv.appendChild(img);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'card-content';

        if (isEditMode) {
            // Edit Mode Inputs
            const textInput = document.createElement('input');
            textInput.type = 'text';
            textInput.className = 'edit-input';
            textInput.value = item.data.text || '';
            textInput.placeholder = 'Heading';
            textInput.addEventListener('input', (e) => updateData(item.path, 'text', e.target.value));
            contentDiv.appendChild(textInput);

            const paraInput = document.createElement('textarea');
            paraInput.className = 'edit-input';
            paraInput.value = item.data.para || '';
            paraInput.placeholder = 'Paragraph';
            paraInput.rows = 3;
            paraInput.addEventListener('input', (e) => updateData(item.path, 'para', e.target.value));
            contentDiv.appendChild(paraInput);

            const fileInput = document.createElement('input');
            fileInput.type = 'text';
            fileInput.className = 'edit-input filename';
            fileInput.value = item.data.img;
            fileInput.placeholder = 'Image Filename';
            fileInput.addEventListener('change', (e) => {
                updateData(item.path, 'img', e.target.value);
                img.src = `img/${e.target.value}`; // Update preview
            });
            contentDiv.appendChild(fileInput);

        } else {
            // View Mode Display
            if (item.data.text) {
                const h3 = document.createElement('h3');
                h3.innerHTML = SearchUtils.highlightText(item.data.text, query);
                contentDiv.appendChild(h3);
            }

            if (item.data.para) {
                const p = document.createElement('p');
                p.innerHTML = SearchUtils.highlightText(item.data.para, query);
                contentDiv.appendChild(p);
            }

            const fileDiv = document.createElement('div');
            fileDiv.className = 'card-filename';
            fileDiv.innerHTML = SearchUtils.highlightText(item.data.img, query);
            contentDiv.appendChild(fileDiv);
        }

        card.appendChild(pathDiv);
        card.appendChild(imgDiv);
        card.appendChild(contentDiv);

        return card;
    }

    // --- Tree View Renderer ---


    // --- Data Update & Save Logic ---

    function updateData(path, field, value, directObj = null) {
        if (directObj) {
            // Direct object update (used in Tree View for simplicity)
            directObj[field] = value;
        } else {
            // Path-based update (used in Card View)
            const keys = path.split(' > ');
            let current = jsonData;
            for (let i = 0; i < keys.length; i++) {
                if (i === keys.length - 1) {
                    current[keys[i]][field] = value;
                } else {
                    current = current[keys[i]];
                }
            }
        }

        hasUnsavedChanges = true;
        saveBtn.disabled = false;
    }

    async function saveChanges() {
        const jsonString = JSON.stringify(jsonData, null, 2);

        try {
            // Try File System Access API
            if (window.showSaveFilePicker) {
                const handle = await window.showSaveFilePicker({
                    suggestedName: 'image-data.json',
                    types: [{
                        description: 'JSON File',
                        accept: { 'application/json': ['.json'] },
                    }],
                });
                const writable = await handle.createWritable();
                await writable.write(jsonString);
                await writable.close();
                alert('File saved successfully!');
            } else {
                // Fallback: Download
                const blob = new Blob([jsonString], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = 'image-data.json';
                document.body.appendChild(a);
                a.click();
                document.body.removeChild(a);
                URL.revokeObjectURL(url);
                alert('Changes downloaded. Please replace your existing image-data.json file.');
            }

            hasUnsavedChanges = false;
            saveBtn.disabled = true;

        } catch (err) {
            if (err.name !== 'AbortError') {
                console.error('Error saving file:', err);
                alert('Failed to save file. See console for details.');
            }
        }
    }
    // --- Sidebar Renderer ---
    function renderSidebar(data) {
        sidebarContainer.innerHTML = '';

        const title = document.createElement('div');
        title.className = 'sidebar-title';
        title.textContent = 'Navigation';
        sidebarContainer.appendChild(title);

        const tree = document.createElement('div');
        tree.className = 'sidebar-tree';

        // Level 1: Module
        for (const [module, moduleData] of Object.entries(data)) {
            const moduleColor = getModuleColor(module);
            const moduleBgColor = getModuleBgColor(module);

            // Create a wrapper for the entire module section
            const moduleWrapper = document.createElement('div');
            moduleWrapper.className = 'sidebar-module-wrapper';
            moduleWrapper.style.backgroundColor = moduleBgColor;
            moduleWrapper.style.borderTop = `3px solid ${moduleColor}`;
            moduleWrapper.style.borderRadius = '4px';
            moduleWrapper.style.padding = '8px';
            moduleWrapper.style.marginBottom = '8px';

            const moduleNode = document.createElement('div');

            const moduleTitle = document.createElement('div');
            moduleTitle.className = 'sidebar-group-title';
            moduleTitle.innerHTML = `<span class="sidebar-toggle expanded">▶</span> <span title="${module}">${module}</span>`;
            moduleTitle.style.color = moduleColor;
            moduleTitle.style.fontWeight = 'bold';
            moduleTitle.style.backgroundColor = 'transparent'; // Remove individual background

            const moduleChildren = document.createElement('div');
            moduleChildren.className = 'sidebar-node';

            // Toggle logic
            moduleTitle.addEventListener('click', (e) => {
                e.stopPropagation();
                const isHidden = moduleChildren.style.display === 'none';
                moduleChildren.style.display = isHidden ? 'block' : 'none';
                moduleTitle.querySelector('.sidebar-toggle').classList.toggle('expanded', isHidden);
            });

            // Scroll to module section
            moduleTitle.addEventListener('click', (e) => {
                // Only scroll if not clicking the toggle directly (optional, but good UX)
                // Actually, let's make the text span clickable for scrolling
            });
            const moduleTextSpan = moduleTitle.querySelector('span:last-child');
            moduleTextSpan.addEventListener('click', (e) => {
                e.stopPropagation();
                scrollToElement(sanitizeId(module));
            });

            moduleNode.appendChild(moduleTitle);

            // Level 2: Feature
            if (typeof moduleData === 'object' && moduleData !== null) {
                for (const [feature, featureData] of Object.entries(moduleData)) {
                    // Skip if featureData is not an object (e.g. if it's a direct property, though unlikely in this structure)
                    if (typeof featureData !== 'object' || featureData === null) continue;

                    const featureNode = document.createElement('div');

                    const featureTitle = document.createElement('div');
                    featureTitle.className = 'sidebar-group-title';
                    featureTitle.style.fontSize = '13px';
                    featureTitle.style.color = '#555';
                    featureTitle.innerHTML = `<span class="sidebar-toggle expanded">▶</span> <span title="${feature}">${feature}</span>`;

                    const featureChildren = document.createElement('div');
                    featureChildren.className = 'sidebar-node';

                    featureTitle.addEventListener('click', (e) => {
                        e.stopPropagation();
                        const isHidden = featureChildren.style.display === 'none';
                        featureChildren.style.display = isHidden ? 'block' : 'none';
                        featureTitle.querySelector('.sidebar-toggle').classList.toggle('expanded', isHidden);
                    });

                    featureNode.appendChild(featureTitle);

                    // Level 3: Status (Leaf nodes or close to it)
                    for (const [status, statusData] of Object.entries(featureData)) {
                        // Check if this is the content node (has img/text)
                        // In the JSON structure: hr -> employee -> default (content)
                        // So status is the key "default"

                        const itemPath = `${module} > ${feature} > ${status}`;
                        const itemId = sanitizeId(itemPath);

                        const statusItem = document.createElement('a');
                        statusItem.className = 'sidebar-item';
                        statusItem.textContent = status;
                        statusItem.title = status; // Tooltip for long names

                        statusItem.addEventListener('click', (e) => {
                            e.preventDefault();
                            e.stopPropagation();

                            // Highlight active item
                            document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'));
                            statusItem.classList.add('active');

                            scrollToElement(itemId);
                        });

                        featureChildren.appendChild(statusItem);
                    }

                    featureNode.appendChild(featureChildren);
                    moduleChildren.appendChild(featureNode);
                }
            }

            moduleNode.appendChild(moduleChildren);
            moduleWrapper.appendChild(moduleNode);
            tree.appendChild(moduleWrapper);
        }

        sidebarContainer.appendChild(tree);
    }

    function scrollToElement(id) {
        const element = document.getElementById(id);
        if (element) {
            // Scroll with offset for sticky header if needed, or just scrollIntoView
            element.scrollIntoView({ behavior: 'smooth', block: 'start' });

            // Highlight the card temporarily
            element.style.transition = 'box-shadow 0.5s';
            element.style.boxShadow = '0 0 0 4px rgba(33, 150, 243, 0.5)';
            setTimeout(() => {
                element.style.boxShadow = '';
            }, 2000);
        } else {
            console.warn('Element not found:', id);
        }
    }

    function sanitizeId(str) {
        // Replace " > " with "-" and other non-alphanumeric chars with "-"
        return 'node-' + str.replace(/\s>\s/g, '-').replace(/[^a-zA-Z0-9-_]/g, '-').toLowerCase();
    }

    function getModuleColor(moduleName) {
        // Map module names to CSS variables
        const colorMap = {
            'hr': '--color-hr',
            'settings': '--color-settings',
            'profile': '--color-profile',
            'request': '--color-request',
            'other': '--color-other',
            'shared': '--color-shared'
        };

        // Get the CSS variable name for this module
        const cssVarName = colorMap[moduleName.toLowerCase()];

        if (cssVarName) {
            // Get the computed value of the CSS variable
            return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
        }

        // Fallback: generate a color from a palette if module not in map
        const fallbackColors = [
            '#009688', // Teal
            '#673ab7', // Deep Purple
            '#f44336', // Red
            '#3f51b5', // Indigo
            '#795548', // Brown
            '#607d8b'  // Blue Grey
        ];

        let hash = 0;
        for (let i = 0; i < moduleName.length; i++) {
            hash = moduleName.charCodeAt(i) + ((hash << 5) - hash);
        }

        const index = Math.abs(hash) % fallbackColors.length;
        return fallbackColors[index];
    }

    function getModuleBgColor(moduleName) {
        // Map module names to background CSS variables
        const bgColorMap = {
            'hr': '--bg-hr',
            'settings': '--bg-settings',
            'profile': '--bg-profile',
            'request': '--bg-request',
            'other': '--bg-other',
            'shared': '--bg-shared'
        };

        // Get the CSS variable name for this module
        const cssVarName = bgColorMap[moduleName.toLowerCase()];

        if (cssVarName) {
            // Get the computed value of the CSS variable
            return getComputedStyle(document.documentElement).getPropertyValue(cssVarName).trim();
        }

        // Fallback: return a light gray background
        return '#f9f9f9';
    }

    function copyCardPath(path) {
        // Parse the path: "hr > employee > default"
        const parts = path.split(' > ');

        let moduleName = '';
        let pageName = '';
        let currentStatus = '';

        if (parts.length >= 1) moduleName = parts[0];
        if (parts.length >= 2) pageName = parts[1];
        if (parts.length >= 3) currentStatus = parts[2];

        // Find all statuses for this module+page combination in the JSON data
        const allStatuses = [];
        if (jsonData && jsonData[moduleName] && jsonData[moduleName][pageName]) {
            const pageData = jsonData[moduleName][pageName];
            for (const status in pageData) {
                if (pageData.hasOwnProperty(status)) {
                    allStatuses.push(status);
                }
            }
        }

        // Build TypeScript code
        let tsCode = `moduleName: any = '${moduleName}';\npageName: any = '${pageName}';\n`;

        if (allStatuses.length === 1) {
            // Single status - use noDataStatus
            tsCode += `noDataStatus: any = '${allStatuses[0]}';`;
        } else if (allStatuses.length > 1) {
            // Multiple statuses - use noDataStatus, noDataStatus1, noDataStatus2, etc.
            allStatuses.forEach((status, index) => {
                const varName = index === 0 ? 'noDataStatus' : `noDataStatus${index}`;
                tsCode += `${varName}: any = '${status}';\n`;
            });
            // Remove trailing newline
            tsCode = tsCode.trimEnd();
        } else {
            // No statuses found (shouldn't happen, but fallback)
            tsCode += `noDataStatus: any = '${currentStatus}';`;
        }

        // Copy to clipboard
        navigator.clipboard.writeText(tsCode).then(() => {
            // Show success feedback
            showCopyFeedback('Copied to clipboard!');
        }).catch(err => {
            console.error('Failed to copy:', err);
            showCopyFeedback('Failed to copy', true);
        });
    }

    function showCopyFeedback(message, isError = false) {
        // Create temporary feedback element
        const feedback = document.createElement('div');
        feedback.className = 'copy-feedback';
        feedback.textContent = message;
        feedback.style.position = 'fixed';
        feedback.style.top = '20px';
        feedback.style.right = '20px';
        feedback.style.padding = '12px 20px';
        feedback.style.backgroundColor = isError ? '#f44336' : '#4caf50';
        feedback.style.color = 'white';
        feedback.style.borderRadius = '4px';
        feedback.style.boxShadow = '0 2px 8px rgba(0,0,0,0.2)';
        feedback.style.zIndex = '10000';
        feedback.style.fontSize = '14px';
        feedback.style.fontWeight = 'bold';

        document.body.appendChild(feedback);

        setTimeout(() => {
            feedback.style.transition = 'opacity 0.3s';
            feedback.style.opacity = '0';
            setTimeout(() => {
                document.body.removeChild(feedback);
            }, 300);
        }, 2000);
    }

});
