"""Draws the artwork in art.html into the ad tool's image folder.

    python3 render_art.py            # all pieces
    python3 render_art.py sky-seal   # only the named ones

Needs: pip install playwright pillow, then: playwright install chromium
Each [data-art="name"] box becomes ../frontend/public/images/design-<name>.webp, three times its size on the page
(the ad is 540 wide and is saved 1620 wide). Run it again after any change to art.html.
"""
import io
import pathlib
import sys

from PIL import Image
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "frontend" / "public" / "images"
SCALE = 3

only = set(sys.argv[1:])

with sync_playwright() as p:
    browser = p.chromium.launch()
    page = browser.new_page(viewport={"width": 700, "height": 900}, device_scale_factor=SCALE)
    page.goto((HERE / "art.html").as_uri())
    page.wait_for_load_state("networkidle")
    for box in page.locator("[data-art]").all():
        name = box.get_attribute("data-art")
        if only and name not in only:
            continue
        lossy = box.get_attribute("data-lossy")
        png = box.screenshot(omit_background=True)
        image = Image.open(io.BytesIO(png)).convert("RGBA")
        target = OUT / f"design-{name}.webp"
        if lossy:
            image.save(target, "WEBP", quality=int(lossy), method=6)
        else:
            image.save(target, "WEBP", lossless=True, method=6)
        print(f"{target.name}: {image.width}x{image.height}, {target.stat().st_size // 1024} KB")
    browser.close()
