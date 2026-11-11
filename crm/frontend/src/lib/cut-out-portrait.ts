/**
 * Turns an ordinary photo of a person into the cut-out portrait the ad tool prints: the background
 * is removed, the figure is cropped close and placed bottom-centre on a transparent 800×800 canvas.
 *
 * Runs in the browser (nothing is uploaded anywhere for this): MODNet, a portrait-matting model
 * (Apache-2.0), through transformers.js, which is fetched from a CDN the first time it is needed
 * (about 25 MB, then cached by the browser). It is loaded at run time so it is not part of the site's bundle.
 */
const LIBRARY_URL: string = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@4.3.2";
const MODEL = "Xenova/modnet";
const WORK_SIZE = 1024; // the long side the photo is shrunk to while working
const OUT_SIZE = 800;
const PADDING = 16;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Loaded = { model: any; processor: any; RawImage: any };
let loading: Promise<Loaded> | null = null;

function load(): Promise<Loaded> {
  loading ??= (async () => {
    const lib = await import(/* webpackIgnore: true */ /* turbopackIgnore: true */ LIBRARY_URL);
    const [model, processor] = await Promise.all([
      lib.AutoModel.from_pretrained(MODEL, { dtype: "fp32" }),
      lib.AutoProcessor.from_pretrained(MODEL),
    ]);
    return { model, processor, RawImage: lib.RawImage };
  })().catch((error) => {
    loading = null; // let the next try start again
    throw error;
  });
  return loading;
}

/** Starts loading the model early (e.g. when the photo box opens) so the first photo is faster. */
export function warmUpCutOut() {
  load().catch(() => {});
}

function canvasOf(width: number, height: number) {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

export async function cutOutPortrait(file: Blob): Promise<Blob> {
  const { model, processor, RawImage } = await load();

  // Drawing through createImageBitmap applies the phone's rotation (EXIF) as well.
  const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  const scale = Math.min(1, WORK_SIZE / Math.max(bitmap.width, bitmap.height));
  const w = Math.round(bitmap.width * scale);
  const h = Math.round(bitmap.height * scale);
  const work = canvasOf(w, h);
  const ctx = work.getContext("2d", { willReadFrequently: true })!;
  ctx.drawImage(bitmap, 0, 0, w, h);
  bitmap.close();

  const image = RawImage.fromCanvas(work);
  const { pixel_values } = await processor(image);
  const { output } = await model({ input: pixel_values });
  const mask = await RawImage.fromTensor(output[0].mul(255).to("uint8")).resize(w, h);

  // The model's matte becomes the alpha channel; a light curve removes the faint haze around the figure.
  const pixels = ctx.getImageData(0, 0, w, h);
  let minX = w, minY = h, maxX = -1, maxY = -1;
  for (let i = 0, p = 0; i < w * h; i++, p += 4) {
    const a = Math.max(0, Math.min(255, ((mask.data[i] - 30) * 255) / 195));
    pixels.data[p + 3] = a;
    if (a > 40) {
      const x = i % w;
      const y = (i - x) / w;
      if (x < minX) minX = x;
      if (x > maxX) maxX = x;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
    }
  }
  if (maxX < 0) throw new Error("לא זוהה אדם בתמונה");
  ctx.putImageData(pixels, 0, 0);

  // Crop close to the figure, scale it to fit 800×800 and stand it at the bottom centre.
  minX = Math.max(0, minX - PADDING);
  minY = Math.max(0, minY - PADDING);
  maxX = Math.min(w - 1, maxX + PADDING);
  maxY = Math.min(h - 1, maxY + PADDING);
  const cw = maxX - minX + 1;
  const ch = maxY - minY + 1;
  const fit = Math.min(OUT_SIZE / cw, OUT_SIZE / ch);
  const dw = Math.round(cw * fit);
  const dh = Math.round(ch * fit);
  const out = canvasOf(OUT_SIZE, OUT_SIZE);
  const octx = out.getContext("2d")!;
  octx.imageSmoothingQuality = "high";
  octx.drawImage(work, minX, minY, cw, ch, Math.round((OUT_SIZE - dw) / 2), OUT_SIZE - dh, dw, dh);

  return new Promise((resolve, reject) => out.toBlob((b) => (b ? resolve(b) : reject(new Error("export failed"))), "image/png"));
}
