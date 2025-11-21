#!/usr/bin/env node

/**
 * Generate file-list.json for the image viewer
 * This script scans the img folder and creates a JSON file with all image files
 * 
 * Usage: node generate-file-list.js
 */

const fs = require('fs');
const path = require('path');

const IMG_FOLDER = path.join(__dirname, 'img');
const OUTPUT_FILE = path.join(IMG_FOLDER, 'file-list.json');

// Read all files from the img folder
fs.readdir(IMG_FOLDER, (err, files) => {
    if (err) {
        console.error('❌ Error reading img folder:', err);
        process.exit(1);
    }

    // Filter for SVG files only
    const imageFiles = files.filter(file => {
        const ext = path.extname(file).toLowerCase();
        return ext === '.svg';
    });

    // Sort files naturally (bg1, bg2, ... bg10, bg11, etc.)
    // Put filter.svg and search.svg at the end
    imageFiles.sort((a, b) => {
        // Special files go to the end
        const aIsSpecial = a === 'filter.svg' || a === 'search.svg';
        const bIsSpecial = b === 'filter.svg' || b === 'search.svg';
        
        if (aIsSpecial && !bIsSpecial) return 1;
        if (!aIsSpecial && bIsSpecial) return -1;
        if (aIsSpecial && bIsSpecial) return a.localeCompare(b);

        const aMatch = a.match(/^bg(\d+)\.svg$/);
        const bMatch = b.match(/^bg(\d+)\.svg$/);

        if (aMatch && bMatch) {
            const aNum = parseInt(aMatch[1]);
            const bNum = parseInt(bMatch[1]);
            return aNum - bNum;
        }

        return a.localeCompare(b);
    });

    // Create the JSON structure
    const fileList = {
        generated: new Date().toISOString(),
        count: imageFiles.length,
        files: imageFiles
    };

    // Write to file
    fs.writeFile(OUTPUT_FILE, JSON.stringify(fileList, null, 2), (err) => {
        if (err) {
            console.error('❌ Error writing file-list.json:', err);
            process.exit(1);
        }

        // Find max bg number
        let maxBgNumber = 0;
        imageFiles.forEach(file => {
            const match = file.match(/^bg(\d+)\.svg$/);
            if (match) {
                const num = parseInt(match[1]);
                if (num > maxBgNumber) {
                    maxBgNumber = num;
                }
            }
        });

        console.log('✅ Generated file-list.json');
        console.log(`📊 Found ${imageFiles.length} SVG files`);
        console.log(`📈 Max bg number: bg${maxBgNumber}.svg`);
        console.log(`📁 Output: ${OUTPUT_FILE}`);
    });
});
