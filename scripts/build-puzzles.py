"""Build the bundled puzzle set from the Lichess puzzle database (CC0).

Usage:
    curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
    pip install zstandard
    python3 scripts/build-puzzles.py lichess_db_puzzle.csv.zst

Streams the compressed CSV (it is several GB uncompressed), keeps only well-tested,
well-liked puzzles, and reservoir-samples an even spread per 100-point rating band.
Writes public/puzzles/r<band>.json plus public/puzzles/index.json.
"""

import csv
import io
import json
import os
import random
import sys
from collections import Counter

import zstandard

PER_BAND = 250
MIN_RATING, MAX_RATING = 400, 3000
MIN_POPULARITY = 85  # Lichess upvote score, -100..100
MIN_PLAYS = 1000
MAX_DEVIATION = 80  # puzzle rating is well established
OUT = "public/puzzles"


def main(path: str) -> None:
    rng = random.Random(20261106)  # deterministic output
    bands: dict[int, list] = {}
    seen: dict[int, int] = {}
    kept_rows = 0

    with open(path, "rb") as fh:
        reader = zstandard.ZstdDecompressor().stream_reader(fh)
        rows = csv.reader(io.TextIOWrapper(reader, encoding="utf-8"))
        header = next(rows)
        col = {name: i for i, name in enumerate(header)}
        for r in rows:
            try:
                rating = int(r[col["Rating"]])
                if not (MIN_RATING <= rating < MAX_RATING):
                    continue
                if int(r[col["Popularity"]]) < MIN_POPULARITY:
                    continue
                if int(r[col["NbPlays"]]) < MIN_PLAYS:
                    continue
                if int(r[col["RatingDeviation"]]) > MAX_DEVIATION:
                    continue
            except (ValueError, IndexError):
                continue
            kept_rows += 1
            band = rating // 100 * 100
            item = [r[col["PuzzleId"]], r[col["FEN"]], r[col["Moves"]], rating, r[col["Themes"]]]
            n = seen.get(band, 0) + 1
            seen[band] = n
            pool = bands.setdefault(band, [])
            if len(pool) < PER_BAND:
                pool.append(item)
            else:  # reservoir sampling keeps a uniform sample of everything seen
                j = rng.randrange(n)
                if j < PER_BAND:
                    pool[j] = item

    os.makedirs(OUT, exist_ok=True)
    themes: Counter = Counter()
    for band, pool in sorted(bands.items()):
        pool.sort(key=lambda p: p[0])
        for p in pool:
            themes.update(p[4].split())
        with open(f"{OUT}/r{band:04d}.json", "w") as f:
            json.dump(pool, f, separators=(",", ":"))
    index = {
        "source": "Lichess puzzle database (CC0), https://database.lichess.org/#puzzles",
        "fields": ["id", "fen", "moves", "rating", "themes"],
        "bands": sorted(bands),
        "themes": dict(themes.most_common()),
        "count": sum(len(p) for p in bands.values()),
    }
    with open(f"{OUT}/index.json", "w") as f:
        json.dump(index, f, separators=(",", ":"))
    print(f"eligible puzzles: {kept_rows}, written: {index['count']} in {len(bands)} bands")


if __name__ == "__main__":
    main(sys.argv[1])
