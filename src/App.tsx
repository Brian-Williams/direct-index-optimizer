import { useState } from "react";
import { UploadForm } from "./components/UploadForm";
import { ResultView } from "./components/ResultView";
import type { TransferPlan } from "./lib/models";

export interface RunResult {
  plan: TransferPlan;
  warnings: string[];
  usedCache: boolean;
}

export default function App() {
  const [result, setResult] = useState<RunResult | null>(null);

  return (
    <div className="app">
      <header>
        <h1>Direct Index Optimizer</h1>
        <p className="subtitle">
          Plan an ACATS in-kind transfer to an S&amp;P 500 direct indexing service
        </p>
      </header>
      <main>
        <UploadForm onResult={setResult} />
        {result && <ResultView result={result} onReset={() => setResult(null)} />}
      </main>
      <footer>
        <p>All computation runs locally in your browser. No data is uploaded to any server.</p>
      </footer>
    </div>
  );
}
