import { render, screen, fireEvent, act } from '@testing-library/react'
import { ToastProvider, useToast } from './ToastContext'
import { ModalProvider, useModal } from './ModalContext'

function ToastDemo() {
  const toast = useToast()
  return <button onClick={() => toast('Saved!')}>go</button>
}

test('toast shows message', async () => {
  render(<ToastProvider><ToastDemo /></ToastProvider>)
  fireEvent.click(screen.getByText('go'))
  expect(await screen.findByText('Saved!')).toBeInTheDocument()
})

test('toast auto-hides after 2.4s and a new toast resets the timer', async () => {
  vi.useFakeTimers()
  try {
    function Demo() {
      const toast = useToast()
      return (
        <div>
          <button onClick={() => toast('toast-msg-1')}>fire1</button>
          <button onClick={() => toast('toast-msg-2')}>fire2</button>
        </div>
      )
    }
    render(<ToastProvider><Demo /></ToastProvider>)

    fireEvent.click(screen.getByText('fire1'))
    expect(screen.getByText('toast-msg-1')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1500) })
    fireEvent.click(screen.getByText('fire2'))
    expect(screen.getByText('toast-msg-2')).toBeInTheDocument()

    // Only 1.5s since the reset — original 2.4s timer must not have fired.
    act(() => { vi.advanceTimersByTime(1500) })
    expect(screen.getByText('toast-msg-2')).toBeInTheDocument()

    act(() => { vi.advanceTimersByTime(1000) })
    expect(screen.queryByText('toast-msg-2')).not.toBeInTheDocument()
  } finally {
    vi.useRealTimers()
  }
})

function ModalDemo() {
  const { openModal, closeModal } = useModal()
  return <button onClick={() => openModal(<div>modal body <button onClick={closeModal}>x</button></div>)}>open</button>
}

test('modal opens and closes on ESC', async () => {
  render(<ModalProvider><ModalDemo /></ModalProvider>)
  fireEvent.click(screen.getByText('open'))
  expect(await screen.findByText(/modal body/)).toBeInTheDocument()
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByText(/modal body/)).not.toBeInTheDocument()
})

test('modal closes on overlay mousedown but not on box mousedown', async () => {
  function Demo() {
    const { openModal } = useModal()
    return <button onClick={() => openModal(<div>box content</div>)}>open</button>
  }
  render(<ModalProvider><Demo /></ModalProvider>)
  fireEvent.click(screen.getByText('open'))
  const content = await screen.findByText('box content')
  expect(content).toBeInTheDocument()

  // Mousedown inside the box must not close.
  fireEvent.mouseDown(content)
  expect(screen.getByText('box content')).toBeInTheDocument()

  // Mousedown on the overlay backdrop closes.
  fireEvent.mouseDown(screen.getByTestId('modal-overlay'))
  expect(screen.queryByText('box content')).not.toBeInTheDocument()
})

test('modal locks and restores body scroll', async () => {
  function Demo() {
    const { openModal, closeModal } = useModal()
    return <button onClick={() => openModal(<button onClick={closeModal}>close-me</button>)}>open</button>
  }
  render(<ModalProvider><Demo /></ModalProvider>)
  expect(document.body.style.overflow).not.toBe('hidden')
  fireEvent.click(screen.getByText('open'))
  await screen.findByText('close-me')
  expect(document.body.style.overflow).toBe('hidden')
  fireEvent.click(screen.getByText('close-me'))
  expect(document.body.style.overflow).toBe('')
})

test('modal traps focus with Tab cycling and restores focus to the opener on close', async () => {
  function Demo() {
    const { openModal, closeModal } = useModal()
    return (
      <button onClick={() => openModal(
        <div>
          <button>first</button>
          <button onClick={closeModal}>last</button>
        </div>
      )}>opener</button>
    )
  }
  render(<ModalProvider><Demo /></ModalProvider>)
  const opener = screen.getByText('opener')
  opener.focus()
  fireEvent.click(opener)

  const first = await screen.findByText('first')
  const last = screen.getByText('last')

  await act(async () => { await vi.waitFor(() => expect(document.activeElement).toBe(first)) })

  first.focus()
  fireEvent.keyDown(document, { key: 'Tab', shiftKey: true })
  expect(document.activeElement).toBe(last)

  last.focus()
  fireEvent.keyDown(document, { key: 'Tab' })
  expect(document.activeElement).toBe(first)

  fireEvent.click(last)
  expect(screen.queryByText('first')).not.toBeInTheDocument()
  expect(document.activeElement).toBe(opener)
})

test('setModalLocked blocks ESC and overlay close until unlocked', async () => {
  function LockedBody() {
    const { setModalLocked } = useModal()
    return (
      <div>
        locked body
        <button onClick={() => setModalLocked(true)}>lock</button>
        <button onClick={() => setModalLocked(false)}>unlock</button>
      </div>
    )
  }
  function Demo() {
    const { openModal } = useModal()
    return <button onClick={() => openModal(<LockedBody />)}>open</button>
  }
  render(<ModalProvider><Demo /></ModalProvider>)
  fireEvent.click(screen.getByText('open'))
  expect(await screen.findByText(/locked body/)).toBeInTheDocument()
  fireEvent.click(screen.getByText('lock'))

  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.getByText(/locked body/)).toBeInTheDocument()

  fireEvent.mouseDown(screen.getByTestId('modal-overlay'))
  expect(screen.getByText(/locked body/)).toBeInTheDocument()

  fireEvent.click(screen.getByText('unlock'))
  fireEvent.keyDown(document, { key: 'Escape' })
  expect(screen.queryByText(/locked body/)).not.toBeInTheDocument()
})

test('openModal size option maps to the correct modal class', async () => {
  function Demo() {
    const { openModal } = useModal()
    return <button onClick={() => openModal(<div>sized body</div>, { size: 'lg' })}>open</button>
  }
  render(<ModalProvider><Demo /></ModalProvider>)
  fireEvent.click(screen.getByText('open'))
  const body = await screen.findByText('sized body')
  const box = body.closest('[data-testid="modal-box"]')
  expect(box.className).toMatch(/(^|[_\s])lg([_\s]|$)/)
})
