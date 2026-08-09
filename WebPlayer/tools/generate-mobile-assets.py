import json
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path

from PIL import Image


WEB_PLAYER_ROOT = Path(__file__).resolve().parent.parent
CONTENT_ROOT = WEB_PLAYER_ROOT / "Content"
OUTPUT_ROOT = CONTENT_ROOT / "WebPlayerOptimized" / "Mobile"
TARGET_SIZE = 540
QUALITY = 86
SOURCE_ROOTS = ("Images/static", "buttons", "hatch", "rotation", "Sequences")
EXCLUDED_PREFIXES = ("buttons/masks/", "rotation/rotation click areas/")
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg"}


def content_relative(path):
    return path.relative_to(CONTENT_ROOT).as_posix()


def should_generate(path):
    relative = content_relative(path)
    return (
        path.suffix.lower() in IMAGE_EXTENSIONS
        and not any(relative.startswith(prefix) for prefix in EXCLUDED_PREFIXES)
    )


def output_path_for(source_path):
    relative = source_path.relative_to(CONTENT_ROOT).with_suffix(".webp")
    return OUTPUT_ROOT / relative


def convert(source_path):
    output_path = output_path_for(source_path)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(source_path) as source_image:
        image = source_image.convert("RGBA")
        image.thumbnail((TARGET_SIZE, TARGET_SIZE), Image.Resampling.LANCZOS)
        image.save(
            output_path,
            "WEBP",
            quality=QUALITY,
            alpha_quality=100,
            method=6,
            exact=True,
        )
    return {
        "source": content_relative(source_path),
        "output": content_relative(output_path),
        "sourceBytes": source_path.stat().st_size,
        "outputBytes": output_path.stat().st_size,
    }


def main():
    sources = sorted(
        path
        for relative_root in SOURCE_ROOTS
        for path in (CONTENT_ROOT / relative_root).rglob("*")
        if path.is_file() and should_generate(path)
    )
    files = []
    with ThreadPoolExecutor(max_workers=4) as executor:
        futures = {executor.submit(convert, source): source for source in sources}
        for index, future in enumerate(as_completed(futures), start=1):
            files.append(future.result())
            if index % 100 == 0:
                print(f"Converted {index}/{len(sources)}")
    files.sort(key=lambda file: file["source"].lower())
    manifest = {
        "version": 1,
        "targetSize": TARGET_SIZE,
        "format": "webp",
        "quality": QUALITY,
        "files": files,
    }
    manifest_path = OUTPUT_ROOT / "mobile-assets-manifest.json"
    manifest_path.write_text(f"{json.dumps(manifest, indent=2)}\n", encoding="utf-8")
    result = {
        "files": len(files),
        "sourceBytes": sum(file["sourceBytes"] for file in files),
        "outputBytes": sum(file["outputBytes"] for file in files),
        "manifestPath": str(manifest_path),
    }
    print(json.dumps(result, indent=2))


if __name__ == "__main__":
    main()
