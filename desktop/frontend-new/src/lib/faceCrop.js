/**
 * faceCrop.js
 * ---------------------------------------------------------------------------
 * Client-side face detection + smart passport-style cropping.
 *
 * Uses face-api.js with the TinyFaceDetector model (already shipped under
 * /public/models). Lightweight (~190KB) and fast — runs entirely in the
 * browser, no server round-trip.
 *
 * Crop logic produces a square frame where the FACE is the dominant element:
 *   - face occupies ~45–55% of the frame height
 *   - hair / forehead included above
 *   - shoulders included below
 *   - centered horizontally on the face
 *
 * Usage:
 *   import { cropFaceWithPadding, prewarmFaceDetector } from "@/lib/faceCrop";
 *   const cropped = await cropFaceWithPadding(base64OrFile);
 * ---------------------------------------------------------------------------
 */

let _faceapiPromise = null;
let _modelsLoaded = false;
let _modelsPromise = null;

const loadFaceApi = () => {
  if (!_faceapiPromise) {
    _faceapiPromise = import("face-api.js");
  }
  return _faceapiPromise;
};

const loadModels = async () => {
  if (_modelsLoaded) return;
  if (_modelsPromise) return _modelsPromise;
  const faceapi = await loadFaceApi();
  _modelsPromise = faceapi.nets.tinyFaceDetector
    .loadFromUri("/models")
    .then(() => {
      _modelsLoaded = true;
    });
  return _modelsPromise;
};

/** Pre-warm the face detector on idle so the first crop is instant. */
export const prewarmFaceDetector = () => loadModels().catch(() => {});

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Detect the largest face in an image and return a square crop centered on
 * the face with professional padding (face ~50% of frame, hair above,
 * shoulders below).
 *
 * @param {string|Blob|File} input - base64 data URL, Blob, or File
 * @param {object} [options]
 * @param {number} [options.faceRatio=0.5] - target face height as fraction of
 *        the final crop height. 0.5 = face fills half the frame.
 * @param {number} [options.outputSize=512] - output square size in pixels.
 * @param {number} [options.quality=0.95] - JPEG quality.
 * @returns {Promise<string>} base64 JPEG, or the original input if no face
 *          is found (so the caller can fall back gracefully).
 */
export const cropFaceWithPadding = async (input, options = {}) => {
  const { faceRatio = 0.6, outputSize = 512, quality = 0.95 } = options;

  const faceapi = await loadFaceApi();
  await loadModels();

  // Normalize to a data URL we can load into <img>
  let dataUrl;
  if (typeof input === "string") {
    dataUrl = input;
  } else {
    dataUrl = await new Promise((resolve, reject) => {
      const fr = new FileReader();
      fr.onload = () => resolve(fr.result);
      fr.onerror = reject;
      fr.readAsDataURL(input);
    });
  }

  const img = await loadImage(dataUrl);

  // Detect — pick the largest face if multiple
  const detections = await faceapi.detectAllFaces(
    img,
    new faceapi.TinyFaceDetectorOptions({ inputSize: 416, scoreThreshold: 0.4 }),
  );
  if (!detections || detections.length === 0) return dataUrl;

  const best = detections.reduce((a, b) =>
    a.box.width * a.box.height > b.box.width * b.box.height ? a : b,
  );
  const { x: fx, y: fy, width: fw, height: fh } = best.box;
  const cx = fx + fw / 2;
  const cy = fy + fh / 2;

  // Compute the crop size so the face takes `faceRatio` of the frame height.
  // Then we shift the crop so the face sits in the upper-middle band, leaving
  // room for hair above and shoulders below.
  const cropSize = Math.round(fh / faceRatio);

  // Vertical: shift the crop UP so there's enough room for hair above the
  // face-api bounding box (which only spans hairline-to-chin). Face center
  // ends up at ~58% from the top of the crop — generous hair on top,
  // neck/upper chest below.
  const cropX = cx - cropSize / 2;
  const cropY = cy - cropSize * 0.58;

  // The crop window may extend past any edge of the source image. Compute
  // the *intersection* of the window with the image (sx, sy, sw, sh in image
  // coords) and the matching destination rect inside the output canvas
  // (dx, dy, dw, dh). The remaining area of the canvas stays white — so
  // hair that's near the top of the source isn't squashed, it just sits
  // against a white margin.
  const sx = Math.max(0, cropX);
  const sy = Math.max(0, cropY);
  const ex = Math.min(img.naturalWidth, cropX + cropSize);
  const ey = Math.min(img.naturalHeight, cropY + cropSize);
  const sw = Math.max(0, ex - sx);
  const sh = Math.max(0, ey - sy);

  const scale = outputSize / cropSize;
  const dx = (sx - cropX) * scale;
  const dy = (sy - cropY) * scale;
  const dw = sw * scale;
  const dh = sh * scale;

  const canvas = document.createElement("canvas");
  canvas.width = outputSize;
  canvas.height = outputSize;
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, outputSize, outputSize);
  if (sw > 0 && sh > 0) {
    ctx.drawImage(img, sx, sy, sw, sh, dx, dy, dw, dh);
  }

  return canvas.toDataURL("image/jpeg", quality);
};
