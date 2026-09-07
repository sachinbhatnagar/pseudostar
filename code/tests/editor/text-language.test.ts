import { describe, expect, it } from 'vitest';
import { EditorState } from '@codemirror/state';
import { highlightTree } from '@lezer/highlight';
import {
  executionLine,
  pseudocodeHighlightStyle,
  pseudocodeLanguage,
  setExecutionLine,
  textLanguageExtensions,
} from '../../src/editor/text-language';

describe('text language', () => {
  it('highlights real tokens and keeps quoted syntax together', () => {
    const source =
      'SUB-ROUTINE show()\nIF count >= 2 AND TRUE THEN\nPRINT "IF + 99", .5\nENDIF\nEND SUB';
    const tokens: { text: string; classes: string }[] = [];
    highlightTree(
      pseudocodeLanguage.parser.parse(source),
      pseudocodeHighlightStyle,
      (from, to, classes) => tokens.push({ text: source.slice(from, to), classes }),
    );
    for (const text of [
      'SUB-ROUTINE',
      'IF',
      'count',
      '>=',
      '2',
      'AND',
      'TRUE',
      'PRINT',
      '"IF + 99"',
      '.5',
      'ENDIF',
    ]) {
      expect(tokens.find((token) => token.text === text)?.classes).toBeTruthy();
    }
    expect(tokens.find((token) => token.text === 'IF')?.classes).not.toBe(
      tokens.find((token) => token.text === '"IF + 99"')?.classes,
    );
  });

  it('sets, moves, and clears a one-based execution line without changing selection', () => {
    let state = EditorState.create({
      doc: 'OUTPUT 1\nOUTPUT 2\nOUTPUT 3',
      extensions: textLanguageExtensions,
    });
    for (const line of [2, 3]) {
      state = state.update({ effects: setExecutionLine.of(line) }).state;
      expect(state.field(executionLine).decorations.iter().from).toBe(state.doc.line(line).from);
      expect(state.selection.main.head).toBe(0);
    }
    state = state.update({ effects: setExecutionLine.of(undefined) }).state;
    expect(state.field(executionLine).decorations.size).toBe(0);
  });

  it.each([0, -1, 1.5, NaN, Infinity, 3])('ignores invalid execution line %s', (line) => {
    const state = EditorState.create({
      doc: 'OUTPUT 1\nOUTPUT 2',
      extensions: textLanguageExtensions,
    }).update({ effects: setExecutionLine.of(line) }).state;
    expect(state.field(executionLine).decorations.size).toBe(0);
  });

  it('recomputes the execution range after source replacement', () => {
    let state = EditorState.create({
      doc: 'OUTPUT 1\nOUTPUT 2',
      extensions: textLanguageExtensions,
    });
    state = state.update({ effects: setExecutionLine.of(2) }).state;
    state = state.update({
      changes: { from: 0, to: state.doc.length, insert: 'INPUT longerName\nOUTPUT longerName' },
    }).state;
    expect(state.field(executionLine).decorations.iter().from).toBe(state.doc.line(2).from);
    state = state.update({ changes: { from: 0, to: state.doc.length, insert: 'OUTPUT 1' } }).state;
    expect(state.field(executionLine).decorations.size).toBe(0);
  });
});
