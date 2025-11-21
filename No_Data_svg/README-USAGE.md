# SVG Image Viewer - Usage Instructions

## 🚀 Quick Start

### Option 1: Using Live Server (Recommended)
1. Install "Live Server" extension in VS Code
2. Right-click on `image-viewer.html`
3. Select "Open with Live Server"
4. ✅ All features will work including breadcrumbs and visual center detection

### Option 2: Using Python HTTP Server
```bash
cd No_Data_svg
python -m http.server 8000
```
Then open: http://localhost:8000/image-viewer.html

### Option 3: Direct File Opening (Limited Features)
- Simply double-click `image-viewer.html`
- ⚠️ **Limitations:**
  - Breadcrumbs may not load (CORS restriction)
  - Visual center markers will show estimated positions (orange/dashed)
  
## 🔧 Features

### Working in All Modes:
- ✅ Image grid display
- ✅ Dimension checking (196×121)
- ✅ Center guidelines
- ✅ Division guidelines
- ✅ Padding guidelines
- ✅ Grid size adjustment
- ✅ Missing image detection
- ✅ Incorrect dimension highlighting

### Requires Live Server:
- 🌐 Breadcrumb display (image usage paths)
- 🌐 Accurate visual center detection
- 🌐 Category-based filtering with breadcrumbs

## 🐛 Troubleshooting

### Breadcrumbs Not Showing?
**Problem:** JSON file cannot be loaded due to CORS restrictions

**Solution:** Use a live server (Option 1 or 2 above)

**Check Console:** Open browser DevTools (F12) and look for error messages

### Visual Center Shows Orange Markers?
**Problem:** SVG analysis failed (file:// protocol limitation)

**Solution:** Use a live server for accurate purple markers

**Note:** Orange dashed markers are estimates and still useful for general alignment

## 📊 Understanding the Display

### Color Coding:
- 🟢 **Green border** = Correct dimensions (196×121)
- 🟡 **Yellow background** = Incorrect dimensions
- 🔵 **Blue lines** = Padding guidelines
- 🔴 **Red lines** = Center guidelines
- 🟠 **Orange lines** = Division guidelines
- 🟣 **Purple marker** = Accurate visual center
- 🟠 **Orange marker** = Estimated visual center

### Breadcrumb Colors:
- 🔵 **Blue** = HR category
- 🟣 **Purple** = Settings category
- 🟢 **Green** = Profile category
- 🟠 **Orange** = Request category
- 🔴 **Pink** = Other category
- 🟢 **Light Green** = Shared category

## 💡 Tips

1. **Use filters** to focus on specific image categories
2. **Click incorrect dimension items** in the sidebar to scroll to them
3. **Adjust grid size** (1-10 columns) for better viewing
4. **Toggle guidelines** to analyze image composition
5. **Check console** (F12) for detailed loading information
