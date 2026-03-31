import type { Holding } from "./models";

function stripCurrency(value: string): string {
  return value.replace(/[$,]/g, "").trim();
}

export interface ParseResult {
  holdings: Holding[];
  warnings: string[];
}

export function parsePortfolioCsv(csvText: string): ParseResult {
  const warnings: string[] = [];
  const holdings: Holding[] = [];

  // Strip trailing commas from each line (Fidelity CSV quirk)
  const lines = csvText.split(/\r?\n/).map((l) => l.replace(/,+$/, ""));

  if (lines.length < 2) return { holdings, warnings };

  // Parse header
  const header = lines[0].split(",").map((h) => h.trim());
  const col = (name: string) => header.indexOf(name);

  const iSymbol = col("Symbol");
  const iDesc = col("Description");
  const iQty = col("Quantity");
  const iPrice = col("Last Price");
  const iValue = col("Current Value");

  if (iSymbol === -1 || iQty === -1 || iPrice === -1) {
    warnings.push("Could not find expected columns (Symbol, Quantity, Last Price). Is this a Fidelity CSV?");
    return { holdings, warnings };
  }

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    // Footer lines start with a quote
    if (line.startsWith('"')) continue;

    const cols = line.split(",");
    const symbol = (cols[iSymbol] ?? "").trim();
    if (!symbol || symbol.startsWith('"')) continue;

    const description = iDesc >= 0 ? (cols[iDesc] ?? "").trim() : "";
    const rawQty = (cols[iQty] ?? "").trim();
    const rawPrice = (cols[iPrice] ?? "").trim();
    const rawValue = iValue >= 0 ? (cols[iValue] ?? "").trim() : "";

    const quantity = parseFloat(stripCurrency(rawQty));
    if (isNaN(quantity)) {
      warnings.push(`Skipping '${symbol}': missing or non-numeric quantity`);
      continue;
    }

    const lastPrice = parseFloat(stripCurrency(rawPrice));
    if (isNaN(lastPrice)) {
      warnings.push(`Skipping '${symbol}': missing or non-numeric price`);
      continue;
    }

    const currentValue = parseFloat(stripCurrency(rawValue));

    holdings.push({
      symbol,
      description,
      quantity,
      lastPrice,
      currentValue: isNaN(currentValue) ? quantity * lastPrice : currentValue,
    });
  }

  return { holdings, warnings };
}
