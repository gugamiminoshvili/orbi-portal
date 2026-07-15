import { renderHook, waitFor, act } from '@testing-library/react'
import { useAsync } from './useAsync'

test('loads data', async () => {
  const { result } = renderHook(() => useAsync(async () => 42))
  expect(result.current.loading).toBe(true)
  await waitFor(() => expect(result.current.loading).toBe(false))
  expect(result.current.data).toBe(42)
})
test('captures errors', async () => {
  const { result } = renderHook(() => useAsync(async () => { throw new Error('boom') }))
  await waitFor(() => expect(result.current.error).toBeTruthy())
  expect(result.current.data).toBe(null)
})
test('reload re-runs fn', async () => {
  let n = 0
  const { result } = renderHook(() => useAsync(async () => ++n))
  await waitFor(() => expect(result.current.data).toBe(1))
  act(() => result.current.reload())
  await waitFor(() => expect(result.current.data).toBe(2))
})
