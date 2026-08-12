const fs = require('fs');
const path = require('path');

const iconsDir = path.join(__dirname, 'icons');
if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// 1. Create a genuine 32x32 Windows ICO binary file
function createValidIcoBuffer(width = 32, height = 32) {
  const headerSize = 6;
  const dirEntrySize = 16;
  const bmpHeaderSize = 40;
  const xorSize = width * height * 4;
  const andSize = Math.ceil((width * height) / 8);
  const totalImageSize = bmpHeaderSize + xorSize + andSize;
  const totalFileSize = headerSize + dirEntrySize + totalImageSize;

  const buf = Buffer.alloc(totalFileSize);

  // ICONDIR Header
  buf.writeUInt16LE(0, 0); // Reserved
  buf.writeUInt16LE(1, 2); // Image type (1 = ICO)
  buf.writeUInt16LE(1, 4); // Number of images

  // ICONDIRENTRY
  buf.writeUInt8(width, 6); // Width
  buf.writeUInt8(height, 7); // Height
  buf.writeUInt8(0, 8); // Color palette
  buf.writeUInt8(0, 9); // Reserved
  buf.writeUInt16LE(1, 10); // Color planes
  buf.writeUInt16LE(32, 12); // Bits per pixel
  buf.writeUInt32LE(totalImageSize, 14); // Image size
  buf.writeUInt32LE(headerSize + dirEntrySize, 18); // Image offset (22)

  // BITMAPINFOHEADER
  let offset = 22;
  buf.writeUInt32LE(bmpHeaderSize, offset); offset += 4; // biSize
  buf.writeInt32LE(width, offset); offset += 4; // biWidth
  buf.writeInt32LE(height * 2, offset); offset += 4; // biHeight (XOR + AND mask combined)
  buf.writeUInt16LE(1, offset); offset += 2; // biPlanes
  buf.writeUInt16LE(32, offset); offset += 2; // biBitCount
  buf.writeUInt32LE(0, offset); offset += 4; // biCompression (BI_RGB)
  buf.writeUInt32LE(xorSize + andSize, offset); offset += 4; // biSizeImage
  buf.writeInt32LE(0, offset); offset += 4; // biXPelsPerMeter
  buf.writeInt32LE(0, offset); offset += 4; // biYPelsPerMeter
  buf.writeUInt32LE(0, offset); offset += 4; // biClrUsed
  buf.writeUInt32LE(0, offset); offset += 4; // biClrImportant

  // Fill XOR mask pixels (cyan color ARGB: 255, 6, 182, 212)
  for (let i = 0; i < width * height; i++) {
    buf.writeUInt8(212, offset); // B
    buf.writeUInt8(182, offset + 1); // G
    buf.writeUInt8(6, offset + 2); // R
    buf.writeUInt8(255, offset + 3); // A
    offset += 4;
  }

  // AND mask (all zeros for fully opaque)
  buf.fill(0, offset, offset + andSize);

  return buf;
}

const icoBuffer = createValidIcoBuffer(32, 32);

// 32x32 valid PNG base64
const pngBase64 = 'iVBORw0KGgoAAAANSUhEUgAAACAAAAAgCAYAAABzenr0AAAABHNCSVQICAgIfAhkiAAAAAlwSFlzAAAOxAAADsQBlSsOGwAAABl0RVh0U29mdHdhcmUAd3d3Lmlua3NjYXBlLm9yZ5vuPBoAAAAZSURBVFjD7cEBDQAAAMKg90t5hmsUAAAALw4CBAABf4rLAAAAAElFTkSuQmCC';
const pngBuffer = Buffer.from(pngBase64, 'base64');

fs.writeFileSync(path.join(iconsDir, '32x32.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, '128x128@2x.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.png'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.icns'), pngBuffer);
fs.writeFileSync(path.join(iconsDir, 'icon.ico'), icoBuffer);

console.log('Successfully generated 3.00 format ICO icon for Tauri desktop Windows build');
