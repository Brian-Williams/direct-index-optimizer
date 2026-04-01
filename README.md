# Direct Index Optimizer

A browser-based tool for planning an ACATS in-kind transfer to an S&P 500 direct
indexing service (e.g. Wealthfront, FREC).

**Live site:** https://brian-williams.github.io/direct-index-optimizer/

---

## What it does

Given a Fidelity portfolio CSV export and a target transfer value, the tool:

1. Parses your current holdings from the CSV
2. Matches each holding against the S&P 500 constituent list
3. Computes the maximum whole-share quantity of each eligible stock that can be
   transferred without over-weighting relative to its index weight
4. Calculates the cash supplement needed to reach the target value
5. Outputs a formatted transfer plan you can download as a `.txt` file

All computation runs entirely in your browser. No data is sent to any server.

---

## About the $900,000 default target

The default target of **$900,000** corresponds to Wealthfront's SIPC insurance
coverage limit on equities. This is the level at which a direct indexing account
is fully protected under SIPC.

> **This is not investment advice.** The $900,000 figure is used purely as a
> practical starting point for the transfer calculation. Equity values will
> fluctuate after transfer and may exceed this threshold over time — that is
> normal and expected. Consult a qualified financial advisor before making any
> transfer decisions.

---

## How to use

1. Log in to Fidelity and export your portfolio:
   **Accounts → Portfolio → Download (CSV)**
2. Open the [live site](https://brian-williams.github.io/direct-index-optimizer/)
3. Upload the CSV and set your target transfer value
4. Click **Generate Transfer Plan**
5. Review the results and download the `.txt` report

---

## Updating the S&P 500 index cache

The app ships with a bundled `public/sp500_cache.json` snapshot of S&P 500
constituent weights. This file should be refreshed periodically (e.g. quarterly)
to reflect index rebalancing and market cap changes.

### Requirements

```bash
pip install pandas yfinance lxml html5lib beautifulsoup4
```

### Run the update script

From inside the `direct-index-optimizer/` directory:

```bash
python update_sp500_cache.py
```

This fetches the current constituent list from Wikipedia and computes weights
from live yfinance market cap data. It takes about 1–2 minutes to run.

### Commit and deploy

```bash
git add public/sp500_cache.json
git commit -m "chore: update S&P 500 cache"
git push
```

GitHub Actions will automatically rebuild and redeploy the site with the fresh
cache within a minute or two.

### Using a fresh cache without redeploying

If you want to use a more up-to-date cache without waiting for a deploy, run the
update script locally and upload the generated `public/sp500_cache.json` directly
in the app via the **Advanced** section on the upload form.

---

## Local development

Requires [Node.js](https://nodejs.org) v20+.

```bash
npm install
npm run dev       # dev server at http://localhost:5173
npm run build     # production build → dist/
```

---

## How it works

The optimizer follows this pipeline:

```
CSV upload → parse holdings → load S&P 500 weights → compute transfer plan → render report
```

For each S&P 500 holding:

```
max_allowed_value    = index_weight × target_value
transferable_shares  = floor(min(owned_quantity, max_allowed_value / last_price))
transfer_value       = transferable_shares × last_price
cash_supplement      = target_value − total_transfer_value
```

Non-S&P 500 holdings (ETFs, mutual funds, bonds, money market) are excluded from
the transfer plan and listed separately.

---

## CI/CD

Pushes to `main` automatically build and deploy to GitHub Pages via
`.github/workflows/deploy.yml`.
