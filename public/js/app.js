// CONFIGURATION: Set the range for missing image detection
// Requires: config.js, db.js
const BG_START = 1;    // Start number (bg1)
let BG_END = 1;        // Will be auto-detected from actual files

// Array to track images with incorrect dimensions
const incorrectDimensionImages = [];

// Image usage data from JSON
let imageUsageData = {};

// Array to store discovered image files
let svgFiles = [];

// Guide line settings
const guideSettings = {
    enableCorrectDimensionCheck: true,
    centerVertical: true,
    centerHorizontal: true,
    verticalDivisions: false,
    horizontalDivisions: false,
    verticalDivisionCount: 3,
    horizontalDivisionCount: 3,
    showVisualCenter: false,
    usageFilter: 'all', // 'all', 'used', 'unused'
    dimensionFilters: {
        correct: true,
        incorrect: true
    },
    categoryFilters: {
        hr: true,
        settings: true,
        profile: true,
        request: true,
        other: true,
        shared: true
    },
    padding: {
        all: false,
        top: false,
        right: false,
        bottom: false,
        left: false,
        xAxis: false,
        yAxis: false
    },
    paddingValues: {
        all: 15,
        top: 10,
        right: 10,
        bottom: 10,
        left: 10
    }
};

// Function to automatically discover all SVG files in the img folder
async function discoverImageFiles() {
    const imgFolder = Config.get('imageFolder');

    // Try to load the file list from a generated JSON file first
    try {
        const response = await fetch(`${imgFolder}file-list.json`);
        if (response.ok) {
            const data = await response.json();
            console.log('✅ Loaded file list from file-list.json');

            // Extract max bg number from the files
            let maxBgNumber = 0;
            data.files.forEach(filename => {
                const match = filename.match(/^bg(\d+)\.svg$/);
                if (match) {
                    const num = parseInt(match[1]);
                    if (num > maxBgNumber) {
                        maxBgNumber = num;
                    }
                }
            });
            BG_END = maxBgNumber;
            console.log(`📊 Detected bg range: bg${BG_START}.svg to bg${BG_END}.svg`);

            return data.files.map(f => imgFolder + f);
        }
    } catch (e) {
        console.log('No file-list.json found, trying alternative methods...');
    }

    // Fallback: Try to detect files by probing
    // Start with a reasonable upper limit and probe to find the max
    const probeLimit = 200;
    const patterns = [];

    // Add bg files from BG_START to probeLimit
    for (let i = BG_START; i <= probeLimit; i++) {
        patterns.push(`bg${i}.svg`);
    }

    // Add required utility files
    patterns.push('filter.svg', 'search.svg');

    // Test each file to see if it exists
    const existenceChecks = patterns.map(async (filename) => {
        try {
            const response = await fetch(imgFolder + filename, { method: 'HEAD' });
            if (response.ok) {
                return filename;
            }
        } catch (e) {
            return null;
        }
        return null;
    });

    const results = await Promise.all(existenceChecks);
    const existingFiles = results.filter(f => f !== null);

    // Find the maximum bg number from existing files
    let maxBgNumber = 0;
    existingFiles.forEach(filename => {
        const match = filename.match(/^bg(\d+)\.svg$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num > maxBgNumber) {
                maxBgNumber = num;
            }
        }
    });
    BG_END = maxBgNumber;

    console.log(`✅ Discovered ${existingFiles.length} SVG files`);
    console.log(`📊 Detected bg range: bg${BG_START}.svg to bg${BG_END}.svg`);

    return existingFiles.map(f => imgFolder + f);
}

function createImageItem(filepath) {
    const imageItem = document.createElement('div');
    imageItem.className = 'image-item';

    // Extract just the filename from the path
    const filename = filepath.split('/').pop();

    const imageContainer = document.createElement('div');
    imageContainer.className = 'image-container';

    const img = document.createElement('img');
    img.src = filepath;
    img.alt = filename;

    const gridOverlay = document.createElement('div');
    gridOverlay.className = 'grid-overlay';

    // Create and append guide lines
    updateGuideLines(gridOverlay);

    imageContainer.appendChild(img);
    imageContainer.appendChild(gridOverlay);

    const imageInfo = document.createElement('div');
    imageInfo.className = 'image-info';

    const filenameDiv = document.createElement('div');
    filenameDiv.className = 'filename';
    filenameDiv.textContent = filename;

    const dimensionsDiv = document.createElement('div');
    dimensionsDiv.className = 'dimensions';
    dimensionsDiv.textContent = 'Loading...';

    img.onload = function () {
        const width = this.naturalWidth || this.width;
        const height = this.naturalHeight || this.height;

        dimensionsDiv.textContent = `${width} × ${height}px`;

        // Check if dimensions are 196x121 and add correct-dimensions class
        if (width === 196 && height === 121) {
            if (guideSettings.enableCorrectDimensionCheck) {
                imageItem.classList.add('correct-dimensions');
            }
        } else {
            // Add to incorrect dimensions list
            incorrectDimensionImages.push({
                filename: filename,
                width: width,
                height: height
            });
            updateIncorrectDimensionsList();
        }
    };

    img.onerror = function () {
        dimensionsDiv.textContent = 'File not found';
    };

    imageInfo.appendChild(filenameDiv);
    imageInfo.appendChild(dimensionsDiv);

    // Add breadcrumb information
    const breadcrumbDiv = document.createElement('div');
    breadcrumbDiv.className = 'breadcrumb-info';

    // Try to find usage data with both .svg and .png extensions
    const baseFilename = filename.replace(/\.(svg|png)$/i, '');
    const usagePaths = imageUsageData[filename] ||
        imageUsageData[baseFilename + '.png'] ||
        imageUsageData[baseFilename + '.svg'] ||
        [];

    if (usagePaths.length > 0) {
        usagePaths.forEach(path => {
            const category = path.split(' > ')[0].toLowerCase();

            // Only show breadcrumb if category is enabled
            if (['hr', 'settings', 'profile', 'request', 'other', 'shared'].includes(category) &&
                guideSettings.categoryFilters[category]) {
                const pathSpan = document.createElement('span');
                pathSpan.className = 'breadcrumb-path';
                pathSpan.classList.add(`category-${category}`);
                pathSpan.textContent = path;
                breadcrumbDiv.appendChild(pathSpan);
            }
        });
    }

    // Only append breadcrumb div if it has content
    if (breadcrumbDiv.children.length > 0) {
        imageInfo.appendChild(breadcrumbDiv);
    }

    imageItem.appendChild(imageContainer);
    imageItem.appendChild(imageInfo);

    return imageItem;
}

// Function to find missing images between configurable range
function findMissingImages() {
    const existingNumbers = [];
    const missingNumbers = [];

    // Extract numbers from bg files in our list
    svgFiles.forEach(filepath => {
        // Extract just the filename from the path
        const filename = filepath.split('/').pop();
        const match = filename.match(/^bg(\d+)\.svg$/);
        if (match) {
            const num = parseInt(match[1]);
            if (num >= BG_START && num <= BG_END) {
                existingNumbers.push(num);
            }
        }
    });

    // Find missing numbers between BG_START and BG_END
    for (let i = BG_START; i <= BG_END; i++) {
        if (!existingNumbers.includes(i)) {
            missingNumbers.push(i);
        }
    }

    return missingNumbers;
}

// Display missing images
function displayMissingImages() {
    const missingNumbers = findMissingImages();
    const missingList = document.getElementById('missingList');
    const missingSection = document.getElementById('missingImages');
    const missingTitle = document.getElementById('missingTitle');

    // Update title with current range and count
    if (missingNumbers.length === 0) {
        missingSection.style.display = 'none';
    } else {
        missingSection.style.display = 'block';
        missingTitle.textContent = `Missing Names (${missingNumbers.length})`;
    }
    missingNumbers.forEach(num => {
        const missingItem = document.createElement('li');
        missingItem.className = 'missing-item';
        // Show only the number without extension for compact display
        missingItem.textContent = `bg${num}`;
        missingItem.title = `bg${num}.svg`; // Tooltip shows full name
        missingList.appendChild(missingItem);
    });
}

// Update incorrect dimensions list
function updateIncorrectDimensionsList() {
    const incorrectList = document.getElementById('incorrectList');
    const incorrectSection = document.getElementById('incorrectDimensions');

    // Clear existing items
    incorrectList.innerHTML = '';

    // Update title with count
    const incorrectTitle = document.getElementById('incorrectDimensionsTitle');

    if (incorrectDimensionImages.length === 0) {
        incorrectSection.style.display = 'none';
    } else {
        incorrectSection.style.display = 'block';
        incorrectTitle.textContent = `Incorrect Dimensions (${incorrectDimensionImages.length})`;

        // Sort incorrect dimensions in numerical order
        const sortedIncorrectImages = incorrectDimensionImages.sort((a, b) => {
            const aMatch = a.filename.match(/^([a-zA-Z]+)(\d+)\.svg$/);
            const bMatch = b.filename.match(/^([a-zA-Z]+)(\d+)\.svg$/);

            if (aMatch && bMatch) {
                const aPrefix = aMatch[1];
                const bPrefix = bMatch[1];
                const aNum = parseInt(aMatch[2]);
                const bNum = parseInt(bMatch[2]);

                // First sort by prefix
                if (aPrefix !== bPrefix) {
                    return aPrefix.localeCompare(bPrefix);
                }
                // Then sort by number
                return aNum - bNum;
            }

            // Fallback to alphabetical sorting for non-numbered files
            return a.filename.localeCompare(b.filename);
        });

        sortedIncorrectImages.forEach(item => {
            const incorrectItem = document.createElement('li');
            incorrectItem.className = 'compact-incorrect-item';
            // Show only filename without extension
            const displayName = item.filename.replace('.svg', '');
            incorrectItem.textContent = displayName;
            incorrectItem.title = `${item.filename} (${item.width}×${item.height})`; // Tooltip

            // Add click to scroll functionality
            incorrectItem.addEventListener('click', () => {
                scrollToImage(item.filename);
            });

            incorrectList.appendChild(incorrectItem);
        });
    }
}

// Scroll to specific image in the grid
function scrollToImage(filename) {
    const imageItems = document.querySelectorAll('.image-item');
    imageItems.forEach(item => {
        const filenameElement = item.querySelector('.filename');
        if (filenameElement && filenameElement.textContent === filename) {
            item.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });
            // Highlight the image briefly
            item.style.boxShadow = '0 0 20px #ff6600';
            setTimeout(() => {
                item.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
            }, 2000);
        }
    });
}

// Function to create guide lines based on settings
function updateGuideLines(overlay) {
    // Clear existing lines
    overlay.innerHTML = '';

    // Center guidelines
    if (guideSettings.centerVertical) {
        const verticalLine = document.createElement('div');
        verticalLine.className = 'grid-line-v';
        overlay.appendChild(verticalLine);
    }

    if (guideSettings.centerHorizontal) {
        const horizontalLine = document.createElement('div');
        horizontalLine.className = 'grid-line-h';
        overlay.appendChild(horizontalLine);
    }

    // Division guidelines
    if (guideSettings.verticalDivisions) {
        for (let i = 1; i < guideSettings.verticalDivisionCount; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line-division-v';
            line.style.left = `${(i / guideSettings.verticalDivisionCount) * 100}%`;
            overlay.appendChild(line);
        }
    }

    if (guideSettings.horizontalDivisions) {
        for (let i = 1; i < guideSettings.horizontalDivisionCount; i++) {
            const line = document.createElement('div');
            line.className = 'grid-line-division-h';
            line.style.top = `${(i / guideSettings.horizontalDivisionCount) * 100}%`;
            overlay.appendChild(line);
        }
    }

    // Padding guidelines
    const paddingChecks = [
        {
            enabled: guideSettings.padding.all || guideSettings.padding.top,
            class: 'padding-line-top',
            style: 'top',
            value: guideSettings.paddingValues.top
        },
        {
            enabled: guideSettings.padding.all || guideSettings.padding.bottom,
            class: 'padding-line-bottom',
            style: 'bottom',
            value: guideSettings.paddingValues.bottom
        },
        {
            enabled: guideSettings.padding.all || guideSettings.padding.left,
            class: 'padding-line-left',
            style: 'left',
            value: guideSettings.paddingValues.left
        },
        {
            enabled: guideSettings.padding.all || guideSettings.padding.right,
            class: 'padding-line-right',
            style: 'right',
            value: guideSettings.paddingValues.right
        }
    ];

    paddingChecks.forEach(check => {
        if (check.enabled) {
            const line = document.createElement('div');
            line.className = check.class;
            line.style[check.style] = `${check.value}px`;
            overlay.appendChild(line);
        }
    });

    // Visual center marker
    if (guideSettings.showVisualCenter) {
        addVisualCenterMarker(overlay);
    }
}

// Function to add visual center marker
function addVisualCenterMarker(overlay) {
    const imageContainer = overlay.parentElement;
    const img = imageContainer.querySelector('img');

    if (img) {
        if (img.complete && img.naturalWidth > 0) {
            // Image is loaded, analyze immediately
            if (img.src.endsWith('.svg')) {
                analyzeAndMarkSVGCenter(img, overlay);
            }
        } else {
            // Wait for image to load
            const loadHandler = () => {
                if (img.src.endsWith('.svg')) {
                    analyzeAndMarkSVGCenter(img, overlay);
                }
                img.removeEventListener('load', loadHandler);
            };

            const errorHandler = () => {
                // If image fails to load, still show estimated center
                addEstimatedVisualCenter(img, overlay);
                img.removeEventListener('error', errorHandler);
                img.removeEventListener('load', loadHandler);
            };

            img.addEventListener('load', loadHandler);
            img.addEventListener('error', errorHandler);

            // Fallback timeout in case events don't fire
            setTimeout(() => {
                if (!overlay.querySelector('.visual-center-marker')) {
                    addEstimatedVisualCenter(img, overlay);
                }
            }, 2000);
        }
    }
}

// Function to analyze SVG and mark visual center
function analyzeAndMarkSVGCenter(img, overlay) {
    // First try the direct method (works when served via HTTP)
    tryDirectSVGAnalysis(img, overlay)
        .catch(() => {
            // Fallback: Use embedded SVG method (works with file:// protocol)
            tryEmbeddedSVGAnalysis(img, overlay);
        });
}

// Direct SVG analysis using fetch (works with live server)
function tryDirectSVGAnalysis(img, overlay) {
    return fetch(img.src)
        .then(response => {
            if (!response.ok) throw new Error('Fetch failed');
            return response.text();
        })
        .then(svgText => {
            analyzeSVGContent(svgText, overlay);
        });
}

// Embedded SVG analysis (works with file:// protocol)
function tryEmbeddedSVGAnalysis(img, overlay) {
    // Create a new image element to load the SVG as an object
    const object = document.createElement('object');
    object.data = img.src;
    object.type = 'image/svg+xml';
    object.style.position = 'absolute';
    object.style.visibility = 'hidden';
    object.style.width = '0';
    object.style.height = '0';

    object.onload = function () {
        try {
            const svgDoc = object.contentDocument;
            if (svgDoc) {
                const svgElement = svgDoc.documentElement;
                analyzeSVGElement(svgElement, overlay);
            } else {
                // Final fallback: estimate visual center based on filename patterns
                addEstimatedVisualCenter(img, overlay);
            }
        } catch (error) {
            console.warn('Could not analyze embedded SVG:', error);
            addEstimatedVisualCenter(img, overlay);
        } finally {
            document.body.removeChild(object);
        }
    };

    object.onerror = function () {
        console.warn('Could not load SVG as object');
        addEstimatedVisualCenter(img, overlay);
        document.body.removeChild(object);
    };

    document.body.appendChild(object);
}

// Analyze SVG content from text
function analyzeSVGContent(svgText, overlay) {
    const parser = new DOMParser();
    const svgDoc = parser.parseFromString(svgText, 'image/svg+xml');
    const svgElement = svgDoc.documentElement;

    // Add to DOM temporarily to get bbox
    svgElement.style.position = 'absolute';
    svgElement.style.visibility = 'hidden';
    document.body.appendChild(svgElement);

    try {
        analyzeSVGElement(svgElement, overlay);
    } finally {
        document.body.removeChild(svgElement);
    }
}

// Analyze SVG element and create visual center marker
function analyzeSVGElement(svgElement, overlay) {
    try {
        // Get SVG dimensions
        const viewBox = svgElement.viewBox.baseVal;
        const canvasWidth = viewBox.width || 196;
        const canvasHeight = viewBox.height || 121;

        // Get content bounding box
        const bbox = svgElement.getBBox();

        // Calculate visual center
        const visualCenterX = bbox.x + bbox.width / 2;
        const visualCenterY = bbox.y + bbox.height / 2;

        // Convert to percentage of image dimensions
        const centerXPercent = (visualCenterX / canvasWidth) * 100;
        const centerYPercent = (visualCenterY / canvasHeight) * 100;

        // Create marker
        const marker = document.createElement('div');
        marker.className = 'visual-center-marker';
        marker.style.left = `${centerXPercent}%`;
        marker.style.top = `${centerYPercent}%`;
        marker.title = `Visual Center: (${Math.round(visualCenterX)}, ${Math.round(visualCenterY)})`;

        overlay.appendChild(marker);

    } catch (error) {
        console.warn('Could not analyze SVG element:', error);
        addEstimatedVisualCenter(null, overlay);
    }
}

// Fallback: Add estimated visual center (slightly off-center for most icons)
function addEstimatedVisualCenter(img, overlay) {
    // Most icons have visual weight slightly above and to the left of geometric center
    const estimatedXPercent = 48; // Slightly left of center
    const estimatedYPercent = 47; // Slightly above center

    const marker = document.createElement('div');
    marker.className = 'visual-center-marker';
    marker.style.left = `${estimatedXPercent}%`;
    marker.style.top = `${estimatedYPercent}%`;
    marker.style.backgroundColor = '#ff9800'; // Different color to indicate estimation
    marker.title = 'Estimated Visual Center (SVG analysis unavailable)';

    overlay.appendChild(marker);
}

// Function to load and process image usage data
function loadImageUsageData() {
    return new Promise((resolve, reject) => {
        // Try fetch first (works with live server)
        fetch(Config.get('jsonUrl'))
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                console.log('✅ Loaded JSON data successfully via fetch'); // Debug log
                imageUsageData = processImageUsage(data);
                console.log('📊 Processed', Object.keys(imageUsageData).length, 'images with usage data'); // Debug log
                // Refresh the image grid to show breadcrumbs
                refreshImageGrid();
                // displayUnusedImages(); // Removed to avoid race condition
                showJSONLoadSuccess();
                resolve();
            })
            .catch(error => {
                console.error('Could not load image usage data via fetch:', error);
                console.log('Trying alternative method...');
                // Fallback: Try to load via script injection
                loadJSONViaScript(resolve);
            });
    });
}

// Alternative method to load JSON (works with file:// protocol or local DB)
function loadJSONViaScript(resolve) {
    // Check if using local JSON file
    if (Config.get('useLocalJson')) {
        DB.getJsonFile().then(file => {
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    try {
                        const data = JSON.parse(e.target.result);
                        console.log('✅ Loaded JSON data from Local DB');
                        imageUsageData = processImageUsage(data);
                        refreshImageGrid();
                        showJSONLoadSuccess();
                        if (resolve) resolve(data);
                    } catch (err) {
                        console.error('Error parsing local JSON:', err);
                        fallbackToFetch();
                    }
                };
                reader.readAsText(file);
            } else {
                console.warn('Local JSON file configured but not found in DB');
                fallbackToFetch();
            }
        }).catch(err => {
            console.error('Error loading from DB:', err);
            fallbackToFetch();
        });
        return;
    }

    fallbackToFetch();

    function fallbackToFetch() {
        // Create a script element to load JSON as JSONP
        const script = document.createElement('script');
        script.src = Config.get('jsonUrl');
        script.onerror = function () {
            console.error('Could not load JSON via script tag either');
            console.log('Please use a live server or manually embed the JSON data');
            // Try XHR as last resort
            tryXHR();
        };
        document.body.appendChild(script);
    }

    // Function to try loading via XMLHttpRequest
    function tryXHR() {
        const xhr = new XMLHttpRequest();
        xhr.open('GET', Config.get('jsonUrl'), true);
        xhr.overrideMimeType('application/json');

        xhr.onload = function () {
            if (xhr.status === 200 || xhr.status === 0) { // 0 for file:// protocol
                try {
                    const data = JSON.parse(xhr.responseText);
                    console.log('✅ Loaded JSON data successfully via XHR'); // Debug log
                    imageUsageData = processImageUsage(data);
                    console.log('📊 Processed', Object.keys(imageUsageData).length, 'images with usage data'); // Debug log
                    refreshImageGrid();
                    showJSONLoadSuccess();
                } catch (e) {
                    console.error('Error parsing JSON from XHR:', e);
                    showJSONLoadError();
                }
            } else {
                console.error('XHR failed with status:', xhr.status);
                showJSONLoadError();
            }
            if (resolve) resolve();
        };

        xhr.onerror = function () {
            console.error('XHR request failed');
            showJSONLoadError();
            if (resolve) resolve();
        };

        try {
            xhr.send();
        } catch (e) {
            console.error('Could not send XHR request:', e);
            showJSONLoadError();
            if (resolve) resolve();
        }
    }
}
// Show success message when JSON is loaded
function showJSONLoadSuccess() {
    const filterBtn = document.getElementById('filterDropdownBtn');
    if (filterBtn) {
        filterBtn.style.backgroundColor = '#d4edda';
        filterBtn.style.borderColor = '#28a745';
        filterBtn.title = 'Breadcrumb data loaded successfully';

        // Reset to normal after 2 seconds
        setTimeout(() => {
            filterBtn.style.backgroundColor = 'white';
            filterBtn.style.borderColor = '#ccc';
            filterBtn.title = '';
        }, 2000);
    }
}

// Show error message when JSON cannot be loaded
function showJSONLoadError() {
    console.warn('⚠️ Breadcrumb data unavailable');
    console.log('💡 To see breadcrumbs:');
    console.log('   1. Use a live server (recommended)');
    console.log('   2. Or run: python -m http.server 8000');
    console.log('   3. Then open: http://localhost:8000/image-viewer.html');

    // Add visual indicator in the UI
    const filterBtn = document.getElementById('filterDropdownBtn');
    if (filterBtn) {
        filterBtn.style.backgroundColor = '#fff3cd';
        filterBtn.style.borderColor = '#ffc107';
        filterBtn.title = 'Breadcrumb data unavailable - Use live server to enable';
    }
}

// Function to process JSON data and extract image usage paths
function processImageUsage(data) {
    const usage = {};

    function traverse(obj, path = []) {
        for (const [key, value] of Object.entries(obj)) {
            const currentPath = [...path, key];

            if (typeof value === 'object' && value !== null) {
                // Check if this object has an "img" property
                if (value.img && typeof value.img === 'string') {
                    const imgName = value.img;
                    if (!usage[imgName]) {
                        usage[imgName] = [];
                    }
                    usage[imgName].push(currentPath.join(' > '));
                }
                // Continue traversing nested objects
                traverse(value, currentPath);
            }
        }
    }

    traverse(data);
    console.log('Processed image usage:', usage); // Debug log
    return usage;
}

// Function to display unused images
function displayUnusedImages() {
    const unusedList = document.getElementById('unusedList');
    const unusedSection = document.getElementById('unusedImages');
    const unusedTitle = document.getElementById('unusedTitle');

    // Clear existing items
    unusedList.innerHTML = '';

    const unusedImages = [];

    // Check each SVG file to see if it's used
    svgFiles.forEach(filepath => {
        // Extract just the filename from the path
        const filename = filepath.split('/').pop();
        const baseFilename = filename.replace(/\.(svg|png)$/i, '');
        const usagePaths = imageUsageData[filename] ||
            imageUsageData[baseFilename + '.png'] ||
            imageUsageData[baseFilename + '.svg'] ||
            [];

        if (usagePaths.length === 0) {
            unusedImages.push(filename);
        }
    });

    // Sort unused images
    unusedImages.sort((a, b) => {
        const aMatch = a.match(/^bg(\d+)\.svg$/);
        const bMatch = b.match(/^bg(\d+)\.svg$/);

        if (aMatch && bMatch) {
            const aNum = parseInt(aMatch[1]);
            const bNum = parseInt(bMatch[1]);
            return aNum - bNum;
        }

        return a.localeCompare(b);
    });

    if (unusedImages.length === 0) {
        unusedSection.style.display = 'none';
    } else {
        unusedSection.style.display = 'block';
        unusedTitle.textContent = `Unused Images (${unusedImages.length})`;

        unusedImages.forEach(filename => {
            const unusedItem = document.createElement('li');
            unusedItem.className = 'unused-item';
            const displayName = filename.replace(/\.svg$/i, '');
            unusedItem.textContent = displayName;
            unusedItem.title = filename;

            // Add click to scroll functionality
            unusedItem.addEventListener('click', () => {
                scrollToImage(filename);
            });

            unusedList.appendChild(unusedItem);
        });
    }
}

// Function to refresh image grid with breadcrumb data and apply filters
function refreshImageGrid() {
    const imageGrid = document.getElementById('imageGrid');
    const existingItems = imageGrid.querySelectorAll('.image-item');

    console.log('Refreshing grid with usage data:', Object.keys(imageUsageData).length, 'images found'); // Debug

    existingItems.forEach(item => {
        const filename = item.querySelector('.filename').textContent;
        const existingBreadcrumb = item.querySelector('.breadcrumb-info');
        if (existingBreadcrumb) {
            existingBreadcrumb.remove();
        }

        // Add new breadcrumb info
        const imageInfo = item.querySelector('.image-info');
        const breadcrumbDiv = document.createElement('div');
        breadcrumbDiv.className = 'breadcrumb-info';
        const usagePaths = imageUsageData[filename] || [];

        if (usagePaths.length > 0) {
            usagePaths.forEach(path => {
                const category = path.split(' > ')[0].toLowerCase();

                // Only show breadcrumb if category is enabled
                if (['hr', 'settings', 'profile', 'request', 'other', 'shared'].includes(category) &&
                    guideSettings.categoryFilters[category]) {
                    const pathSpan = document.createElement('span');
                    pathSpan.className = 'breadcrumb-path';
                    pathSpan.classList.add(`category-${category}`);
                    pathSpan.textContent = path;
                    breadcrumbDiv.appendChild(pathSpan);
                }
            });
        }

        if (breadcrumbDiv.children.length > 0) {
            imageInfo.appendChild(breadcrumbDiv);
        }
    });

    // Re-apply filters
    applyFilters();
}

// Function to apply all active filters
function applyFilters() {
    const imageItems = document.querySelectorAll('.image-item');

    imageItems.forEach(item => {
        const filename = item.querySelector('.filename').textContent;
        const width = parseInt(item.querySelector('.dimensions').textContent.split(' ')[0]);
        const height = parseInt(item.querySelector('.dimensions').textContent.split(' ')[2]);
        const isCorrectDimensions = width === 196 && height === 121;

        // 1. Usage Filter
        let passesUsageFilter = true;
        const baseFilename = filename.replace(/\.(svg|png)$/i, '');
        const usagePaths = imageUsageData[filename] ||
            imageUsageData[baseFilename + '.png'] ||
            imageUsageData[baseFilename + '.svg'] ||
            [];
        const isUsed = usagePaths.length > 0;

        if (guideSettings.usageFilter === 'used' && !isUsed) passesUsageFilter = false;
        if (guideSettings.usageFilter === 'unused' && isUsed) passesUsageFilter = false;

        // 2. Dimension Filter
        let passesDimensionFilter = true;
        if (isCorrectDimensions && !guideSettings.dimensionFilters.correct) passesDimensionFilter = false;
        if (!isCorrectDimensions && !guideSettings.dimensionFilters.incorrect) passesDimensionFilter = false;

        // 3. Category Filter (only applies if image is used)
        let passesCategoryFilter = true;
        if (isUsed) {
            // Check if ANY of the image's categories are enabled
            const hasEnabledCategory = usagePaths.some(path => {
                const category = path.split(' > ')[0].toLowerCase();
                return guideSettings.categoryFilters[category];
            });

            if (!hasEnabledCategory) passesCategoryFilter = false;
        }

        // Apply visibility
        if (passesUsageFilter && passesDimensionFilter && passesCategoryFilter) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Initialize
document.addEventListener('DOMContentLoaded', async () => {
    const imageGrid = document.getElementById('imageGrid');

    // Wait for both data loading and image discovery
    await Promise.all([
        loadImageUsageData(),
        discoverImageFiles().then(files => {
            svgFiles = files;
            files.forEach(file => {
                const item = createImageItem(file);
                imageGrid.appendChild(item);
            });
        })
    ]);

    // Initial missing images check
    displayMissingImages();

    // Initial unused images check (now safe to call)
    displayUnusedImages();

    // Event Listeners for Controls

    // Main Correct Dimension Check
    document.getElementById('mainCorrectDimensionCheck').addEventListener('change', (e) => {
        guideSettings.enableCorrectDimensionCheck = e.target.checked;
        document.querySelectorAll('.image-item').forEach(item => {
            const width = parseInt(item.querySelector('.dimensions').textContent.split(' ')[0]);
            const height = parseInt(item.querySelector('.dimensions').textContent.split(' ')[2]);

            if (width === 196 && height === 121) {
                if (e.target.checked) {
                    item.classList.add('correct-dimensions');
                } else {
                    item.classList.remove('correct-dimensions');
                }
            }
        });
    });

    // Filter Dropdown Toggle
    const filterBtn = document.getElementById('filterDropdownBtn');
    const filterDropdown = document.getElementById('filterDropdown');

    filterBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        const isVisible = filterDropdown.style.display === 'block';
        filterDropdown.style.display = isVisible ? 'none' : 'block';
        filterBtn.textContent = isVisible ? 'Filters ▼' : 'Filters ▲';
    });

    // Close dropdown when clicking outside
    document.addEventListener('click', (e) => {
        if (!filterDropdown.contains(e.target) && e.target !== filterBtn) {
            filterDropdown.style.display = 'none';
            filterBtn.textContent = 'Filters ▼';
        }
    });

    // Usage Filters
    document.querySelectorAll('input[name="usageFilter"]').forEach(radio => {
        radio.addEventListener('change', (e) => {
            guideSettings.usageFilter = e.target.value;
            applyFilters();
        });
    });

    // Dimension Filters
    document.querySelectorAll('.dimension-filter').forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            guideSettings.dimensionFilters[e.target.value] = e.target.checked;
            applyFilters();
        });
    });

    // Category Filters
    const selectAllCategories = document.getElementById('selectAllCategories');
    const categoryCheckboxes = document.querySelectorAll('.category-filter');

    // Select All Categories
    selectAllCategories.addEventListener('change', (e) => {
        const isChecked = e.target.checked;
        categoryCheckboxes.forEach(cb => {
            cb.checked = isChecked;
            guideSettings.categoryFilters[cb.value] = isChecked;
        });
        refreshImageGrid(); // Need to refresh to update breadcrumbs
    });

    // Individual Category Filters
    categoryCheckboxes.forEach(checkbox => {
        checkbox.addEventListener('change', (e) => {
            guideSettings.categoryFilters[e.target.value] = e.target.checked;

            // Update "Select All" state
            const allChecked = Array.from(categoryCheckboxes).every(cb => cb.checked);
            selectAllCategories.checked = allChecked;

            refreshImageGrid(); // Need to refresh to update breadcrumbs
        });
    });

    // Grid Size Slider
    const gridSizeSlider = document.getElementById('gridSizeSlider');
    const gridSizeValue = document.getElementById('gridSizeValue');

    gridSizeSlider.addEventListener('input', (e) => {
        const val = e.target.value;
        gridSizeValue.textContent = val;
        imageGrid.style.gridTemplateColumns = `repeat(${val}, 1fr)`;
    });

    // Guidelines
    document.getElementById('centerVertical').addEventListener('change', (e) => {
        guideSettings.centerVertical = e.target.checked;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    document.getElementById('centerHorizontal').addEventListener('change', (e) => {
        guideSettings.centerHorizontal = e.target.checked;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    document.getElementById('showVisualCenter').addEventListener('change', (e) => {
        guideSettings.showVisualCenter = e.target.checked;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    // Divisions
    document.getElementById('enableVerticalDivisions').addEventListener('change', (e) => {
        guideSettings.verticalDivisions = e.target.checked;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    document.getElementById('verticalDivisions').addEventListener('input', (e) => {
        guideSettings.verticalDivisionCount = parseInt(e.target.value);
        // Update pixel value display (assuming 196px width)
        const pxVal = Math.round(196 / guideSettings.verticalDivisionCount);
        document.getElementById('verticalDivisionValue').textContent = `${pxVal}px`;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    document.getElementById('enableHorizontalDivisions').addEventListener('change', (e) => {
        guideSettings.horizontalDivisions = e.target.checked;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    document.getElementById('horizontalDivisions').addEventListener('input', (e) => {
        guideSettings.horizontalDivisionCount = parseInt(e.target.value);
        // Update pixel value display (assuming 121px height)
        const pxVal = Math.round(121 / guideSettings.horizontalDivisionCount);
        document.getElementById('horizontalDivisionValue').textContent = `${pxVal}px`;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    // Padding Controls
    document.getElementById('enableAllPadding').addEventListener('change', (e) => {
        guideSettings.padding.all = e.target.checked;
        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    document.getElementById('allPadding').addEventListener('input', (e) => {
        guideSettings.paddingValues.all = parseInt(e.target.value);
        // Update all individual values if they're not manually set?
        // For simplicity, let's update all values
        document.getElementById('topPadding').value = e.target.value;
        document.getElementById('rightPadding').value = e.target.value;
        document.getElementById('bottomPadding').value = e.target.value;
        document.getElementById('leftPadding').value = e.target.value;

        guideSettings.paddingValues.top = parseInt(e.target.value);
        guideSettings.paddingValues.right = parseInt(e.target.value);
        guideSettings.paddingValues.bottom = parseInt(e.target.value);
        guideSettings.paddingValues.left = parseInt(e.target.value);

        document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
    });

    ['top', 'right', 'bottom', 'left'].forEach(side => {
        const capitalSide = side.charAt(0).toUpperCase() + side.slice(1);

        document.getElementById(`enable${capitalSide}Padding`).addEventListener('change', (e) => {
            guideSettings.padding[side] = e.target.checked;
            document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
        });

        document.getElementById(`${side}Padding`).addEventListener('input', (e) => {
            guideSettings.paddingValues[side] = parseInt(e.target.value);
            document.querySelectorAll('.grid-overlay').forEach(updateGuideLines);
        });
    });
});
