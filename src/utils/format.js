export const fmt = (n, cur = '₾') =>
  (n < 0 ? '-' : '') + cur + Math.abs(n).toLocaleString('en-US', {
    minimumFractionDigits: 2, maximumFractionDigits: 2,
  })
