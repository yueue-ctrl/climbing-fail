type GifBlock = {
  start: number;
  end: number;
  kind: "extension" | "image" | "trailer";
  label?: number;
};

function skipSubBlocks(bytes: Uint8Array, start: number) {
  let cursor = start;
  while (cursor < bytes.length) {
    const size = bytes[cursor++];
    if (size === 0) return cursor;
    cursor += size;
  }
  throw new Error("INVALID GIF DATA");
}

function readBlocks(bytes: Uint8Array, start: number) {
  const blocks: GifBlock[] = [];
  let cursor = start;

  while (cursor < bytes.length) {
    const blockStart = cursor;
    const marker = bytes[cursor++];

    if (marker === 0x3b) {
      blocks.push({ start: blockStart, end: cursor, kind: "trailer" });
      return blocks;
    }

    if (marker === 0x21) {
      const label = bytes[cursor++];
      cursor = skipSubBlocks(bytes, cursor);
      blocks.push({ start: blockStart, end: cursor, kind: "extension", label });
      continue;
    }

    if (marker === 0x2c) {
      if (cursor + 9 > bytes.length) throw new Error("INVALID GIF IMAGE");
      const packed = bytes[cursor + 8];
      cursor += 9;
      if (packed & 0x80) cursor += 3 * (1 << ((packed & 0x07) + 1));
      cursor += 1;
      cursor = skipSubBlocks(bytes, cursor);
      blocks.push({ start: blockStart, end: cursor, kind: "image" });
      continue;
    }

    throw new Error("UNSUPPORTED GIF BLOCK");
  }

  throw new Error("GIF TRAILER NOT FOUND");
}

export function reverseGif(buffer: ArrayBuffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes.length < 14 || String.fromCharCode(...bytes.slice(0, 6)) !== "GIF89a") {
    throw new Error("INVALID GIF");
  }

  const packed = bytes[10];
  const dataStart = 13 + ((packed & 0x80) ? 3 * (1 << ((packed & 0x07) + 1)) : 0);
  const blocks = readBlocks(bytes, dataStart);
  const imageIndexes = blocks.flatMap((block, index) => block.kind === "image" ? [index] : []);
  if (imageIndexes.length < 2) return bytes;

  const frameStarts = imageIndexes.map((blockIndex) => {
    const previous = blocks[blockIndex - 1];
    return previous?.kind === "extension" && previous.label === 0xf9
      ? previous.start
      : blocks[blockIndex].start;
  });
  const trailer = blocks.find((block) => block.kind === "trailer")!;
  const frames = frameStarts.map((start, index) =>
    bytes.slice(start, frameStarts[index + 1] ?? trailer.start),
  );
  const prefix = bytes.slice(0, frameStarts[0]);
  const suffix = bytes.slice(trailer.start);
  const output = new Uint8Array(bytes.length);
  let offset = 0;

  for (const part of [prefix, ...frames.reverse(), suffix]) {
    output.set(part, offset);
    offset += part.length;
  }
  return output;
}
