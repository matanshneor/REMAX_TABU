"""Step 3: the layers of the living photo, from the photo, the balloon's matte and the clean plate.

  behind   the clean plate behind the balloon (what shows at its edges when it leans)
  sky      the sky with a soft edge: fully there high up, fading out before the skyline and the sides
  balloon  the envelope down to its mouth (the basket stays the photo)

Writes the three webp files and prints each layer's place on the photo in percent, and the point
the balloon leans around. Those numbers go at the top of
frontend/src/components/motion/living-hero.tsx.

    python3 layers.py <photo> <matte.png> <work folder with plate.png> <frontend/public/hero>
"""
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, matte_path, work, out_dir = sys.argv[1:5]
im = np.array(Image.open(src).convert("RGB")).astype(np.float32)
plate = np.array(Image.open(f"{work}/plate.png").convert("RGB")).astype(np.float32)
H, W = im.shape[:2]
m = np.array(Image.open(matte_path)).astype(np.float32) / 255
yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

# Read off this photo: the row where the envelope ends and the burner begins, the middle of the
# envelope's mouth (it leans around it), and the crew member standing by the basket.
MOUTH_Y = 1213.0
PIVOT = (665.5, MOUTH_Y)
PERSON = (xx <= 618) & (yy >= 1238)

def smooth(t):
    t = np.clip(t, 0, 1)
    return t * t * (3 - 2 * t)

def box_of(alpha, pad=2):
    ys, xs = np.where(alpha > 0.004)
    return (int(max(0, xs.min() - pad)), int(max(0, ys.min() - pad)), int(min(W, xs.max() + 1 + pad)), int(min(H, ys.max() + 1 + pad)))

def feathered(x0, y0, x1, y1, f):
    edge = np.minimum.reduce([xx - x0, x1 - 1 - xx, yy - y0, y1 - 1 - yy])
    return smooth(edge / f) * ((xx >= x0) & (xx < x1) & (yy >= y0) & (yy < y1))

layers = {}
def write(name, rgb, alpha, box):
    x0, y0, x1, y1 = box
    rgba = np.dstack([np.clip(rgb, 0, 255), alpha * 255]).astype(np.uint8)[y0:y1, x0:x1]
    Image.fromarray(rgba).save(f"{out_dir}/{name}.webp", "WEBP", quality=95, method=6, alpha_quality=100, use_sharp_yuv=True)
    layers[name] = (box, rgba)
    print(f"{name:8s} place({100 * x0 / W:.4f}, {100 * y0 / H:.4f}, {100 * (x1 - x0) / W:.4f}, {100 * (y1 - y0) / H:.4f})")

# --- behind: the clean plate where the envelope is, the photo itself everywhere else (below the
#     mouth nothing moves), feathered into the photo at its border
env_hole = ndi.binary_dilation((m > 0.02) & ~PERSON, iterations=6) & (yy <= MOUTH_Y - 1)
s_env = (np.clip(ndi.gaussian_filter(env_hole.astype(np.float32), 2.0), 0, 1) * (yy <= MOUTH_Y - 1))[..., None]
hb = box_of(env_hole.astype(np.float32), pad=22)
write("behind", im + s_env * (plate - im), feathered(*hb, 12), hb)

# --- sky: where the sky ends, column by column, read from the clean plate (the first dark or
#     rough pixel from the top; cloud edges are thin and are dropped), then a soft edge above it
luma = plate @ np.array([0.299, 0.587, 0.114], np.float32)
mean = ndi.uniform_filter(luma, 9)
std = np.sqrt(np.maximum(ndi.uniform_filter(luma * luma, 9) - mean * mean, 0))
dark = ndi.binary_opening(plate.max(axis=2) < 112, structure=np.ones((2, 2)))
rough = ndi.binary_opening(std > 13, structure=np.ones((9, 9)))
land = dark | rough
first = np.where(land.any(axis=0), land.argmax(axis=0), H).astype(np.float32)
sky_y = ndi.gaussian_filter1d(ndi.minimum_filter1d(first, 81, mode="nearest"), 24, mode="nearest")
RAMP, CLEAR, SIDE = 120.0, 18.0, 56.0  # the fade's height, the still strip above the skyline, the fade at each side
a_sky = smooth((sky_y[None, :] - CLEAR - yy) / RAMP) * smooth(xx / SIDE) * smooth((W - 1 - xx) / SIDE)
a_sky[a_sky < 0.004] = 0
write("sky", plate, a_sky, box_of(a_sky, pad=0))

# --- balloon: the matte above the mouth, fading out over 3px below it; in the soft edge pixels
#     the background's share of the colour is taken out, so no halo travels with the balloon
a_env = m * (1 - smooth((yy - MOUTH_Y) / 3))
a_env[a_env < 0.02] = 0
a = a_env[..., None]
fg = np.where(a > 0.985, im, np.clip((im - (1 - a) * plate) / np.maximum(a, 0.08), 0, 255))
b = box_of(a_env)
write("balloon", fg, a_env, b)
print(f"mouth    {100 * (PIVOT[0] - b[0]) / (b[2] - b[0]):.3f}% {100 * (PIVOT[1] - b[1]) / (b[3] - b[1]):.3f}%")

# --- check: the layers put back together at rest must be the photo
comp = im.copy()
for name in ("behind", "sky", "balloon"):
    (x0, y0, x1, y1), rgba = layers[name]
    al = rgba[..., 3:4].astype(np.float32) / 255
    comp[y0:y1, x0:x1] = comp[y0:y1, x0:x1] * (1 - al) + rgba[..., :3].astype(np.float32) * al
d = np.abs(comp - im).max(axis=2)
print("at rest against the photo: mean difference %.2f of 255, 99.9%% of pixels within %.0f" % (d.mean(), np.percentile(d, 99.9)))
