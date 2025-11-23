document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('contentContainer');
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
            renderCardView(data);
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

        if (document.querySelector('input[value="card"]').checked) {
            renderCardView(filteredData, currentQuery);
        } else {
            renderTreeView(filteredData, currentQuery);
        }
    }

    // View Toggle Logic
    viewRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (!jsonData) return;
            refreshView();
        });
    });

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

            const title = document.createElement('h2');
            title.className = 'category-title';
            title.innerHTML = SearchUtils.highlightText(category, query);
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
        if (!isEditMode) card.appendChild(document.createElement('div')); // Spacer or remove if not needed

        return card;
    }

    // --- Tree View Renderer ---
    function renderTreeView(data, query = '') {
        contentContainer.innerHTML = '';

        if (Object.keys(data).length === 0) {
            contentContainer.innerHTML = '<div class="loading">No results found</div>';
            return;
        }

        const treeRoot = document.createElement('div');
        treeRoot.className = 'tree-root';

        // Create tree from root object
        createTreeNodes(data, treeRoot, query);

        contentContainer.appendChild(treeRoot);
    }

    function createTreeNodes(obj, container, query) {
        for (const [key, value] of Object.entries(obj)) {
            // Check if this is a leaf node (item with img)
            if (value.img && typeof value.img === 'string') {
                const leaf = createTreeLeaf(key, value, query);
                container.appendChild(leaf);
                continue;
            }

            // Otherwise it's a branch
            if (typeof value === 'object' && value !== null) {
                const node = document.createElement('div');
                node.className = 'tree-node';

                const item = document.createElement('div');
                item.className = 'tree-item';

                const label = document.createElement('div');
                label.className = 'tree-label';

                const toggle = document.createElement('div');
                toggle.className = 'tree-toggle expanded'; // Default expanded
                toggle.textContent = '▶';

                const keySpan = document.createElement('span');
                keySpan.className = 'tree-key';
                keySpan.innerHTML = SearchUtils.highlightText(key, query);

                const countSpan = document.createElement('span');
                countSpan.className = 'tree-value-obj';
                countSpan.textContent = `{ ... }`;

                label.appendChild(toggle);
                label.appendChild(keySpan);
                label.appendChild(countSpan);

                const childrenContainer = document.createElement('div');
                childrenContainer.className = 'tree-children';

                // Toggle functionality
                label.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const isHidden = childrenContainer.style.display === 'none';
                    childrenContainer.style.display = isHidden ? 'block' : 'none';
                    toggle.classList.toggle('expanded', isHidden);
                });

                item.appendChild(label);
                node.appendChild(item);
                node.appendChild(childrenContainer);

                container.appendChild(node);

                // Recurse
                createTreeNodes(value, childrenContainer, query);
            }
        }
    }

    function createTreeLeaf(key, data, query) {
        const leaf = document.createElement('div');
        leaf.className = 'tree-leaf';

        const imgDiv = document.createElement('div');
        imgDiv.className = 'leaf-image';
        const img = document.createElement('img');
        img.src = `img/${data.img}`;
        img.alt = data.img;
        imgDiv.appendChild(img);

        const contentDiv = document.createElement('div');
        contentDiv.className = 'leaf-content';

        // Key (Context)
        const keyRow = document.createElement('div');
        keyRow.className = 'leaf-row';
        keyRow.innerHTML = `<div class="leaf-key">Context:</div><div class="leaf-val" style="font-weight:bold;">${SearchUtils.highlightText(key, query)}</div>`;
        contentDiv.appendChild(keyRow);

        // Filename
        const fileRow = document.createElement('div');
        fileRow.className = 'leaf-row';
        fileRow.innerHTML = `<div class="leaf-key">File:</div><div class="leaf-val filename">${SearchUtils.highlightText(data.img, query)}</div>`;
        contentDiv.appendChild(fileRow);

        // Text
        const textRow = document.createElement('div');
        textRow.className = 'leaf-row';
        if (isEditMode) {
            textRow.innerHTML = `<div class="leaf-key">Text:</div>`;
            const input = document.createElement('input');
            input.className = 'edit-input';
            input.value = data.text || '';
            input.addEventListener('input', (e) => updateData(`${key}`, 'text', e.target.value, data)); // Note: Path handling in tree view is tricky, simplifying for now
            textRow.appendChild(input);
        } else if (data.text) {
            textRow.innerHTML = `<div class="leaf-key">Text:</div><div class="leaf-val">${SearchUtils.highlightText(data.text, query)}</div>`;
        }
        if (isEditMode || data.text) contentDiv.appendChild(textRow);

        // Para
        const paraRow = document.createElement('div');
        paraRow.className = 'leaf-row';
        if (isEditMode) {
            paraRow.innerHTML = `<div class="leaf-key">Para:</div>`;
            const input = document.createElement('textarea');
            input.className = 'edit-input';
            input.value = data.para || '';
            input.rows = 2;
            input.addEventListener('input', (e) => updateData(`${key}`, 'para', e.target.value, data));
            paraRow.appendChild(input);
        } else if (data.para) {
            paraRow.innerHTML = `<div class="leaf-key">Para:</div><div class="leaf-val">${SearchUtils.highlightText(data.para, query)}</div>`;
        }
        if (isEditMode || data.para) contentDiv.appendChild(paraRow);

        leaf.appendChild(imgDiv);
        leaf.appendChild(contentDiv);

        return leaf;
    }

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
});
