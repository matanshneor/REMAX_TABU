# The living photo: how the layers were cut

On the home page the balloon leans in the wind and the clouds drift. It is not a video: it is the
home photo (`brand/source/Homepage_Remax.jpg`, the same picture as `frontend/public/home-hero.jpg`)
cut into three layers that sit exactly over it and move apart from one another. The layers are in
`frontend/public/hero/`; the component is `frontend/src/components/motion/living-hero.tsx` and its
styles are under `.living-scene` in `frontend/src/app/globals.css`.

These three scripts made the layers. Run them again only if the photo is replaced. Everything runs
on your own computer; the photo is not sent anywhere.

| Step | Script | What it does |
|---|---|---|
| 1 | `cut.py` | Cuts the balloon out of the photo (`rembg`, model `birefnet-general`) and writes its matte |
| 2 | `plate.py` | Fills in the background behind the balloon (LaMa), so there is something to show at its edges when it leans |
| 3 | `layers.py` | Writes `behind.webp`, `sky.webp` and `balloon.webp`, and prints each layer's place on the photo |

```bash
pip install rembg onnxruntime pillow numpy scipy
# The fill model: lama_fp32.onnx from https://huggingface.co/Carve/LaMa-ONNX (Apache 2.0, about 200 MB)
mkdir -p work
python3 cut.py    ../../../brand/source/Homepage_Remax.jpg work/matte.png
python3 plate.py  ../../../brand/source/Homepage_Remax.jpg work/matte.png lama_fp32.onnx work
python3 layers.py ../../../brand/source/Homepage_Remax.jpg work/matte.png work ../../frontend/public/hero
```

`layers.py` ends by putting the layers back together and comparing the result with the photo: at
rest they must be the photo. Copy the `place(...)` lines and the `mouth` line it prints into the
top of `living-hero.tsx`.

## What is tied to this photo

- In `plate.py` and `layers.py`: the row where the balloon ends and the burner begins (`MOUTH_Y`),
  the middle of the balloon's mouth (`PIVOT`, the point it leans around), and the crew member
  standing by the basket (`PERSON`), who is part of the matte but belongs to the ground. A new
  photo needs new numbers, read off the matte.
- In `globals.css`: the photo's size (`2240 / 1493` in `.living-stage`) and how far the balloon
  leans. The angles were chosen so that the balloon never shows more than the filled-in strip
  behind its edge, and stays inside a phone's screen.
- The photo is laid out on a phone from its left part (`14%`); the same number is in
  `living-hero.tsx` (the photo) and in `.living-stage` (the layers). Change one, change both.

Only the balloon above its mouth moves. The basket, the people and the land are the photo itself,
so nothing has to be invented there.
