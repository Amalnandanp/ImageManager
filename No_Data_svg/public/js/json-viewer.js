document.addEventListener('DOMContentLoaded', () => {
    const contentContainer = document.getElementById('contentContainer');
    const viewRadios = document.querySelectorAll('input[name="viewMode"]');
    const searchInput = document.getElementById('searchInput');
    let jsonData = null;
    let currentQuery = '';

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

    // Search Logic
    searchInput.addEventListener('input', (e) => {
        currentQuery = e.target.value;
        const filteredData = SearchUtils.search(jsonData, currentQuery);

        if (document.querySelector('input[value="card"]').checked) {
            renderCardView(filteredData, currentQuery);
        } else {
            renderTreeView(filteredData, currentQuery);
        }
    });

    // View Toggle Logic
    viewRadios.forEach(radio => {
        radio.addEventListener('change', (e) => {
            if (!jsonData) return;

            // Re-filter data based on current query
            const dataToRender = currentQuery ? SearchUtils.search(jsonData, currentQuery) : jsonData;

            if (e.target.value === 'card') {
                contentContainer.classList.remove('tree-view');
                contentContainer.classList.add('card-view');
                renderCardView(dataToRender, currentQuery);
            } else {
                contentContainer.classList.remove('card-view');
                contentContainer.classList.add('tree-view');
                renderTreeView(dataToRender, currentQuery);
            }
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

        card.appendChild(pathDiv);
        card.appendChild(imgDiv);
        card.appendChild(contentDiv);
        card.appendChild(fileDiv);

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
        if (data.text) {
            const textRow = document.createElement('div');
            textRow.className = 'leaf-row';
            textRow.innerHTML = `<div class="leaf-key">Text:</div><div class="leaf-val">${SearchUtils.highlightText(data.text, query)}</div>`;
            contentDiv.appendChild(textRow);
        }

        // Para
        if (data.para) {
            const paraRow = document.createElement('div');
            paraRow.className = 'leaf-row';
            paraRow.innerHTML = `<div class="leaf-key">Para:</div><div class="leaf-val">${SearchUtils.highlightText(data.para, query)}</div>`;
            contentDiv.appendChild(paraRow);
        }

        leaf.appendChild(imgDiv);
        leaf.appendChild(contentDiv);

        return leaf;
    }
});
