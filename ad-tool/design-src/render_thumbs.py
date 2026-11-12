"""Makes the small pictures of the designs that the form shows (design-thumb-<id>.webp).

    cd ad-tool/frontend && npm start          # the tool, on http://localhost:3002/ad-tool
    python3 ../design-src/render_thumbs.py    # in another window

Fills the real tool with made-up details and the drawn photos from sample-photos.html, switches to each design,
downloads the ad and saves it small. Run it again after a design changes. Needs playwright and pillow.
"""
import base64
import io
import pathlib
import sys
import urllib.parse

from PIL import Image
from playwright.sync_api import sync_playwright

HERE = pathlib.Path(__file__).resolve().parent
OUT = HERE.parent / "frontend" / "public" / "images"
URL = sys.argv[1] if len(sys.argv) > 1 else "http://localhost:3002/ad-tool"
WIDTH = 360

details = urllib.parse.urlencode({
    "type": "דירת 4 חדרים\n110 מ״ר",
    "location": "בשכונה",
    "sub": "קומה 2 מתוך 4",
    "info": "מרפסת שמש\nממ״ד\nחניה\nמעלית",
    "price": "2500000",
})

with sync_playwright() as p:
    browser = p.chromium.launch()

    # the drawn photos, as files the tool can take
    draw = browser.new_page(viewport={"width": 900, "height": 700})
    draw.goto((HERE / "sample-photos.html").as_uri())
    photos = [{"name": box.get_attribute("data-photo") + ".png", "mimeType": "image/png", "buffer": box.screenshot()}
              for box in draw.locator("[data-photo]").all()]
    draw.close()

    page = browser.new_page(viewport={"width": 1400, "height": 1200})
    page.goto(URL + "#" + details, wait_until="domcontentloaded")
    page.wait_for_function("typeof AGENTS !== 'undefined' && AGENTS.length > 0 && typeof html2canvas === 'function'", timeout=60000)
    page.evaluate("document.fonts.ready")
    page.wait_for_timeout(1500)
    for i, photo in enumerate(photos):
        page.set_input_files(f"#fileInput{i}", photo)
    page.wait_for_function("[0, 1, 2].every(i => document.getElementById('slot' + i).classList.contains('has-image'))")
    page.evaluate("setBanner('חדש למכירה!')")

    for design in page.evaluate("Object.keys(DESIGNS)"):
        page.evaluate("d => { setDesign(d, true); _actionDataURL = null; }", design)
        page.wait_for_timeout(800)
        page.evaluate("createAd()")
        page.wait_for_function("typeof _actionDataURL === 'string' && _actionDataURL.length > 1000", timeout=90000)
        data = page.evaluate("_actionDataURL").split(",", 1)[1]
        page.evaluate("closeActionSheet()")
        image = Image.open(io.BytesIO(base64.b64decode(data))).convert("RGB")
        image = image.resize((WIDTH, round(image.height * WIDTH / image.width)), Image.LANCZOS)
        target = OUT / f"design-thumb-{design}.webp"
        image.save(target, "WEBP", quality=82, method=6)
        print(f"{target.name}: {image.width}x{image.height}, {target.stat().st_size // 1024} KB")
    browser.close()
