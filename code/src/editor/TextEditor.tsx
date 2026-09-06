import { useEffect, useRef } from 'react';
import { EditorState, type StateEffect } from '@codemirror/state';
import {
  EditorView,
  keymap,
  lineNumbers,
  highlightActiveLine,
  drawSelection,
} from '@codemirror/view';
import { defaultKeymap, history, historyKeymap } from '@codemirror/commands';
import { setDiagnosticLine, setExecutionLine, textLanguageExtensions } from './text-language';
export type TextEditorProps = {
  source: string;
  onChange: (value: string) => void;
  activeLine?: number;
  diagnosticLine?: number;
};
export function TextEditor({ source, onChange, activeLine, diagnosticLine }: TextEditorProps) {
  const host = useRef<HTMLDivElement>(null),
    view = useRef<EditorView | null>(null),
    callback = useRef(onChange),
    sync = useRef(false);
  callback.current = onChange;
  useEffect(() => {
    if (!host.current) return;
    const editor = new EditorView({
      parent: host.current,
      state: EditorState.create({
        doc: source,
        extensions: [
          textLanguageExtensions,
          lineNumbers(),
          history(),
          drawSelection(),
          highlightActiveLine(),
          keymap.of([...defaultKeymap, ...historyKeymap]),
          EditorView.contentAttributes.of({
            'aria-label': 'Pseudocode editor',
            spellcheck: 'false',
          }),
          EditorState.tabSize.of(4),
          EditorView.updateListener.of((update) => {
            if (update.docChanged && !sync.current) callback.current(update.state.doc.toString());
          }),
          EditorView.theme({
            '&': { height: '100%', fontSize: '13px', backgroundColor: '#f7f9f5' },
            '.cm-content': {
              fontFamily: '"SFMono-Regular",Consolas,monospace',
              padding: '16px 8px',
              caretColor: '#294d35',
            },
            '.cm-scroller': { overflow: 'auto' },
            '.cm-gutters': { backgroundColor: '#edf2e9', border: 'none', color: '#566950' },
            '.cm-activeLine': { backgroundColor: '#e4ede1' },
            '.cm-line.cm-executionLine': { backgroundColor: '#d6e5c8', fontWeight: '600' },
            '.cm-line.cm-diagnosticLine': {
              backgroundColor: '#f0dfdc',
              outline: '2px dashed #813c35',
              outlineOffset: '-2px',
            },
            '&.cm-focused': { outline: 'none' },
            '.cm-line': { padding: '0 10px', lineHeight: '1.9' },
          }),
        ],
      }),
    });
    view.current = editor;
    return () => {
      editor.destroy();
      view.current = null;
    };
  }, []);
  useEffect(() => {
    const editor = view.current;
    if (editor && source !== editor.state.doc.toString()) {
      sync.current = true;
      editor.dispatch({ changes: { from: 0, to: editor.state.doc.length, insert: source } });
      sync.current = false;
    }
  }, [source]);
  useEffect(() => {
    view.current?.dispatch({ effects: setExecutionLine.of(activeLine) });
  }, [activeLine]);
  useEffect(() => {
    const editor = view.current;
    if (!editor) return;
    const effects: StateEffect<unknown>[] = [setDiagnosticLine.of(diagnosticLine)];
    if (
      diagnosticLine !== undefined &&
      Number.isSafeInteger(diagnosticLine) &&
      diagnosticLine > 0 &&
      diagnosticLine <= editor.state.doc.lines
    )
      effects.push(
        EditorView.scrollIntoView(editor.state.doc.line(diagnosticLine).from, { y: 'center' }),
      );
    editor.dispatch({ effects });
  }, [diagnosticLine]);
  return <div className="text-editor" ref={host} />;
}
