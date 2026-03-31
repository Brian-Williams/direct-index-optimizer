import type { RunResult } from "../App";
import type { TransferLine } from "../lib/models";

interface Props {
  result: RunResult;
  onReset: () => void;
}

function money(v: number) {
  return v.toLocaleString("en-US", { style: "currency", currency: "USD" });
}

function pct(v: number) {
  return (v * 100).toFixed(4) + "%";
}

export function ResultView({ result, onReset }: Props) {
  const { plan, warnings, usedCache } = result;
  const sorted = [...plan.lines].sort((a, b) => b.transferValue - a.transferValue);
  const totalTransfer = plan.totalStockValue + plan.cashSupplement;

  function downloadTxt() {
    const rows = sorted.map((l: TransferLine) =>
      [l.symbol, l.description, l.transferableShares, money(l.lastPrice),
       money(l.transferValue), pct(l.indexWeight), money(l.maxAllowedValue), l.note].join("\t")
    );
    const header = ["Symbol","Description","Shares","Price","Transfer Value","Index Weight","Max Allowed","Note"].join("\t");
    const summary = [
      "",
      "SUMMARY",
      `Total Stock Value\t${money(plan.totalStockValue)}`,
      `Cash Supplement\t${money(plan.cashSupplement)}`,
      `Total Transfer Value\t${money(totalTransfer)}`,
      `Target Value\t${money(plan.targetValue)}`,
    ].join("\n");
    const blob = new Blob([[header, ...rows, summary].join("\n")], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "transfer_plan.txt";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="result-view">
      <div className="result-header">
        <h2>Transfer Plan</h2>
        <div className="result-actions">
          <button onClick={downloadTxt} className="dl-btn">Download .txt</button>
          <button onClick={onReset} className="reset-btn">Start Over</button>
        </div>
      </div>

      {usedCache && (
        <div className="info-box">Using cached S&amp;P 500 index snapshot.</div>
      )}

      {warnings.length > 0 && (
        <div className="warning-box">
          <strong>Skipped rows:</strong>
          <ul>{warnings.map((w, i) => <li key={i}>{w}</li>)}</ul>
        </div>
      )}

      {/* Summary */}
      <section className="summary-section">
        <h3>Summary</h3>
        <table className="summary-table">
          <tbody>
            <tr><td>Total Stock Transfer Value</td><td className="num">{money(plan.totalStockValue)}</td></tr>
            <tr><td>Cash Supplement</td><td className="num">{money(plan.cashSupplement)}</td></tr>
            <tr className="total-row"><td><strong>Total Transfer Value</strong></td><td className="num"><strong>{money(totalTransfer)}</strong></td></tr>
            <tr><td>Target Value</td><td className="num">{money(plan.targetValue)}</td></tr>
          </tbody>
        </table>
      </section>

      {/* Transfer table */}
      <section className="transfer-section">
        <h3>Holdings to Transfer ({sorted.filter(l => l.transferableShares > 0).length} positions)</h3>
        <div className="table-scroll">
          <table className="transfer-table">
            <thead>
              <tr>
                <th>Symbol</th>
                <th>Description</th>
                <th className="num">Shares</th>
                <th className="num">Price</th>
                <th className="num">Transfer Value</th>
                <th className="num">Index Weight</th>
                <th className="num">Max Allowed</th>
                <th>Note</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((line) => (
                <tr key={line.symbol} className={line.transferableShares === 0 ? "zero-row" : ""}>
                  <td><strong>{line.symbol}</strong></td>
                  <td>{line.description}</td>
                  <td className="num">{line.transferableShares}</td>
                  <td className="num">{money(line.lastPrice)}</td>
                  <td className="num">{money(line.transferValue)}</td>
                  <td className="num">{pct(line.indexWeight)}</td>
                  <td className="num">{money(line.maxAllowedValue)}</td>
                  <td className="note">{line.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* Excluded */}
      <section className="excluded-section">
        <h3>Excluded Non-S&amp;P 500 Holdings ({plan.excludedHoldings.length})</h3>
        {plan.excludedHoldings.length > 0 ? (
          <div className="table-scroll">
            <table className="excluded-table">
              <thead><tr><th>Symbol</th><th>Description</th><th className="num">Quantity</th><th className="num">Value</th></tr></thead>
              <tbody>
                {plan.excludedHoldings.map((h) => (
                  <tr key={h.symbol}>
                    <td>{h.symbol}</td>
                    <td>{h.description}</td>
                    <td className="num">{h.quantity.toLocaleString()}</td>
                    <td className="num">{money(h.currentValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : <p><em>None</em></p>}
      </section>
    </div>
  );
}
