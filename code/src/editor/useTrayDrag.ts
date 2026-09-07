import { useEffect, useRef, useState } from 'react';
import type { MouseEvent, PointerEvent } from 'react';

export function useTrayDrag(onDrop: (type: string, point: { x: number; y: number }) => void) {
  const drop = useRef(onDrop);
  drop.current = onDrop;
  const pending = useRef<{
    x: number;
    y: number;
    id: number;
    ready: boolean;
    timer?: ReturnType<typeof setTimeout>;
  } | null>(null);
  const skipClick = useRef(false);
  const [drag, setDrag] = useState<{ x: number; y: number; label: string } | null>(null);
  const cancel = () => {
    clearTimeout(pending.current?.timer);
    pending.current = null;
    setDrag(null);
  };
  useEffect(
    () => () => {
      clearTimeout(pending.current?.timer);
    },
    [],
  );
  return {
    drag,
    consumeClick: () => {
      const skip = skipClick.current;
      skipClick.current = false;
      return skip;
    },
    handlers: (type: string, label: string) => ({
      onPointerDown(event: PointerEvent<HTMLButtonElement>) {
        if (!event.isPrimary || event.button !== 0) return;
        cancel();
        skipClick.current = false;
        const button = event.currentTarget;
        const state = {
          x: event.clientX,
          y: event.clientY,
          id: event.pointerId,
          ready: event.pointerType !== 'touch',
          timer: undefined as ReturnType<typeof setTimeout> | undefined,
        };
        pending.current = state;
        if (state.ready) button.setPointerCapture(state.id);
        else
          state.timer = setTimeout(() => {
            if (pending.current !== state) return;
            state.ready = true;
            skipClick.current = true;
            button.setPointerCapture(state.id);
            setDrag({ x: state.x, y: state.y, label });
          }, 400);
      },
      onPointerMove(event: PointerEvent<HTMLButtonElement>) {
        const state = pending.current;
        if (!state || state.id !== event.pointerId) return;
        const moved = Math.hypot(event.clientX - state.x, event.clientY - state.y) > 8;
        if (!state.ready) {
          if (moved) {
            skipClick.current = true;
            cancel();
          }
          return;
        }
        if (moved) {
          skipClick.current = true;
          event.preventDefault();
          setDrag({ x: event.clientX, y: event.clientY, label });
        }
      },
      onPointerUp(event: PointerEvent<HTMLButtonElement>) {
        const state = pending.current;
        if (!state || state.id !== event.pointerId) return;
        if (state.ready && skipClick.current)
          drop.current(type, { x: event.clientX, y: event.clientY });
        cancel();
      },
      onPointerCancel() {
        skipClick.current = true;
        cancel();
      },
      onLostPointerCapture() {
        cancel();
      },
      onContextMenu(event: MouseEvent<HTMLButtonElement>) {
        event.preventDefault();
      },
    }),
  };
}
