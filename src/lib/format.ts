const currencyFormatter = new Intl.NumberFormat("es-AR", {
  style: "currency",
  currency: "ARS",
  maximumFractionDigits: 0,
});

export function formatMonto(monto: number): string {
  return currencyFormatter.format(monto);
}
