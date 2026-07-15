import { useCallback, useEffect, useRef, useState } from 'react'

export function useAsync(fn, deps = []) {
  const [state, setState] = useState({ data: null, loading: true, error: null })
  const token = useRef(0)
  const run = useCallback(() => {
    const t = ++token.current
    setState(s => ({ ...s, loading: true, error: null }))
    Promise.resolve()
      .then(fn)
      .then(data => { if (t === token.current) setState({ data, loading: false, error: null }) })
      .catch(error => { if (t === token.current) setState({ data: null, loading: false, error }) })
  }, deps) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { run() }, [run])
  const setData = useCallback(data => setState(s => ({ ...s, data })), [])
  return { ...state, reload: run, setData }
}
