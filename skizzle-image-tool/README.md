# SVG Utility Tool

This project is a utility for managing and verifying SVG images for your application.

## Project Structure

- **`public/`**: Contains the web interface and static assets.
  - **`index.html`**: The main dashboard for viewing and checking SVG images.
  - **`img/`**: Directory containing all SVG files.
  - **`data/`**: Contains `image-data.json` which maps images to their usage in the application.
- **`scripts/`**: Contains utility scripts.
  - **`generate-file-list.js`**: A Node.js script to scan the `public/img` directory and generate a `file-list.json` for the viewer.

## Usage

1.  **View Images**: Open `public/index.html` in your web browser.
    *   Note: For the best experience (and to avoid CORS issues with local files), it is recommended to run a local server.
    *   Example: Run `python3 -m http.server` inside the `public` directory.

2.  **Update File List**: If you add or remove images in `public/img`, run the generation script:
    ```bash
    node scripts/generate-file-list.js
    ```
