#!/usr/bin/env python3
"""
Update the bundled S&P 500 index weight cache.

Fetches the current S&P 500 constituent list from Wikipedia and computes
approximate index weights from yfinance market caps, then writes the result
to public/sp500_cache.json so the web app picks it up on the next build/deploy.

Usage:
    python update_sp500_cache.py

Requirements:
    pip install pandas yfinance lxml html5lib beautifulsoup4
"""

import io
import json
import sys
import urllib.request
from pathlib import Path

OUTPUT = Path(__file__).parent / "public" / "sp500_cache.json"


def fetch_tickers() -> list[str]:
    print("Fetching S&P 500 constituent list from Wikipedia...")
    url = "https://en.wikipedia.org/wiki/List_of_S%26P_500_companies"
    req = urllib.request.Request(
        url,
        headers={"User-Agent": "Mozilla/5.0 (compatible; sp500-cache-updater/1.0)"},
    )
    with urllib.request.urlopen(req, timeout=30) as resp:
        html = resp.read()

    import pandas as pd
    tables = pd.read_html(io.BytesIO(html))
    tickers = tables[0]["Symbol"].tolist()
    print(f"  Found {len(tickers)} constituents.")
    return tickers


def normalize(ticker: str) -> str:
    return ticker.replace(".", "").replace("-", "")


def fetch_weights(tickers: list[str]) -> dict[str, float]:
    import yfinance as yf

    print("Fetching market caps from yfinance (this takes a minute)...")
    batch = yf.Tickers(" ".join(tickers))

    market_caps: dict[str, float] = {}
    for i, ticker in enumerate(tickers):
        try:
            cap = batch.tickers[ticker].info.get("marketCap")
            if cap and cap > 0:
                market_caps[normalize(ticker)] = float(cap)
        except Exception:
            pass
        if (i + 1) % 50 == 0:
            print(f"  {i + 1}/{len(tickers)} processed...")

    total = sum(market_caps.values())
    if total <= 0:
        raise RuntimeError("Could not retrieve any market cap data.")

    weights = {t: cap / total for t, cap in market_caps.items()}
    weight_sum = sum(weights.values())
    print(f"  {len(weights)} tickers with market cap data. Weight sum: {weight_sum:.4f}")
    return weights


def main():
    try:
        tickers = fetch_tickers()
        weights = fetch_weights(tickers)
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        sys.exit(1)

    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    with open(OUTPUT, "w") as f:
        json.dump(weights, f, indent=2)

    print(f"\nWrote {len(weights)} entries to {OUTPUT}")
    print("Next steps:")
    print("  git add public/sp500_cache.json")
    print('  git commit -m "chore: update S&P 500 cache"')
    print("  git push")


if __name__ == "__main__":
    main()
