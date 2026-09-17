const SIZE = 240;
const PIXEL_SIZE = 80;
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

function drawSquare(source: CanvasImageSource, width: number, height: number, low: HTMLCanvasElement, output: HTMLCanvasElement) {
  const side = Math.min(width, height);
  const sx = (width - side) / 2;
  const sy = (height - side) / 2;
  const lowContext = low.getContext("2d", { willReadFrequently: true })!;
  const outputContext = output.getContext("2d", { willReadFrequently: true })!;
  lowContext.clearRect(0, 0, PIXEL_SIZE, PIXEL_SIZE);
  lowContext.drawImage(source, sx, sy, side, side, 0, 0, PIXEL_SIZE, PIXEL_SIZE);
  outputContext.imageSmoothingEnabled = false;
  outputContext.clearRect(0, 0, SIZE, SIZE);
  outputContext.drawImage(low, 0, 0, SIZE, SIZE);
  return outputContext.getImageData(0, 0, SIZE, SIZE).data;
}

function seek(video: HTMLVideoElement, time: number) {
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
  low.width = low.height = PIXEL_SIZE;
  output.width = output.height = SIZE;
  const frames: Uint8ClampedArray[] = [];

  if (file.type.startsWith("video/")) {
    const url = URL.createObjectURL(file);
    const video = document.createElement("video");
    video.muted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = url;
    await new Promise<void>((resolve, reject) => {
      video.addEventListener("loadedmetadata", () => resolve(), { once: true });
      video.addEventListener("error", () => reject(new Error("VIDEO FORMAT NOT SUPPORTED")), { once: true });
    });
    const duration = Math.min(video.duration || 1, MAX_SECONDS);
    const count = Math.max(1, Math.ceil(duration * FPS));
    for (let index = 0; index < count; index++) {
      await seek(video, Math.min(index / FPS, Math.max(0, duration - 0.02)));
      frames.push(drawSquare(video, video.videoWidth, video.videoHeight, low, output));
      onProgress(Math.round(((index + 1) / count) * 90));
    }
    URL.revokeObjectURL(url);
  } else if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    frames.push(drawSquare(bitmap, bitmap.width, bitmap.height, low, output));
    bitmap.close();
    onProgress(90);
  } else {
    throw new Error("USE A VIDEO OR IMAGE");
  }

  onProgress(96);
  const gif = encodeGif(frames, SIZE, SIZE, Math.round(100 / FPS));
  if (gif.size > 6 * 1024 * 1024) throw new Error("GIF IS TOO LARGE");
  onProgress(100);
  return gif;
}
