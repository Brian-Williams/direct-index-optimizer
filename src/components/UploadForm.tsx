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
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      const csvText = await csvFile.text();
      const { holdings, warnings } = parsePortfolioCsv(csvText);

      // Load weights: custom uploaded cache > bundled cache
      let sp500Weights: Record<string, number>;
      const customCache = cacheRef.current?.files?.[0];
      if (customCache) {
        const cacheText = await customCache.text();
        sp500Weights = JSON.parse(cacheText);
      } else {
        const base = import.meta.env.BASE_URL;
        const resp = await fetch(`${base}sp500_cache.json`);
        if (!resp.ok) throw new Error("Failed to load bundled S&P 500 cache.");
        sp500Weights = await resp.json();
      }

      const plan = computeTransferPlan(holdings, sp500Weights, targetNum);
      onResult({ plan, warnings, usedCache: !customCache });
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
        <span className="hint">
          Export from Fidelity: Accounts &rarr; Portfolio &rarr; Download
        </span>
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

      <details
        className="advanced-details"
        open={showAdvanced}
        onToggle={(e) => setShowAdvanced((e.currentTarget as HTMLDetailsElement).open)}
      >
        <summary className="advanced-summary">Advanced</summary>
        <div className="advanced-body">
          <div className="form-group">
            <label htmlFor="cache_file">Upload custom S&amp;P 500 cache (optional)</label>
            <input id="cache_file" type="file" accept=".json" ref={cacheRef} />
            <span className="hint">
              Upload a fresh <code>sp500_cache.json</code> to override the bundled index snapshot.
              Leave blank to use the bundled snapshot (recommended).
            </span>
          </div>
        </div>
      </details>

      {error && <div className="error-box">{error}</div>}

      <button type="submit" disabled={loading} className="run-btn">
        {loading ? "Computing…" : "Generate Transfer Plan"}
      </button>
    </form>
  );
}
