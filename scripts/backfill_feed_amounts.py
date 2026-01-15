#!/usr/bin/env python3
import argparse
import os
import re
import sqlite3
from pathlib import Path


ML_VALUE_RE = re.compile(r"(\\d{1,4})\\s*ml", re.IGNORECASE)


def extract_ml(note: str, keyword_re: re.Pattern[str]) -> int | None:
    match = re.search(
        rf"{keyword_re.pattern}\\D{{0,16}}(\\d{{1,4}})\\s*ml",
        note,
        re.IGNORECASE,
    )
    if match:
        return int(match.group(1))
    match = re.search(
        rf"(\\d{{1,4}})\\s*ml\\D{{0,16}}{keyword_re.pattern}",
        note,
        re.IGNORECASE,
    )
    if match:
        return int(match.group(1))
    if not keyword_re.search(note):
        return None
    ml_values = ML_VALUE_RE.findall(note)
    if len(ml_values) == 1:
        return int(ml_values[0])
    return None


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Backfill expressed/formula amounts from notes."
    )
    parser.add_argument(
        "--db-path",
        default=os.getenv("BABY_TRACKER_DB_PATH", "./data/baby-tracker.sqlite"),
        help="SQLite database path (default: ./data/baby-tracker.sqlite).",
    )
    args = parser.parse_args()

    db_path = Path(args.db_path)
    if not db_path.exists():
        print(f"Database not found: {db_path}")
        return 1

    conn = sqlite3.connect(db_path)
    conn.row_factory = sqlite3.Row
    try:
        columns = {row["name"] for row in conn.execute("PRAGMA table_info(entries)")}
        required = {"notes", "expressed_ml", "formula_ml"}
        missing = required - columns
        if missing:
            print(f"Missing columns in entries table: {', '.join(sorted(missing))}")
            return 1

        rows = conn.execute(
            """
            SELECT id, notes, expressed_ml, formula_ml
            FROM entries
            WHERE notes IS NOT NULL
              AND (expressed_ml IS NULL OR formula_ml IS NULL)
            """
        ).fetchall()

        expressed_re = re.compile(r"express(ed)?", re.IGNORECASE)
        formula_re = re.compile(r"formula", re.IGNORECASE)

        scanned = 0
        updated = 0
        expressed_updates = 0
        formula_updates = 0
        for row in rows:
            scanned += 1
            note = row["notes"] or ""
            updates: dict[str, int] = {}
            if row["expressed_ml"] is None:
                expressed_ml = extract_ml(note, expressed_re)
                if expressed_ml is not None:
                    updates["expressed_ml"] = expressed_ml
            if row["formula_ml"] is None:
                formula_ml = extract_ml(note, formula_re)
                if formula_ml is not None:
                    updates["formula_ml"] = formula_ml
            if not updates:
                continue
            conn.execute(
                """
                UPDATE entries
                SET expressed_ml = COALESCE(?, expressed_ml),
                    formula_ml = COALESCE(?, formula_ml)
                WHERE id = ?
                """,
                (
                    updates.get("expressed_ml"),
                    updates.get("formula_ml"),
                    row["id"],
                ),
            )
            updated += 1
            if "expressed_ml" in updates:
                expressed_updates += 1
            if "formula_ml" in updates:
                formula_updates += 1

        conn.commit()
    finally:
        conn.close()

    print(
        "Backfill complete.",
        f"Scanned {scanned}.",
        f"Updated {updated}.",
        f"Expressed set: {expressed_updates}.",
        f"Formula set: {formula_updates}.",
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
