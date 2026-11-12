"""Step 1: cut the balloon out of the home photo (rembg, a model that runs on this computer).
Writes the matte: white where the balloon, its basket and the people by it are.

    python3 cut.py <photo> <matte.png>
"""
import sys
from PIL import Image
from rembg import new_session, remove

src, out = sys.argv[1], sys.argv[2]
im = Image.open(src).convert("RGB")
session = new_session("birefnet-general")
matte = remove(im, session=session, only_mask=True)
matte.save(out)
print(im.size, matte.size, matte.mode)
