import { ph, qrSvg } from './placeholder'

test('ph is a deterministic svg data uri', () => {
  expect(ph(3, 600, 400)).toBe(ph(3, 600, 400))
  expect(ph(3)).toMatch(/^data:image\/svg\+xml/)
  expect(ph(1)).not.toBe(ph(2))
})
test('qrSvg deterministic svg string with finder patterns', () => {
  const svg = qrSvg('AP-OCTA303026')
  expect(svg).toBe(qrSvg('AP-OCTA303026'))
  expect(svg).toMatch(/^<svg/)
})
