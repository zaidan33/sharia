#!/usr/bin/env python3
"""Generate app icons for the project."""
import struct, zlib, shutil

W, H = 32, 32
bg = (11, 79, 74)
fg = (250, 247, 239)
accent = (193, 137, 46)

pixels = bytearray()
for y in range(H):
    for x in range(W):
        r, g, b = bg
        if x < 1 or x >= W-1 or y < 1 or y >= H-1:
            r, g, b = fg
        if 4 <= x <= 28 and 14 <= y <= 16:
            r, g, b = fg
        dx = abs(x - 16)
        if dx <= 2 and 16 <= y <= 20:
            r, g, b = accent
        if (3 <= x <= 5) and (17 <= y <= 23):
            r, g, b = fg
        if (27 <= x <= 29) and (17 <= y <= 23):
            r, g, b = fg
        if (2 <= x <= 7) and (23 <= y <= 25):
            r, g, b = fg
        if (25 <= x <= 30) and (23 <= y <= 25):
            r, g, b = fg
        if 4 <= x <= 6 and 19 <= y <= 22:
            r, g, b = accent
        pixels.extend([r, g, b])

def write_png(path, w, h, pixel_data):
    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c) & 0xffffffff)
    raw = bytearray()
    for y in range(h):
        raw.append(0)
        raw.extend(pixel_data[y*w*3:(y+1)*w*3])
    png = (b'\x89PNG\r\n\x1a\n' +
           chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0)) +
           chunk(b'IDAT', zlib.compress(bytes(raw))) +
           chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    print(f"Written: {path} ({len(png)} bytes)")

write_png('app/icon.png', W, H, bytes(pixels))
shutil.copy('app/icon.png', 'app/favicon.ico')
print("Copied -> favicon.ico")

# Apple icon 180x180
W2, H2 = 180, 180
pixels2 = bytearray()
for y in range(H2):
    for x in range(W2):
        r, g, b = bg
        sx, sy = x / W2, y / H2
        if 0.12 <= sx <= 0.88 and 0.42 <= sy <= 0.50:
            r, g, b = fg
        if abs(sx - 0.5) <= 0.06 and 0.50 <= sy <= 0.62:
            r, g, b = accent
        if (0.09 <= sx <= 0.16) and (0.52 <= sy <= 0.72):
            r, g, b = fg
        if (0.84 <= sx <= 0.91) and (0.52 <= sy <= 0.72):
            r, g, b = fg
        if (0.06 <= sx <= 0.22) and (0.72 <= sy <= 0.78):
            r, g, b = fg
        if (0.78 <= sx <= 0.94) and (0.72 <= sy <= 0.78):
            r, g, b = fg
        if sx < 0.03 or sx > 0.97 or sy < 0.03 or sy > 0.97:
            r, g, b = fg
        if 0.12 <= sx <= 0.19 and 0.58 <= sy <= 0.68:
            r, g, b = accent
        pixels2.extend([r, g, b])

write_png('app/apple-icon.png', W2, H2, bytes(pixels2))
print("Done!")
