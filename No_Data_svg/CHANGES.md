# Changes Summary

## What Was Fixed

### 1. Design Break in Right Section ✅
**Problem**: The toolkit section had broken HTML structure with closing `</div>` tags placed incorrectly.

**Solution**: Fixed the HTML structure for three sections:
- Incorrect Dimensions List
- Missing Names List  
- Unused Images List

Each section now properly wraps its content within the opening and closing div tags.

### 2. Automatic Image Loading ✅
**Problem**: Image filenames were hardcoded in the HTML file.

**Solution**: Implemented automatic image discovery system:
- Images are now loaded from the `img/` folder
- Only SVG files are processed (no PNG files)
- Automatically detects the maximum bg number (e.g., bg152.svg)
- Always includes filter.svg and search.svg

## New Features

### Auto-Discovery System
- `discoverImageFiles()` function scans for SVG files
- Loads from `img/file-list.json` (if available)
- Falls back to probing files if JSON not found
- Auto-detects bg range: bg1.svg to bg[max].svg

### File List Generator
- New script: `generate-file-list.js`
- Scans the img folder for all SVG files
- Creates `img/file-list.json` with file index
- Run with: `node generate-file-list.js`

### Missing File Logic
- Automatically calculates missing files based on detected max number
- Example: If max is bg152.svg, checks for all files from bg1 to bg152
- Shows missing files in the "Missing Names" section

### Unused File Logic
- Compares discovered SVG files against image-data.json
- Shows which images are not referenced in the usage data
- Clickable items to scroll to the image in the grid

## How to Use

1. **Add images to the img folder**
   ```
   img/bg1.svg, img/bg2.svg, ..., img/filter.svg, img/search.svg
   ```

2. **Generate the file list**
   ```bash
   node generate-file-list.js
   ```

3. **Open the viewer**
   - Use a live server: `python -m http.server 8000`
   - Or open image-viewer.html directly in browser

## Technical Details

### Changed Files
- `image-viewer.html`: Fixed HTML structure + added auto-discovery
- `generate-file-list.js`: New file for scanning SVG files
- `img/file-list.json`: Auto-generated index (created by script)

### Key Changes in HTML
1. Fixed closing div tags for toolkit sections
2. Changed `svgFiles` from hardcoded array to dynamic array
3. Added `discoverImageFiles()` async function
4. Updated `createImageItem()` to handle file paths
5. Changed initialization to async `initializeApp()` function
6. Auto-detects BG_END from discovered files

### File Naming Convention
- Main images: `bg[number].svg` (e.g., bg1.svg, bg152.svg)
- Utility images: `filter.svg`, `search.svg`
- All files must be in the `img/` folder
- Only SVG format is supported
