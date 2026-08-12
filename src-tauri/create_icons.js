const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1x1 valid PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAZSURBVFjD7cEBDQAAAMKg90t5hmsUAAAALw4CBAABf4rLAAAAAElFTkSuQmCC';
const pngBuffer = Buffer.from(pngBase64, 'base64');

// Minimal valid ICO binary buffer (Icon directory + header + BMP payload)
const icoBase64 = 'AAABAAEAEBAAAAEAIABoBAAAFgAAACgAAAAQAAAAIAAAAAEAIAAAAAAAQAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA';
const icoBuffer = Buffer.from(icoBase64, 'base64');

fs.writeFileSync(path.join(iconsDir, '32x32.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), pngBuffer);

console.log('Successfully generated Tauri desktop application icon files in src-tauri/icons');
