"""Step 2: the clean plate - the photo with the balloon taken out and the background filled in
behind it (LaMa, run on this computer). This is what shows at the balloon's edges when it leans.
The crew member standing by the basket stays. Window results are cached in <work>/win, so
changing the blending does not run the model again.

    python3 plate.py <photo> <matte.png> <lama_fp32.onnx> <work folder>
"""
import os
import sys
import numpy as np
from PIL import Image
from scipy import ndimage as ndi

src, matte_path, model, out_dir = sys.argv[1:5]
im = np.array(Image.open(src).convert("RGB")).astype(np.float32)
H, W = im.shape[:2]
m = np.array(Image.open(matte_path)).astype(np.float32) / 255
yy, xx = np.mgrid[0:H, 0:W]

# The crew member standing by the basket is part of the matte but belongs to the ground
# (read off this photo: left of x 618, below y 1238).
PERSON = (xx <= 618) & (yy >= 1238)
person = (m > 0.5) & PERSON
obj = (m > 0.02) & ~PERSON
hole = ndi.binary_dilation(obj, iterations=6) & ~person
np.save(f"{out_dir}/hole.npy", hole)

_sess = None
def lama(img, mask):
    global _sess
    if _sess is None:
        import onnxruntime as ort
        _sess = ort.InferenceSession(model, providers=["CPUExecutionProvider"])
    x = (img.transpose(2, 0, 1)[None] / 255).astype(np.float32)
    k = mask[None, None].astype(np.float32)
    out = _sess.run(None, {"image": x, "mask": k})[0][0].transpose(1, 2, 0)
    if out.max() <= 1.5:
        out = out * 255
    return np.clip(out, 0, 255)

os.makedirs(f"{out_dir}/win", exist_ok=True)
def cached(name, img, mask):
    f = f"{out_dir}/win/{name}.npz"
    if os.path.exists(f):
        d = np.load(f)
        if d["mask"].shape == mask.shape and (d["mask"] == mask).all():
            return d["out"].astype(np.float32)
    out = lama(img, mask)
    np.savez_compressed(f, out=out.astype(np.uint8), mask=mask)
    return out

# Coarse pass: the whole balloon at once, small. Only the deep inside of the hole keeps this.
side = H
sq = Image.fromarray(im[:, :side].astype(np.uint8)).resize((512, 512), Image.LANCZOS)
mk = Image.fromarray((hole[:, :side] * 255).astype(np.uint8)).resize((512, 512), Image.BILINEAR)
coarse_s = cached("coarse", np.array(sq).astype(np.float32), (np.array(mk) > 8))
coarse = im.copy()
coarse[:, :side] = np.array(Image.fromarray(coarse_s.astype(np.uint8)).resize((side, side), Image.BICUBIC)).astype(np.float32)

# Fine pass: full-size 512 windows wherever the first 90 pixels inside the hole's edge are in view.
depth = ndi.distance_transform_edt(hole)
band = hole & (depth <= 90)
acc = np.zeros_like(im)
wsum = np.zeros((H, W), np.float32)
win = np.hanning(512 + 2)[1:-1]
win2 = np.outer(win, win).astype(np.float32)  # falls to zero at the window's edge: no seams
ys, xs = np.where(hole)
n = 0
for y0 in range(max(0, ys.min() - 256), min(H - 512, ys.max()) + 1, 128):
    for x0 in range(max(0, xs.min() - 256), min(W - 512, xs.max()) + 1, 128):
        hm = hole[y0:y0 + 512, x0:x0 + 512]
        known = 1 - hm.mean()
        if band[y0:y0 + 512, x0:x0 + 512].sum() < 200 or known < 0.3:
            continue
        out = cached(f"w_{y0}_{x0}", im[y0:y0 + 512, x0:x0 + 512], hm)
        w = win2 * (known ** 3)
        acc[y0:y0 + 512, x0:x0 + 512] += out * w[..., None]
        wsum[y0:y0 + 512, x0:x0 + 512] += w
        n += 1
        print("window", n, y0, x0, round(float(known), 2), flush=True)
fine = acc / np.maximum(wsum, 1e-6)[..., None]
a = np.clip((130 - depth) / 50, 0, 1) * np.clip(wsum / 0.02, 0, 1)
a = a[..., None]
fill = a * fine + (1 - a) * coarse
s = np.clip(ndi.gaussian_filter(hole.astype(np.float32), 2.0), 0, 1)[..., None]
plate = im * (1 - s) + fill * s
Image.fromarray(np.clip(plate, 0, 255).astype(np.uint8)).save(f"{out_dir}/plate.png")
print("fine windows", n, "| band px on the coarse fill:", int((band & (wsum < 0.02)).sum()), "of", int(band.sum()))
