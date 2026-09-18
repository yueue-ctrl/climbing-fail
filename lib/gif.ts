const MAX_EDGE = 400;
const FPS = 8;
const MAX_SECONDS = 3;

export type CaptionPosition = "top" | "middle" | "bottom";

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
      // GIF decoders add dictionary entries one code later than encoders.
      if (nextCode === (1 << codeSize) + 1 && codeSize < 12) codeSize++;
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

function sizeCanvas(width: number, height: number, output: HTMLCanvasElement) {
  const scale = MAX_EDGE / Math.max(width, height);
  output.width = Math.max(1, Math.round(width * scale));
  output.height = Math.max(1, Math.round(height * scale));
}

function wrapCaption(context: CanvasRenderingContext2D, caption: string, maxWidth: number) {
  const lines: string[] = [];
  for (const paragraph of caption.trim().split(/\n/)) {
    const words = paragraph.trim().split(/\s+/).filter(Boolean);
    if (words.length === 0) {
      lines.push("");
      continue;
    }
    let line = words[0];
    for (const word of words.slice(1)) {
      const candidate = `${line} ${word}`;
      if (context.measureText(candidate).width <= maxWidth) line = candidate;
      else {
        lines.push(line);
        line = word;
      }
    }
    lines.push(line);
  }
  return lines.slice(0, 6);
}

function drawCaption(context: CanvasRenderingContext2D, caption: string, position: CaptionPosition, scale: number) {
  if (!caption.trim()) return;
  const fontSize = Math.max(14, Math.round(context.canvas.width * 0.082 * scale));
  const lineHeight = fontSize * 1.08;
  context.font = `900 ${fontSize}px Arial, Helvetica, sans-serif`;
  context.textAlign = "center";
  context.textBaseline = "middle";
  context.lineJoin = "round";
  context.miterLimit = 2;
  context.lineWidth = Math.max(4, fontSize * 0.15);
  context.strokeStyle = "#000";
  context.fillStyle = "#fff";
  const lines = wrapCaption(context, caption, context.canvas.width * 0.88);
  const totalHeight = lines.length * lineHeight;
  const padding = fontSize * 0.75;
  const centerY = position === "top"
    ? padding + totalHeight / 2
    : position === "bottom"
      ? context.canvas.height - padding - totalHeight / 2
      : context.canvas.height / 2;
  lines.forEach((line, index) => {
    const y = centerY + (index - (lines.length - 1) / 2) * lineHeight;
    context.strokeText(line, context.canvas.width / 2, y);
    context.fillText(line, context.canvas.width / 2, y);
  });
}

function drawFrame(
  source: CanvasImageSource,
  output: HTMLCanvasElement,
  caption: string,
  position: CaptionPosition,
  captionScale: number,
) {
  const outputContext = output.getContext("2d", { willReadFrequently: true })!;
  outputContext.imageSmoothingEnabled = true;
  outputContext.imageSmoothingQuality = "high";
  outputContext.clearRect(0, 0, output.width, output.height);
  outputContext.filter = "blur(0.35px)";
  outputContext.drawImage(source, 0, 0, output.width, output.height);
  outputContext.filter = "none";
  drawCaption(outputContext, caption, position, captionScale);
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

export async function fileToGif(
  file: File,
  onProgress: (value: number) => void,
  caption = "",
  position: CaptionPosition = "middle",
  captionScale = 1,
) {
  if (file.size > 80 * 1024 * 1024) throw new Error("FILE IS TOO LARGE");
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
    sizeCanvas(video.videoWidth, video.videoHeight, output);
    const duration = Math.min(video.duration || 1, MAX_SECONDS);
    const count = Math.max(1, Math.ceil(duration * FPS));
    for (let index = 0; index < count; index++) {
      await seek(video, Math.min(index / FPS, Math.max(0, duration - 0.02)));
      frames.push(drawFrame(video, output, caption, position, captionScale));
      onProgress(Math.round(((index + 1) / count) * 90));
    }
    URL.revokeObjectURL(url);
  } else if (file.type.startsWith("image/")) {
    const bitmap = await createImageBitmap(file);
    sizeCanvas(bitmap.width, bitmap.height, output);
    frames.push(drawFrame(bitmap, output, caption, position, captionScale));
    bitmap.close();
    onProgress(90);
  } else {
    throw new Error("USE A VIDEO OR IMAGE");
  }

  onProgress(96);
  const gif = encodeGif(frames, output.width, output.height, Math.round(100 / FPS));
  if (gif.size > 12 * 1024 * 1024) throw new Error("GIF IS TOO LARGE");
  onProgress(100);
  return gif;
}
