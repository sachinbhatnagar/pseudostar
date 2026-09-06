// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act, createRef } from 'react';
import { createRoot } from 'react-dom/client';
import { BlockEditor, type BlockHandle } from '../../src/editor/BlockEditor';

const blockly = vi.hoisted(() => ({
  undo: vi.fn(),
  load: vi.fn(() => 'conversion'),
  listener: undefined as undefined | ((event: object) => void),
}));
vi.mock('../../src/editor/blocks', () => ({
  Blockly: {
    inject: () => ({
      undo: blockly.undo,
      dispose: vi.fn(),
      zoomToFit: vi.fn(),
      getAllBlocks: () => [],
      getTopBlocks: () => [],
      getBlockById: () => null,
      addChangeListener: (listener: (event: object) => void) => {
        blockly.listener = listener;
      },
    }),
    Events: { SELECTED: 'selected' },
  },
  palette: [],
  theme: {},
  programToWorkspace: blockly.load,
  sourceFor: () => 'OUTPUT 99',
}));

let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
let handle: ReturnType<typeof createRef<BlockHandle>>;
const changed = vi.fn();
beforeEach(() => {
  vi.useFakeTimers();
  vi.clearAllMocks();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  vi.stubGlobal(
    'ResizeObserver',
    class {
      observe() {}
      disconnect() {}
    },
  );
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
  handle = createRef<BlockHandle>();
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const render = async (source: string, invalid = false) => {
  await act(async () =>
    root.render(
      <BlockEditor
        ref={handle}
        source={source}
        invalid={invalid}
        lastValidSource="OUTPUT 1"
        onChange={changed}
      />,
    ),
  );
};
const staleEvent = () =>
  blockly.listener!({ type: 'change', isUiEvent: false, recordUndo: false, group: '' });

it('blocks retained Undo/Redo handles and queued events when a valid draft becomes invalid', async () => {
  await render('OUTPUT 1');
  const retained = handle.current!;
  await render('OUTPUT (', true);
  await act(async () => {
    retained.undo();
    retained.redo();
    staleEvent();
  });
  expect(blockly.undo).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
  await render('OUTPUT 2');
  await act(async () => vi.advanceTimersByTime(150));
  await act(async () => {
    retained.undo();
    retained.redo();
    staleEvent();
  });
  expect(blockly.undo.mock.calls).toEqual([[false], [true]]);
  expect(changed).toHaveBeenCalledExactlyOnceWith('OUTPUT 99');
});

it('guards history and events throughout the conversion debounce', async () => {
  await render('OUTPUT 1');
  const retained = handle.current!;
  await render('OUTPUT 2');
  await act(async () => {
    retained.undo();
    retained.redo();
    staleEvent();
    vi.advanceTimersByTime(149);
  });
  expect(blockly.undo).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
  expect(blockly.load).toHaveBeenCalledTimes(1);
  await act(async () => vi.advanceTimersByTime(1));
  expect(blockly.load).toHaveBeenCalledTimes(2);
  await act(async () => retained.undo());
  expect(blockly.undo).toHaveBeenCalledExactlyOnceWith(false);
});

it('unlocks the mount-time listener after restoring an initially invalid draft', async () => {
  await render('OUTPUT (', true);
  await act(async () => staleEvent());
  expect(changed).not.toHaveBeenCalled();
  await render('OUTPUT 1');
  await act(async () => vi.advanceTimersByTime(150));
  await act(async () => staleEvent());
  expect(changed).toHaveBeenCalledExactlyOnceWith('OUTPUT 99');
});
