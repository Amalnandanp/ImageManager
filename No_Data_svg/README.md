# SVG Image Ratio Checker

An interactive tool to view, analyze, and validate SVG images with dimension checking and usage tracking.

## Features

- **Automatic Image Discovery**: Automatically scans the `img` folder for all SVG files
- **Dimension Validation**: Checks if images match the expected 196×121px dimensions
- **Missing File Detection**: Identifies missing files in the bg1.svg to bg[max].svg sequence
- **Usage Tracking**: Shows which images are used/unused based on image-data.json
- **Visual Guidelines**: Overlay grid lines, padding guides, and visual center markers
- **Category Filtering**: Filter images by usage category (HR, Settings, Profile, etc.)

## Setup

### 1. Organize Your Images

Place all your SVG files in the `img` folder:
```
No_Data_svg/
├── img/
│   ├── bg1.svg
│   ├── bg2.svg
│   ├── ...
│   ├── filter.svg
│   └── search.svg
├── image-viewer.html
├── image-data.json
└── generate-file-list.js
```

### 2. Generate File List

Run the file list generator to create an index of all SVG files:

```bash
node generate-file-list.js
```

This creates `img/file-list.json` which contains:
- List of all SVG files in the img folder
- Auto-detected max bg number (e.g., bg152.svg)
- File count and generation timestamp

### 3. Open the Viewer

Open `image-viewer.html` in a web browser:

**Option A: Using a Live Server (Recommended)**
```bash
# Using Python
python -m http.server 8000

# Using Node.js
npx http-server

# Using PHP
php -S localhost:8000
```

Then open: `http://localhost:8000/image-viewer.html`

**Option B: Direct File Access**
Simply open `image-viewer.html` in your browser. The viewer will work but may have limited functionality for loading JSON data.

## How It Works

### Automatic Image Detection

The viewer automatically:
1. Loads `img/file-list.json` (if available)
2. Detects the maximum bg number (e.g., bg152.svg)
3. Identifies missing files from bg1.svg to bg[max].svg
4. Always includes filter.svg and search.svg

### Missing File Detection

The tool checks for missing files in the sequence:
- If you have bg1.svg, bg2.svg, bg4.svg (missing bg3.svg)
- The "Missing Names" section will show: bg3

### Usage Tracking

Based on `image-data.json`, the tool shows:
- **Used Images**: Images referenced in the JSON data with breadcrumb paths
- **Unused Images**: Images not found in the JSON data

## Adding New Images

1. Add your new SVG file to the `img` folder (e.g., bg153.svg)
2. Run `node generate-file-list.js` to update the file list
3. Refresh the viewer in your browser

## File Structure

- **image-viewer.html**: Main viewer application
- **image-data.json**: Usage data mapping (optional)
- **generate-file-list.js**: Script to scan and index SVG files
- **img/**: Folder containing all SVG images
- **img/file-list.json**: Auto-generated index of SVG files

## Requirements

- Node.js (for running generate-file-list.js)
- Modern web browser (Chrome, Firefox, Safari, Edge)
- Optional: Local web server for full functionality

## Tips

- Run `generate-file-list.js` whenever you add/remove SVG files
- Use a live server for best experience with JSON data loading
- The viewer works offline once file-list.json is generated
