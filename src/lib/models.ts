export interface Holding {
  symbol: string;
  description: string;
  quantity: number;
  lastPrice: number;
  currentValue: number;
}

export interface TransferLine {
  symbol: string;
  description: string;
  transferableShares: number;
  lastPrice: number;
  transferValue: number;
  indexWeight: number;
  maxAllowedValue: number;
  note: string;
}

export interface TransferPlan {
  lines: TransferLine[];
  excludedHoldings: Holding[];
  totalStockValue: number;
  cashSupplement: number;
  targetValue: number;
}
