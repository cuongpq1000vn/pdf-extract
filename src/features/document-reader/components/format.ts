export const formatMoney = (value: number): string =>
  value.toLocaleString("en-NZ", { style: "currency", currency: "NZD", currencyDisplay: "narrowSymbol" });

export const formatWhere = (page: number | null): string => (page === null ? "Whole document" : `Page ${page}`);
