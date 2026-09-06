// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { useTrayDrag } from '../../src/editor/useTrayDrag';

describe('touch tray gestures', () => {
  let host: HTMLDivElement;
  let root: ReturnType<typeof createRoot>;
  const drop = vi.fn(),
    tap = vi.fn();
  function Tray() {
    const drag = useTrayDrag(drop);
    return (
      <>
        <button
          {...drag.handlers('ps_output', 'OUTPUT')}
          onClick={() => {
            if (!drag.consumeClick()) tap();
          }}
        >
          OUTPUT
        </button>
        {drag.drag && <span>Dragging</span>}
      </>
    );
  }
  beforeEach(async () => {
    vi.useFakeTimers();
    drop.mockClear();
    tap.mockClear();
    vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
    host = document.createElement('div');
    document.body.append(host);
    root = createRoot(host);
    await act(async () => root.render(<Tray />));
    host.querySelector('button')!.setPointerCapture = vi.fn();
  });
  afterEach(async () => {
    await act(async () => root.unmount());
    host.remove();
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });
  const pointer = async (type: string, x = 10, y = 10) => {
    await act(async () => {
      host.querySelector('button')!.dispatchEvent(
        new PointerEvent(type, {
          bubbles: true,
          pointerId: 1,
          pointerType: 'touch',
          isPrimary: true,
          button: 0,
          clientX: x,
          clientY: y,
        }),
      );
    });
  };
  it('inserts on tap without starting a drag', async () => {
    await pointer('pointerdown');
    await pointer('pointerup');
    await act(async () => host.querySelector('button')!.click());
    expect(tap).toHaveBeenCalledTimes(1);
    expect(drop).not.toHaveBeenCalled();
  });
  it('places a held block and suppresses duplicate tap insertion', async () => {
    await pointer('pointerdown');
    await act(async () => vi.advanceTimersByTime(400));
    expect(host.textContent).toContain('Dragging');
    await pointer('pointermove', 100, 180);
    await pointer('pointerup', 100, 180);
    await act(async () => host.querySelector('button')!.click());
    expect(drop).toHaveBeenCalledExactlyOnceWith('ps_output', { x: 100, y: 180 });
    expect(tap).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Dragging');
  });
  it('lets an early horizontal swipe cancel the hold', async () => {
    await pointer('pointerdown');
    await pointer('pointermove', 60, 10);
    await act(async () => vi.advanceTimersByTime(500));
    await pointer('pointerup', 60, 10);
    expect(host.querySelector('button')!.setPointerCapture).not.toHaveBeenCalled();
    expect(drop).not.toHaveBeenCalled();
    expect(host.textContent).not.toContain('Dragging');
  });
  it('cancels a held drag without blocking the next tap', async () => {
    await pointer('pointerdown');
    await act(async () => vi.advanceTimersByTime(400));
    await pointer('pointercancel');
    await pointer('pointerdown');
    await pointer('pointerup');
    await act(async () => host.querySelector('button')!.click());
    expect(drop).not.toHaveBeenCalled();
    expect(tap).toHaveBeenCalledTimes(1);
  });
});
