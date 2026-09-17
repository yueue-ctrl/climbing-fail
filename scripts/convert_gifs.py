from pathlib import Path

import cv2


SOURCE_DIR = Path("gif")
OUTPUT_DIR = Path("dist/assets/gifs")
TARGET_SIZE = 480
TARGET_FPS = 12


def convert(source: Path, destination: Path) -> tuple[int, int]:
    capture = cv2.VideoCapture(str(source))
    source_fps = capture.get(cv2.CAP_PROP_FPS) or 30
    step = max(source_fps / TARGET_FPS, 1)
    frames = []
    frame_index = 0
    next_sample = 0.0

    while True:
        ok, frame = capture.read()
        if not ok:
            break
        if frame_index + 0.001 >= next_sample:
            height, width = frame.shape[:2]
            scale = TARGET_SIZE / max(width, height)
            resized = cv2.resize(
                frame,
                (round(width * scale), round(height * scale)),
                interpolation=cv2.INTER_AREA,
            )
            frames.append(resized)
            next_sample += step
        frame_index += 1

    capture.release()
    if not frames:
        raise RuntimeError(f"No frames decoded from {source}")

    animation = cv2.Animation()
    animation.frames = frames
    animation.durations = [round(1000 / TARGET_FPS)] * len(frames)
    animation.loop_count = 0

    destination.parent.mkdir(parents=True, exist_ok=True)
    written = cv2.imwriteanimation(
        str(destination),
        animation,
        [
            cv2.IMWRITE_GIF_QUALITY,
            cv2.IMWRITE_GIF_COLORTABLE_SIZE_128,
            cv2.IMWRITE_GIF_DITHER,
            cv2.IMWRITE_GIF_FAST_FLOYD_DITHER,
        ],
    )
    if not written:
        raise RuntimeError(f"Failed to write {destination}")
    return len(frames), destination.stat().st_size


def main() -> None:
    sources = sorted(SOURCE_DIR.glob("*.mov"))
    if not sources:
        raise SystemExit(f"No .mov files found in {SOURCE_DIR}")

    for index, source in enumerate(sources, start=1):
        destination = OUTPUT_DIR / f"climbing-fail-{index:02d}.gif"
        frame_count, byte_count = convert(source, destination)
        print(
            f"{source.name} -> {destination.name}: "
            f"{frame_count} frames, {byte_count / 1024:.0f} KB"
        )


if __name__ == "__main__":
    main()
