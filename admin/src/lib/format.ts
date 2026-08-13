export function formatIQD(amount: number): string {
  return `${new Intl.NumberFormat('ar-IQ').format(Math.round(amount))} د.ع`;
}
