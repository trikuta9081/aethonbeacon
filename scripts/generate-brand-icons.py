from pathlib import Path
from PIL import Image
from collections import deque

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
BG = (10, 15, 30, 255)
RESAMPLE = Image.Resampling.LANCZOS

source = Image.open(ASSETS / "adaptive-icon.png").convert("RGBA")

# Remove the old white matte surrounding the rounded mark while preserving the
# disconnected white/gold artwork inside it. Only transparent/near-white pixels
# connected to the image boundary are cleared.
pixels = source.load()
w, h = source.size
queue = deque()
seen = set()
for x in range(w):
    queue.append((x, 0)); queue.append((x, h - 1))
for y in range(h):
    queue.append((0, y)); queue.append((w - 1, y))
while queue:
    x, y = queue.popleft()
    if (x, y) in seen: continue
    seen.add((x, y))
    r, g, b, a = pixels[x, y]
    traversable = a == 0 or (r >= 242 and g >= 242 and b >= 242)
    if not traversable: continue
    pixels[x, y] = (r, g, b, 0)
    if x: queue.append((x - 1, y))
    if x + 1 < w: queue.append((x + 1, y))
    if y: queue.append((x, y - 1))
    if y + 1 < h: queue.append((x, y + 1))

def square_icon(size: int) -> Image.Image:
    foreground = source.resize((size, size), RESAMPLE)
    canvas = Image.new("RGBA", (size, size), BG)
    canvas.alpha_composite(foreground)
    return canvas.convert("RGB")

# Expo/global fallback icon and native iOS icon.
master = square_icon(1024)
master.save(ASSETS / "icon.png", optimize=True)
master.save(ROOT / "ios/AethonBeacon/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png", optimize=True)

# Android legacy and adaptive resources. Adaptive foreground retains transparency;
# the XML supplies the dark brand background independently.
densities = {
    "mdpi": (48, 108),
    "hdpi": (72, 162),
    "xhdpi": (96, 216),
    "xxhdpi": (144, 324),
    "xxxhdpi": (192, 432),
}
for density, (legacy_size, foreground_size) in densities.items():
    folder = ROOT / f"android/app/src/main/res/mipmap-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    legacy = square_icon(legacy_size)
    legacy.save(folder / "ic_launcher.webp", "WEBP", quality=100, method=6)
    legacy.save(folder / "ic_launcher_round.webp", "WEBP", quality=100, method=6)
    source.resize((foreground_size, foreground_size), RESAMPLE).save(
        folder / "ic_launcher_foreground.webp", "WEBP", lossless=True, method=6
    )

# Web/PWA assets.
for size in (192, 512):
    icon = square_icon(size)
    icon.save(ROOT / f"public/icon-{size}.png", optimize=True)
    if (ROOT / "dist").exists():
        icon.save(ROOT / f"dist/icon-{size}.png", optimize=True)
square_icon(256).save(ROOT / "public/favicon.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])
if (ROOT / "dist").exists():
    square_icon(256).save(ROOT / "dist/favicon.ico", sizes=[(16,16),(32,32),(48,48),(64,64),(128,128),(256,256)])

# Native splash artwork: dark background with one centred, readable brand mark.
splash = Image.new("RGB", (1284, 2778), BG[:3])
mark = square_icon(820)
splash.paste(mark, ((1284 - 820)//2, (2778 - 820)//2))
splash.save(ASSETS / "splash.png", optimize=True)

print("Generated consistent Aethon Beacon gold-A icons for Expo, Android, iOS, web, and splash.")
