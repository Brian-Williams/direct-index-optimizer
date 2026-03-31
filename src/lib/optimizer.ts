import type { Holding, TransferLine, TransferPlan } from "./models";

export function normalizeTicker(ticker: string): string {
  return ticker.replace(/[.\-]/g, "");
}

export function computeTransferPlan(
  holdings: Holding[],
  sp500Weights: Record<string, number>,
  targetValue: number
): TransferPlan {
  const lines: TransferLine[] = [];
  const excludedHoldings: Holding[] = [];

  for (const holding of holdings) {
    const normalized = normalizeTicker(holding.symbol);
    if (!(normalized in sp500Weights)) {
      excludedHoldings.push(holding);
      continue;
    }

    const indexWeight = sp500Weights[normalized];
    const maxAllowedValue = indexWeight * targetValue;

    let transferableShares = 0;
    if (holding.lastPrice > 0) {
      transferableShares = Math.floor(
        Math.min(holding.quantity, maxAllowedValue / holding.lastPrice)
      );
    }

    const transferValue = transferableShares * holding.lastPrice;
    const note = transferableShares === 0 ? "zero shares transferable" : "";

    lines.push({
      symbol: holding.symbol,
      description: holding.description,
      transferableShares,
      lastPrice: holding.lastPrice,
      transferValue,
      indexWeight,
      maxAllowedValue,
      note,
    });
  }

  let totalStockValue = lines.reduce((s, l) => s + l.transferValue, 0);

  // Iteratively reduce largest positions if total exceeds target
  if (totalStockValue > targetValue) {
    while (totalStockValue > targetValue) {
      let bestIdx = -1;
      let bestValue = -1;
      for (let i = 0; i < lines.length; i++) {
        if (lines[i].transferableShares > 0 && lines[i].transferValue > bestValue) {
          bestValue = lines[i].transferValue;
          bestIdx = i;
        }
      }
      if (bestIdx === -1) break;

      const line = lines[bestIdx];
      const newShares = line.transferableShares - 1;
      const newValue = newShares * line.lastPrice;
      totalStockValue -= line.transferValue - newValue;
      lines[bestIdx] = {
        ...line,
        transferableShares: newShares,
        transferValue: newValue,
        note: newShares === 0 ? "zero shares transferable" : line.note,
      };
    }
    return { lines, excludedHoldings, totalStockValue, cashSupplement: 0, targetValue };
  }

  return {
    lines,
    excludedHoldings,
    totalStockValue,
    cashSupplement: targetValue - totalStockValue,
    targetValue,
  };
}
