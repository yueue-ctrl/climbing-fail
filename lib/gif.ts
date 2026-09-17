const MAX_EDGE = 240;
const PIXEL_RATIO = 3;
const FPS = 8;
const MAX_SECONDS = 3;

function word(bytes: number[], value: number) {
  bytes.push(value & 255, (value >> 8) & 255);
}

function text(bytes: number[], value: string) {
  for (const char of value) bytes.push(char.charCodeAt(0));
}

function palette() {
  const bytes: number[] = [];
  for (let index = 0; index < 256; index++) {
    bytes.push(
      Math.round(((index >> 5) & 7) * 255 / 7),
      Math.round(((index >> 2) & 7) * 255 / 7),
      Math.round((index & 3) * 255 / 3),
    );
  }
  return bytes;
}

function quantize(data: Uint8ClampedArray) {
  const output = new Uint8Array(data.length / 4);
  for (let source = 0, target = 0; source < data.length; source += 4, target++) {
    output[target] = ((data[source] >> 5) << 5) | ((data[source + 1] >> 5) << 2) | (data[source + 2] >> 6);
  }
  return output;
}

function lzw(indices: Uint8Array) {
  const output: number[] = [];
  let buffer = 0;
  let bitCount = 0;
  let codeSize = 9;
  let nextCode = 258;
  let dictionary = new Map<number, number>();

  const writeCode = (code: number) => {
    buffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      output.push(buffer & 255);
      buffer >>= 8;
      bitCount -= 8;
    }
  };

  writeCode(256);
  let prefix = indices[0];
  for (let index = 1; index < indices.length; index++) {
    const suffix = indices[index];
    const key = (prefix << 8) | suffix;
    const found = dictionary.get(key);
    if (found !== undefined) {
      prefix = found;
      continue;
    }
    writeCode(prefix);
    if (nextCode < 4096) {
      dictionary.set(key, nextCode++);
      if (nextCode === (1 << codeSize) && codeSize < 12) codeSize++;
    } else {
      writeCode(256);
      dictionary = new Map();
      codeSize = 9;
      nextCode = 258;
    }
    prefix = suffix;
  }
  writeCode(prefix);
  writeCode(257);
  if (bitCount) output.push(buffer & 255);
  return output;
}

export function encodeGif(frames: Uint8ClampedArray[], width: number, height: number, delay = 13) {
  const bytes: number[] = [];
  text(bytes, "GIF89a");
  word(bytes, width);
  word(bytes, height);
  bytes.push(0xf7, 0, 0, ...palette());
  bytes.push(0x21, 0xff, 0x0b);
  text(bytes, "NETSCAPE2.0");
  bytes.push(3, 1, 0, 0, 0);

  for (const frame of frames) {
    bytes.push(0x21, 0xf9, 4, 0);
    word(bytes, delay);
    bytes.push(0, 0, 0x2c);
    word(bytes, 0);
    word(bytes, 0);
    word(bytes, width);
    word(bytes, height);
    bytes.push(0, 8);
    const compressed = lzw(quantize(frame));
    for (let offset = 0; offset < compressed.length; offset += 255) {
      const block = compressed.slice(offset, offset + 255);
      bytes.push(block.length, ...block);
    }
    bytes.push(0);
  }
  bytes.push(0x3b);
  return new Blob([new Uint8Array(bytes).buffer], { type: "image/gif" });
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
  const gif = encodeGif(frames, output.width, output.height, Math.round(100 / FPS));
  if (gif.size > 6 * 1024 * 1024) throw new Error("GIF IS TOO LARGE");
  onProgress(100);
  return gif;
}
