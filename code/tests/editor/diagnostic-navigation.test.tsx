// @vitest-environment jsdom
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { act } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorView } from '@codemirror/view';
import { TextEditor } from '../../src/editor/TextEditor';
import { diagnosticLine, executionLine } from '../../src/editor/text-language';

let host: HTMLDivElement, root: ReturnType<typeof createRoot>;
const changed = vi.fn();
const source = 'OUTPUT 1\nOUTPUT missing\nOUTPUT 3';
beforeEach(() => {
  vi.useFakeTimers();
  vi.stubGlobal('IS_REACT_ACT_ENVIRONMENT', true);
  changed.mockClear();
  host = document.createElement('div');
  document.body.append(host);
  root = createRoot(host);
});
afterEach(async () => {
  await act(async () => root.unmount());
  host.remove();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  vi.useRealTimers();
});
const render = async (line?: number, activeLine?: number, text = source) => {
  await act(async () =>
    root.render(
      <TextEditor source={text} onChange={changed} diagnosticLine={line} activeLine={activeLine} />,
    ),
  );
  return EditorView.findFromDOM(host.querySelector('.cm-editor') as HTMLElement)!;
};

it('reveals changed diagnostic lines without changing source, selection, or focus', async () => {
  const scroll = vi.spyOn(EditorView, 'scrollIntoView');
  const editor = await render(2, 1);
  expect(scroll).toHaveBeenCalledExactlyOnceWith(source.indexOf('OUTPUT missing'), { y: 'center' });
  expect(editor.state.field(diagnosticLine).decorations.iter().value.spec.class).toBe(
    'cm-diagnosticLine',
  );
  expect(editor.state.field(executionLine).decorations.iter().from).toBe(0);
  await render(2, 3);
  await render(2, 3, source.replace('missing', 'unknown'));
  expect(scroll).toHaveBeenCalledTimes(1);
  await render(3, 1);
  expect(scroll).toHaveBeenCalledTimes(2);
  expect(editor.state.doc.toString()).toBe(source);
  expect(editor.state.selection.main.head).toBe(0);
  expect(editor.hasFocus).toBe(false);
  expect(changed).not.toHaveBeenCalled();
  await render(undefined, 1);
  expect(editor.state.field(diagnosticLine).decorations.size).toBe(0);
  expect(editor.state.field(executionLine).decorations.size).toBe(1);
  expect(scroll).toHaveBeenCalledTimes(2);
});

it.each([0, -1, 1.5, 10, NaN])('does not navigate to invalid diagnostic line %s', async (line) => {
  const scroll = vi.spyOn(EditorView, 'scrollIntoView');
  const editor = await render(line);
  expect(editor.state.field(diagnosticLine).decorations.size).toBe(0);
  expect(scroll).not.toHaveBeenCalled();
  expect(changed).not.toHaveBeenCalled();
});
