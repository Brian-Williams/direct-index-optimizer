import { useRef, useState } from "react";
import type { RunResult } from "../App";
import { parsePortfolioCsv } from "../lib/csvParser";
import { computeTransferPlan } from "../lib/optimizer";

interface Props {
  onResult: (r: RunResult) => void;
}

export function UploadForm({ onResult }: Props) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [useCache, setUseCache] = useState(true);
  const [target, setTarget] = useState("900000");
  const csvRef = useRef<HTMLInputElement>(null);
  const cacheRef = useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const csvFile = csvRef.current?.files?.[0];
    if (!csvFile) {
      setError("Please select a Fidelity portfolio CSV file.");
      return;
    }

    const targetNum = parseFloat(target.replace(/,/g, ""));
    if (isNaN(targetNum) || targetNum <= 0) {
      setError("Target value must be a positive number.");
      return;
    }

    setLoading(true);
    try {
      // Parse portfolio CSV
      const csvText = await csvFile.text();
      const { holdings, warnings } = parsePortfolioCsv(csvText);

      // Load S&P 500 weights
      let sp500Weights: Record<string, number>;
      if (useCache) {
        // Use custom uploaded cache if provided, otherwise fetch bundled cache
        const customCache = cacheRef.current?.files?.[0];
        if (customCache) {
          const cacheText = await customCache.text();
          sp500Weights = JSON.parse(cacheText);
        } else {
          // Fetch the bundled cache from the public folder
          const base = import.meta.env.BASE_URL;
          const resp = await fetch(`${base}sp500_cache.json`);
          if (!resp.ok) throw new Error("Failed to load bundled S&P 500 cache.");
          sp500Weights = await resp.json();
        }
      } else {
        throw new Error(
          "Live S&P 500 data fetch is not available in the browser. " +
          "Please use the cached index or upload a fresh sp500_cache.json. " +
          "You can regenerate it locally by running: python -c \"from acats_transfer_optimizer.index_fetcher import fetch_sp500_weights; import json; json.dump(fetch_sp500_weights(), open('sp500_cache.json','w'))\""
        );
      }

      const plan = computeTransferPlan(holdings, sp500Weights, targetNum);
      onResult({ plan, warnings, usedCache: useCache });
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <form className="upload-form" onSubmit={handleSubmit}>
      <div className="form-group">
        <label htmlFor="csv_file">Fidelity Portfolio CSV</label>
        <input id="csv_file" type="file" accept=".csv" ref={csvRef} required />
        <span className="hint">Export from Fidelity: Accounts → Portfolio → Download</span>
      </div>

      <div className="form-group">
        <label htmlFor="target">Target Transfer Value ($)</label>
        <input
          id="target"
          type="text"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="900000"
        />
      </div>

      <div className="form-group cache-group">
        <label className="checkbox-label">
          <input
            type="checkbox"
            checked={useCache}
            onChange={(e) => setUseCache(e.target.checked)}
          />
          Use cached S&amp;P 500 index (fast)
        </label>
        <span className="hint">
          Uses the bundled index snapshot for instant results.
          Uncheck to upload a fresh cache file instead.
        </span>
        {useCache && (
          <div className="cache-upload">
            <label htmlFor="cache_file">Upload fresh sp500_cache.json (optional)</label>
            <input id="cache_file" type="file" accept=".json" ref={cacheRef} />
            <span className="hint">Leave blank to use the bundled snapshot.</span>
          </div>
        )}
      </div>

      {error && <div className="error-box">{error}</div>}

      <button type="submit" disabled={loading} className="run-btn">
        {loading ? "Computing…" : "Generate Transfer Plan"}
      </button>
    </form>
  );
}
