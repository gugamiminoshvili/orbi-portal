import { describe, test, expect } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import Tooltip from './Tooltip'

describe('Tooltip', () => {
  test('opens on hover and closes when the pointer leaves', () => {
    render(<Tooltip text="Why this happened">Status</Tooltip>)
    const trigger = screen.getByRole('button')

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
    fireEvent.mouseEnter(trigger)
    expect(screen.getByRole('tooltip')).toHaveTextContent('Why this happened')
    fireEvent.mouseLeave(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  test('a tap toggles it — the route for a screen with no hover', () => {
    render(<Tooltip text="Why this happened">Status</Tooltip>)
    const trigger = screen.getByRole('button')

    fireEvent.click(trigger)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
    fireEvent.click(trigger)
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  test('a tap elsewhere closes it, since nothing will fire a mouseleave', () => {
    render(
      <div>
        <Tooltip text="Why this happened">Status</Tooltip>
        <span data-outside>elsewhere</span>
      </div>
    )
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.pointerDown(document.querySelector('[data-outside]'))
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  test('Escape closes it', () => {
    render(<Tooltip text="Why this happened">Status</Tooltip>)
    fireEvent.click(screen.getByRole('button'))
    expect(screen.getByRole('tooltip')).toBeInTheDocument()

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument()
  })

  test('the trigger describes itself only while the bubble is up', () => {
    render(<Tooltip text="Why this happened">Status</Tooltip>)
    const trigger = screen.getByRole('button')

    expect(trigger).not.toHaveAttribute('aria-describedby')
    fireEvent.mouseEnter(trigger)
    expect(trigger.getAttribute('aria-describedby')).toBe(screen.getByRole('tooltip').id)
  })

  test('interactive={false} renders no button — for a trigger already inside one', () => {
    render(
      <button type="button">
        pill
        <Tooltip text="Why this happened" interactive={false}>
          <span data-badge>Not valid</span>
        </Tooltip>
      </button>
    )
    // One button in the tree, the outer one: no nested button was rendered.
    expect(screen.getAllByRole('button')).toHaveLength(1)

    fireEvent.mouseEnter(document.querySelector('[data-badge]').parentElement)
    expect(screen.getByRole('tooltip')).toBeInTheDocument()
  })

  test('with no text it renders the children alone — no trigger, no bubble', () => {
    render(<Tooltip text={null}>Verified</Tooltip>)
    expect(screen.getByText('Verified')).toBeInTheDocument()
    expect(screen.queryByRole('button')).not.toBeInTheDocument()
  })
})
