"""Generate the production NAYIQ identity for Expo, Android, iOS and web.

The master art (assets/nayiq-logo.png) ships with an opaque navy field baked in.
Compositing that field straight onto a surface painted a *different* navy is what
produced the visible rectangle around the splash mark, so this script keys the
field out once and then paints every surface with the single brand navy that the
native projects already declare (#07182A in android colors.xml and in the iOS
SplashScreen storyboard).
"""

from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFilter

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "assets"
RESAMPLE = Image.Resampling.LANCZOS

# Single source of truth for the brand surface. Must stay in sync with
# android/app/src/main/res/values/colors.xml (splashscreen_background,
# iconBackground) and ios/AethonBeacon/SplashScreen.storyboard.
BRAND_BG = (7, 24, 42)

# Android masks an adaptive icon down to the centre 72dp of a 108dp canvas.
# Anything outside that is cropped by the launcher, so the mark is fitted into
# the safe zone rather than bled to the edges.
ADAPTIVE_SAFE_FRACTION = 72 / 108


def load_master() -> Image.Image:
    """Return the brand mark with its flat navy field replaced by transparency."""
    rgb = Image.open(ASSETS / "nayiq-logo.png").convert("RGB")
    keyed = rgb.copy()
    key = (255, 0, 255)
    width, height = keyed.size
    for seed in ((0, 0), (width - 1, 0), (0, height - 1), (width - 1, height - 1)):
        ImageDraw.floodfill(keyed, seed, key, thresh=42)

    delta = ImageChops.difference(keyed, Image.new("RGB", keyed.size, key))
    mask = delta.convert("L").point(lambda value: 255 if value else 0)
    # Soften the keyed edge so the mark does not show a hard navy fringe when it
    # is composited onto a slightly different surface colour.
    mask = mask.filter(ImageFilter.GaussianBlur(0.6))

    mark = rgb.convert("RGBA")
    mark.putalpha(mask)
    return mark.crop(mark.getbbox())


MARK = load_master()


def _fit(size: int, fraction: float = 1.0) -> Image.Image:
    """Centre the mark on a transparent square, scaled to `fraction` of it."""
    box = max(1, int(round(size * fraction)))
    width, height = MARK.size
    scale = box / max(width, height)
    resized = MARK.resize((max(1, round(width * scale)), max(1, round(height * scale))), RESAMPLE)
    canvas = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    canvas.alpha_composite(resized, ((size - resized.width) // 2, (size - resized.height) // 2))
    return canvas


def square_icon(size: int) -> Image.Image:
    """Opaque brand tile. App icons must not carry an alpha channel."""
    canvas = Image.new("RGBA", (size, size), (*BRAND_BG, 255))
    canvas.alpha_composite(_fit(size, 0.94))
    return canvas.convert("RGB")


def round_icon(size: int) -> Image.Image:
    """Circle-masked legacy launcher icon for round-icon launchers."""
    circle = Image.new("L", (size * 4, size * 4), 0)
    ImageDraw.Draw(circle).ellipse((0, 0, size * 4 - 1, size * 4 - 1), fill=255)
    circle = circle.resize((size, size), RESAMPLE)
    tile = Image.new("RGBA", (size, size), (*BRAND_BG, 255))
    tile.alpha_composite(_fit(size, 0.94))
    out = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    out.paste(tile, (0, 0), circle)
    return out


# Expo/global fallback icon and native iOS icon (kept byte-identical: the
# upgrades regression asserts the checked-in TestFlight icon matches this).
master = square_icon(1024)
master.save(ASSETS / "icon.png", optimize=True)
master.save(ROOT / "ios/AethonBeacon/Images.xcassets/AppIcon.appiconset/App-Icon-1024x1024@1x.png", optimize=True)

# Android legacy and adaptive resources.
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
    square_icon(legacy_size).save(folder / "ic_launcher.webp", "WEBP", quality=100, method=6)
    round_icon(legacy_size).save(folder / "ic_launcher_round.webp", "WEBP", lossless=True, method=6)
    # Transparent foreground so the adaptive background colour shows through,
    # with the mark inside the launcher's safe zone.
    _fit(foreground_size, ADAPTIVE_SAFE_FRACTION).save(
        folder / "ic_launcher_foreground.webp", "WEBP", lossless=True, method=6
    )

# Web/PWA assets.
for size in (192, 512):
    icon = square_icon(size)
    icon.save(ROOT / f"public/icon-{size}.png", optimize=True)
    if (ROOT / "dist").exists():
        icon.save(ROOT / f"dist/icon-{size}.png", optimize=True)
FAVICON_SIZES = [(16, 16), (32, 32), (48, 48), (64, 64), (128, 128), (256, 256)]
square_icon(256).save(ROOT / "public/favicon.ico", sizes=FAVICON_SIZES)
if (ROOT / "dist").exists():
    square_icon(256).save(ROOT / "dist/favicon.ico", sizes=FAVICON_SIZES)

# Expo source splash artwork: one centred mark on the brand navy, no seam.
splash = Image.new("RGBA", (1284, 2778), (*BRAND_BG, 255))
mark = _fit(820, 0.94)
splash.alpha_composite(mark, ((1284 - 820) // 2, (2778 - 820) // 2))
splash.convert("RGB").save(ASSETS / "splash.png", optimize=True)

# iOS splash imageset is centred by the storyboard over its own background
# colour, so it ships transparent and cannot drift from that colour.
ios_splash = ROOT / "ios/AethonBeacon/Images.xcassets/SplashScreen.imageset"
for scale, size in ((1, 100), (2, 200), (3, 300)):
    _fit(size).save(ios_splash / f"splash-{scale}x.png", optimize=True)

# Android splash logo is drawn centred at its natural size by
# drawable/splashscreen.xml, so it is generated at a fixed 200dp and left
# transparent rather than stretched across the whole window.
SPLASH_LOGO_DP = 200
for density, multiplier in (("mdpi", 1), ("hdpi", 1.5), ("xhdpi", 2), ("xxhdpi", 3), ("xxxhdpi", 4)):
    folder = ROOT / f"android/app/src/main/res/drawable-{density}"
    folder.mkdir(parents=True, exist_ok=True)
    _fit(int(SPLASH_LOGO_DP * multiplier)).save(folder / "splashscreen_logo.png", optimize=True)

print("Generated the production NAYIQ identity for Expo, Android, iOS, web, and splash.")
