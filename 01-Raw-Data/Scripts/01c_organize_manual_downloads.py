#!/usr/bin/env python3
"""
Organize manually downloaded BTS TransBorder ZIPs into 01-Raw-Data/download/legacy and modern.
Use when direct HTTP downloads get 403 from BTS CDN: download files in a browser
from https://www.bts.gov/topics/transborder-raw-data, save them to a folder,
then run this script with that folder.
"""
import json
import shutil
import sys
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
CONFIG_DIR = REPO_ROOT / "02-Data-Staging" / "config"
RAW_LEGACY_DIR = REPO_ROOT / "01-Raw-Data" / "download" / "legacy"
RAW_MODERN_DIR = REPO_ROOT / "01-Raw-Data" / "download" / "modern"
MANIFEST_PATH = CONFIG_DIR / "transborder_url_manifest.json"


def filename_from_url(url: str) -> str:
    return url.rstrip("/").split("/")[-1]


def main():
    import argparse
    p = argparse.ArgumentParser(
        description="Copy manually downloaded BTS ZIPs into 01-Raw-Data layout"
    )
    p.add_argument(
        "folder",
        type=Path,
        help="Folder containing downloaded ZIP files (by name as on BTS)",
    )
    p.add_argument(
        "--copy",
        action="store_true",
        help="Copy files (default: move)",
    )
    args = p.parse_args()
    folder = args.folder.resolve()
    if not folder.is_dir():
        print(f"Not a directory: {folder}", file=sys.stderr)
        sys.exit(1)
    manifest = json.loads(MANIFEST_PATH.read_text(encoding="utf-8"))
    legacy = manifest["legacy"]
    modern = manifest["modern"]
    # Build set of expected filenames and target (kind, year)
    targets = {}
    for e in legacy:
        name = filename_from_url(e["url"])
        targets[name] = ("legacy", e["year"])
    for e in modern:
        name = filename_from_url(e["url"])
        targets[name] = ("modern", e["year"])
    existing = {f.name for f in folder.iterdir() if f.is_file()}
    placed = 0
    for name in existing:
        if name not in targets:
            continue
        kind, year = targets[name]
        if kind == "legacy":
            out_dir = RAW_LEGACY_DIR / year
        else:
            out_dir = RAW_MODERN_DIR / year
        out_dir.mkdir(parents=True, exist_ok=True)
        out_path = out_dir / name
        src = folder / name
        if out_path.resolve() == src.resolve():
            continue
        if args.copy:
            shutil.copy2(src, out_path)
        else:
            shutil.move(str(src), str(out_path))
        placed += 1
        print(f"  {kind} {year}: {name}")
    print(f"Placed {placed} files into 01-Raw-Data/download/")
    sys.exit(0)


if __name__ == "__main__":
    main()
