/**
 * backgroundRemoval.js
 * ----------------------------------------------------------------------------
 * Reusable client-side background-removal helpers.
 *
 * Uses @imgly/background-removal (browser ML, no server, no API key).
 * The ML module is lazy-loaded and cached so the first call pays the cost
 * once and subsequent calls are instant.
 *
 * Quick usage:
 *
 *   import {
 *     removeBackground,            // -> base64 PNG with transparent bg
 *     removeBackgroundOnWhite,     // -> base64 JPEG composited on white
 *     removeBackgroundOnColor,     // -> base64 JPEG composited on any color
 *     prewarmBackgroundRemoval,    // call once on mount to start the import
 *   } from "@/lib/backgroundRemoval";
 *
 *   const cleaned = await removeBackgroundOnWhite(base64OrFileOrBlob);
 *
 * All inputs accept: base64 data URL, Blob, or File.
 * All outputs are base64 data URL strings (ready to assign to <img src=...>).
 * ----------------------------------------------------------------------------
 */

let _imglyModulePromise = null;

/**
 * Lazy-load and cache the @imgly/background-removal module.
 * Call this on component mount to pre-warm the bundle so the first
 * removal is noticeably faster.
 */
export const prewarmBackgroundRemoval = () => {
  if (!_imglyModulePromise) {
    _imglyModulePromise = import("@imgly/background-removal");
  }
  return _imglyModulePromise;
};

const blobToBase64 = (blob) =>
  new Promise((resolve, reject) => {
    const fr = new FileReader();
    fr.onload = () => resolve(fr.result);
    fr.onerror = reject;
    fr.readAsDataURL(blob);
  });

const base64ToBlob = async (b64) => {
  const res = await fetch(b64);
  return await res.blob();
};

const toBlob = async (input) => {
  if (!input) throw new Error("Empty input");
  if (input instanceof Blob) return input; // covers File
  if (typeof input === "string") return await base64ToBlob(input);
  throw new Error("Unsupported input type for background removal");
};

/**
 * Remove the background from an image.
 *
 * @param {string|Blob|File} input - base64 data URL, Blob, or File
 * @param {object} [options]
 * @param {"isnet_quint8"|"isnet"|"isnet_fp16"} [options.model="isnet_quint8"]
 *        Smaller models are faster but slightly less precise. The default is
 *        the smallest/fastest, which is plenty for headshots / passport photos.
 * @returns {Promise<string>} base64 PNG (transparent background)
 */
export const removeBackground = async (input, options = {}) => {
  const { removeBackground: imglyRemove } = await prewarmBackgroundRemoval();
  const blob = await toBlob(input);
  const transparent = await imglyRemove(blob, {
    model: options.model || "isnet_quint8",
    output: { format: "image/png", quality: options.quality ?? 0.85 },
    ...(typeof options.progress === "function"
      ? { progress: options.progress }
      : {}),
  });
  return await blobToBase64(transparent);
};

/**
 * Composite an RGBA PNG (with transparent background) onto a solid color and
 * return a base64 JPEG. Useful when you need a clean white passport-style
 * photo without the alpha channel.
 *
 * @param {string|Blob|File} transparentInput - PNG data with transparent bg
 * @param {string} [color="#ffffff"]
 * @param {number} [quality=0.92]
 * @returns {Promise<string>} base64 JPEG
 */
export const compositeOnColor = async (transparentInput, color = "#ffffff", quality = 0.92) => {
  const blob = await toBlob(transparentInput);
  return await new Promise((resolve, reject) => {
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        canvas.width = img.naturalWidth;
        canvas.height = img.naturalHeight;
        const ctx = canvas.getContext("2d");
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(img, 0, 0);
        URL.revokeObjectURL(url);
        resolve(canvas.toDataURL("image/jpeg", quality));
      } catch (e) {
        URL.revokeObjectURL(url);
        reject(e);
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(url);
      reject(e);
    };
    img.src = url;
  });
};

/**
 * Convenience: remove the background and place the subject on any solid color.
 *
 * @param {string|Blob|File} input
 * @param {string} [color="#ffffff"]
 * @param {object} [options] - forwarded to removeBackground()
 * @returns {Promise<string>} base64 JPEG
 */
export const removeBackgroundOnColor = async (input, color = "#ffffff", options = {}) => {
  const transparent = await removeBackground(input, options);
  return await compositeOnColor(transparent, color, options.compositeQuality);
};

/**
 * Convenience: remove the background and place the subject on a white background.
 * The most common case for ID/passport-style photos.
 *
 * @param {string|Blob|File} input
 * @param {object} [options] - forwarded to removeBackground()
 * @returns {Promise<string>} base64 JPEG
 */
export const removeBackgroundOnWhite = async (input, options = {}) => {
  return await removeBackgroundOnColor(input, "#ffffff", options);
};

const loadImage = (src) =>
  new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });

/**
 * Replace ONLY the obvious background of an image with white, while keeping
 * every original pixel that even slightly looks like the subject (hair, edges
 * of clothing, etc). Much safer than a hard cutout — won't shave hair, ears,
 * or shoulder lines off the person.
 *
 * Approach:
 *   1. Run model background-removal to get the alpha mask
 *   2. For each pixel: if alpha > threshold (subject-ish) → keep original
 *      pixel untouched; otherwise → white
 *   3. Light feather along the edge to avoid jaggies
 *
 * @param {string|Blob|File} input - base64 data URL, Blob, or File
 * @param {object} [options]
 * @param {string} [options.model="isnet_quint8"] - faster default; the lenient
 *        threshold makes up for the slightly looser mask.
 * @param {number} [options.threshold=24] - 0..255; pixels with alpha above
 *        this are treated as subject and kept verbatim. Lower = more lenient.
 * @param {number} [options.feather=1] - blur radius (px) at the mask edge.
 * @param {number} [options.compositeQuality=0.95] - JPEG output quality.
 * @returns {Promise<string>} base64 JPEG
 */
export const replaceBackgroundWithWhite = async (input, options = {}) => {
  const {
    model = "isnet_quint8",
    threshold = 24,
    feather = 1,
    compositeQuality = 0.95,
    progress,
  } = options;

  // Get the original as a data URL we can load into <img>
  const originalDataUrl =
    typeof input === "string" ? input : await blobToBase64(await toBlob(input));

  // Run model — we only need the alpha mask
  const transparentDataUrl = await removeBackground(originalDataUrl, { model, progress });

  const [origImg, transImg] = await Promise.all([
    loadImage(originalDataUrl),
    loadImage(transparentDataUrl),
  ]);

  const w = origImg.naturalWidth;
  const h = origImg.naturalHeight;

  const origCanvas = document.createElement("canvas");
  origCanvas.width = w;
  origCanvas.height = h;
  const origCtx = origCanvas.getContext("2d");
  origCtx.drawImage(origImg, 0, 0, w, h);
  const origData = origCtx.getImageData(0, 0, w, h);

  // Get the alpha mask, optionally feathered for smooth edges
  const maskCanvas = document.createElement("canvas");
  maskCanvas.width = w;
  maskCanvas.height = h;
  const maskCtx = maskCanvas.getContext("2d");
  if (feather > 0) maskCtx.filter = `blur(${feather}px)`;
  maskCtx.drawImage(transImg, 0, 0, w, h);
  maskCtx.filter = "none";
  const maskData = maskCtx.getImageData(0, 0, w, h);

  const out = origCtx.createImageData(w, h);
  const o = out.data;
  const od = origData.data;
  const md = maskData.data;
  const t = threshold;

  for (let i = 0; i < md.length; i += 4) {
    const a = md[i + 3];
    if (a >= t) {
      // Subject — keep the original pixel exactly as the user uploaded it
      o[i] = od[i];
      o[i + 1] = od[i + 1];
      o[i + 2] = od[i + 2];
      o[i + 3] = 255;
    } else {
      // Background — pure white
      o[i] = 255;
      o[i + 1] = 255;
      o[i + 2] = 255;
      o[i + 3] = 255;
    }
  }

  origCtx.putImageData(out, 0, 0);
  return origCanvas.toDataURL("image/jpeg", compositeQuality);
};
