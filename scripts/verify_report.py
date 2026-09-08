#!/usr/bin/env python3
"""Verify a sanitized benchmark report without accessing private text."""

from __future__ import annotations

import argparse
import csv
import json
import math
import re
import statistics
from pathlib import Path


EXPECTED_COLUMNS = [
    "sample_id",
    "pangram_human_score",
    "pangram_human_verdict",
    "gptzero_human_score",
    "gptzero_human_verdict",
    "winston_human_score",
    "winston_human_verdict",
    "originality_human_score",
    "originality_human_verdict",
]

DETECTORS = {
    "Pangram": ("pangram_human_score", "pangram_human_verdict"),
    "GPTZero": ("gptzero_human_score", "gptzero_human_verdict"),
    "Winston AI": ("winston_human_score", "winston_human_verdict"),
    "Originality.ai": (
        "originality_human_score",
        "originality_human_verdict",
    ),
}


def close(actual: float, expected: float) -> bool:
    return math.isclose(actual, expected, rel_tol=0, abs_tol=1e-7)


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("report_dir", type=Path)
    args = parser.parse_args()

    scores_path = args.report_dir / "data" / "scores.csv"
    summary_path = args.report_dir / "data" / "summary.json"

    with scores_path.open(newline="", encoding="utf-8") as handle:
        reader = csv.DictReader(handle)
        if reader.fieldnames != EXPECTED_COLUMNS:
            raise SystemExit(f"unexpected public schema: {reader.fieldnames}")
        rows = list(reader)

    summary = json.loads(summary_path.read_text(encoding="utf-8"))
    expected_size = summary["sample"]["size"]
    if not isinstance(expected_size, int) or expected_size < 1:
        raise SystemExit("summary has an invalid sample size")
    if len(rows) != expected_size:
        raise SystemExit("summary sample size does not match score rows")

    width = max(3, len(str(expected_size)))
    expected_ids = [
        f"sample_{index:0{width}d}" for index in range(1, expected_size + 1)
    ]
    actual_ids = [row["sample_id"] for row in rows]
    if actual_ids != expected_ids:
        raise SystemExit("sample IDs are missing, duplicated, or out of order")

    serialized = scores_path.read_text(encoding="utf-8")
    if re.search(r"\bprod\d+-\d+\b", serialized, flags=re.IGNORECASE):
        raise SystemExit("internal sample identifier found")

    summary_by_detector = {
        item["detector"]: item for item in summary["results"]
    }

    for detector, (score_column, verdict_column) in DETECTORS.items():
        values = [float(row[score_column]) for row in rows]
        if not all(math.isfinite(value) and 0 <= value <= 1 for value in values):
            raise SystemExit(f"{detector}: score outside 0–1 range")
        if any(row[verdict_column] not in {"true", "false"} for row in rows):
            raise SystemExit(f"{detector}: invalid human verdict")

        calculated = {
            "mean_human_score": statistics.fmean(values),
            "median_human_score": float(statistics.median(values)),
            "strict_bypass_count": sum(
                row[verdict_column] == "true" for row in rows
            ),
        }
        recorded = summary_by_detector[detector]

        if not close(
            calculated["mean_human_score"], recorded["mean_human_score"]
        ):
            raise SystemExit(f"{detector}: mean does not match summary")
        if not close(
            calculated["median_human_score"], recorded["median_human_score"]
        ):
            raise SystemExit(f"{detector}: median does not match summary")
        if (
            calculated["strict_bypass_count"]
            != recorded["strict_bypass_count"]
        ):
            raise SystemExit(f"{detector}: bypass count does not match summary")

    print(
        f"Verified {expected_size} anonymized samples and all detector aggregates."
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
