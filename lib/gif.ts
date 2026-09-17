import { GIFEncoder, applyPalette, quantize } from "gifenc";

const MAX_EDGE = 240;
const PIXEL_RATIO = 2;
const FPS = 8;
const MAX_SECONDS = 3;

export function encodeGif(frames: Uint8ClampedArray[], width: number, height: number, delay = 125) {
  const gif = GIFEncoder();
  for (const frame of frames) {
    const palette = quantize(frame, 128, { format: "rgb444" });
    const indexed = applyPalette(frame, palette, "rgb444");
    gif.writeFrame(indexed, width, height, { palette, delay, repeat: 0 });
  }
  gif.finish();
  return new Blob([Uint8Array.from(gif.bytes()).buffer], { type: "image/gif" });
}

function sizeCanvases(width: number, height: number, low: HTMLCanvasElement, output: HTMLCanvasElement) {
  const scale = MAX_EDGE / Math.max(width, height);
  output.width = Math.max(1, Math.round(width * scale));
  output.height = Math.max(1, Math.round(height * scale));
  low.width = Math.max(1, Math.round(output.width / PIXEL_RATIO));
  low.height = Math.max(1, Math.round(output.height / PIXEL_RATIO));
}

function drawFrame(source: CanvasImageSource, low: HTMLCanvasElement, output: HTMLCanvasElement) {
  const lowContext = low.getContext("2d", { willReadFrequently: true })!;
  const outputContext = output.getContext("2d", { willReadFrequently: true })!;
  lowContext.clearRect(0, 0, low.width, low.height);
  lowContext.drawImage(source, 0, 0, low.width, low.height);
  const pixels = lowContext.getImageData(0, 0, low.width, low.height);
  for (let index = 0; index < pixels.data.length; index += 4) {
    const red = pixels.data[index];
    const green = pixels.data[index + 1];
    const blue = pixels.data[index + 2];
    const gray = red * 0.299 + green * 0.587 + blue * 0.114;
    pixels.data[index] = Math.max(0, Math.min(255, (gray + (red - gray) * 1.28 - 128) * 1.16 + 128));
    pixels.data[index + 1] = Math.max(0, Math.min(255, (gray + (green - gray) * 1.28 - 128) * 1.16 + 128));
    pixels.data[index + 2] = Math.max(0, Math.min(255, (gray + (blue - gray) * 1.28 - 128) * 1.16 + 128));
  }
  lowContext.putImageData(pixels, 0, 0);
  outputContext.imageSmoothingEnabled = false;
  outputContext.clearRect(0, 0, output.width, output.height);
  outputContext.drawImage(low, 0, 0, output.width, output.height);
  return outputContext.getImageData(0, 0, output.width, output.height).data;
}

function seek(video: HTMLVideoElement, time: number) {
  if (Math.abs(video.currentTime - time) < 0.001 && video.readyState >= 2) return Promise.resolve();
  return new Promise<void>((resolve, reject) => {
    const done = () => { cleanup(); resolve(); };
    const fail = () => { cleanup(); reject(new Error("VIDEO COULD NOT BE READ")); };
    const cleanup = () => {
      video.removeEventListener("seeked", done);
      video.removeEventListener("error", fail);
    };
    video.addEventListener("seeked", done, { once: true });
    video.addEventListener("error", fail, { once: true });
    video.currentTime = time;
  });
}

export async function fileToPixelGif(file: File, onProgress: (value: number) => void) {
  if (file.size > 80 * 1024 * 1024) throw new Error("FILE IS TOO LARGE");
  const low = document.createElement("canvas");
  const output = document.createElement("canvas");
  const frames: Uint8ClampedArray[] = [];

  if (file.type.startsWith("video/") || /\.mov$/i.test(file.name)) {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadeddata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("VIDEO FORMAT NOT SUPPORTED")), { once: true });
    });
    sizeCanvases(video.videoWidth, video.videoHeight, low, output);
    const duration = Math.min(video.duration || 1, MAX_SECONDS);
    const count = Math.max(1, Math.ceil(duration * FPS));
    for (let index = 0; index < count; index++) {
      await seek(video, Math.min(index / FPS, Math.max(0, duration - 0.02)));
      frames.push(drawFrame(video, low, output));
      onProgress(Math.round(((index + 1) / count) * 90));
    }
    URL.revokeObjectURL(url);
  } else if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    sizeCanvases(bitmap.width, bitmap.height, low, output);
    frames.push(drawFrame(bitmap, low, output));
    bitmap.close();
    onProgress(90);
  } else {
    throw new Error("USE A VIDEO OR IMAGE");
  }

  onProgress(96);
  const gif = encodeGif(frames, output.width, output.height, Math.round(1000 / FPS));
  if (gif.size > 6 * 1024 * 1024) throw new Error("GIF IS TOO LARGE");
  onProgress(100);
  return gif;
}
