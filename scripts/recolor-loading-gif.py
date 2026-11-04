import sys
from pathlib import Path

from PIL import Image, ImageDraw

TARGET = (0x15, 0x2A, 0x4D)
BLACK_LIMIT = 8
THRESH = 12
COLORS = 128
MAX_WIDTH = 424


def is_near_black(pixel):
    return pixel[0] <= BLACK_LIMIT and pixel[1] <= BLACK_LIMIT and pixel[2] <= BLACK_LIMIT


def border_points(width, height):
    seen = set()
    for x in range(width):
        seen.add((x, 0))
        seen.add((x, height - 1))
    for y in range(height):
        seen.add((0, y))
        seen.add((width - 1, y))
    return seen


def main():
    if len(sys.argv) != 2:
        raise SystemExit("usage: python scripts/recolor-loading-gif.py <path-to-gif>")

    path = Path(sys.argv[1])
    src = Image.open(path)
    width, height = src.size
    if width > MAX_WIDTH:
        height = round(height * MAX_WIDTH / width)
        width = MAX_WIDTH
    frames = []
    durations = []
    edges = sorted(border_points(width, height))

    for index in range(src.n_frames):
        src.seek(index)
        frame = src.convert("RGB")
        if frame.size != (width, height):
            frame = frame.resize((width, height), Image.Resampling.LANCZOS)
        for point in edges:
            if is_near_black(frame.getpixel(point)):
                ImageDraw.floodfill(frame, point, TARGET, thresh=THRESH)
        frames.append(
            frame.quantize(
                colors=COLORS,
                method=Image.Quantize.MEDIANCUT,
                dither=Image.Dither.NONE,
            )
        )
        durations.append(int(src.info.get("duration", 40)))

    loop = int(src.info.get("loop", 0))
    src.close()

    frames[0].save(
        path,
        save_all=True,
        append_images=frames[1:],
        duration=durations,
        loop=loop,
        optimize=True,
        disposal=2,
    )

    check = Image.open(path)
    check.seek(0)
    corners = [
        check.convert("RGB").getpixel((0, 0)),
        check.convert("RGB").getpixel((width - 1, 0)),
        check.convert("RGB").getpixel((0, height - 1)),
        check.convert("RGB").getpixel((width - 1, height - 1)),
    ]
    print(f"frames={check.n_frames} size={check.size[0]}x{check.size[1]}")
    print(f"corners={corners}")
    check.close()


if __name__ == "__main__":
    main()
