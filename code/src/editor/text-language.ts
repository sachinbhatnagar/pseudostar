import { StateEffect, StateField } from '@codemirror/state';
import type { EditorState } from '@codemirror/state';
import { Decoration, EditorView } from '@codemirror/view';
import { HighlightStyle, StreamLanguage, syntaxHighlighting } from '@codemirror/language';
import { tags } from '@lezer/highlight';
import { isBuiltin } from '../language/collections';

export const pseudocodeLanguage = StreamLanguage.define({
  name: 'pseudocode',
  token(stream) {
    if (stream.eatSpace()) return null;
    if (stream.match(/^"(?:[^"\\]|\\.)*(?:"|$)/)) return 'string';
    if (stream.match(/^(?:\d+(?:\.\d*)?|\.\d+)/)) return 'number';
    if (stream.match(/^SUB-ROUTINE\b/)) return 'keyword';
    const word = stream.match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (word) {
      const name = (word as RegExpMatchArray)[0];
      if (stream.match(/^\s*\(/, false)) return 'variableName.function';
      if (
        /^(SET|WHILE|ENDWHILE|FUNCTION|RETURN|CALL|JSON|INPUT|OUTPUT|PRINT|IF|THEN|ELSEIF|ELSE|ENDIF|FOR|TO|NEXT|IN|RANGE|END|SUB)$/.test(
          name,
        )
      )
        return 'keyword';
      if (/^(AND|OR|NOT|MOD)$/.test(name)) return 'operator';
      if (/^(TRUE|FALSE)$/.test(name)) return 'bool';
      if (isBuiltin(name)) return 'variableName.function';
      return 'variableName';
    }
    if (stream.match(/^(?:==|>=|<=|<>|!=|[+\-*/&=<>])/)) return 'operator';
    if (stream.match(/^[\[\](),:]/)) return 'punctuation';
    stream.next();
    return null;
  },
});

export const pseudocodeHighlightStyle = HighlightStyle.define([
  { tag: tags.keyword, color: '#365c40', fontWeight: '600' },
  { tag: tags.string, color: '#843f35' },
  { tag: [tags.number, tags.bool], color: '#79521d' },
  { tag: tags.operator, color: '#375b70' },
  { tag: tags.variableName, color: '#27352a' },
  { tag: tags.function(tags.variableName), color: '#375b70', fontWeight: '600' },
  { tag: tags.punctuation, color: '#52614f' },
]);

export const setExecutionLine = StateEffect.define<number | undefined>();
const lineDecoration = (
  state: EditorState,
  line: number | undefined,
  className = 'cm-executionLine',
) =>
  line !== undefined && Number.isSafeInteger(line) && line > 0 && line <= state.doc.lines
    ? Decoration.set([Decoration.line({ class: className }).range(state.doc.line(line).from)])
    : Decoration.none;

export const executionLine = StateField.define({
  create(state) {
    return { line: undefined as number | undefined, decorations: lineDecoration(state, undefined) };
  },
  update(value, transaction) {
    let line = value.line;
    for (const effect of transaction.effects) if (effect.is(setExecutionLine)) line = effect.value;
    return { line, decorations: lineDecoration(transaction.state, line) };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

export const setDiagnosticLine = StateEffect.define<number | undefined>();
export const diagnosticLine = StateField.define({
  create(state) {
    return {
      line: undefined as number | undefined,
      decorations: lineDecoration(state, undefined, 'cm-diagnosticLine'),
    };
  },
  update(value, transaction) {
    let line = value.line;
    for (const effect of transaction.effects) if (effect.is(setDiagnosticLine)) line = effect.value;
    return { line, decorations: lineDecoration(transaction.state, line, 'cm-diagnosticLine') };
  },
  provide: (field) => EditorView.decorations.from(field, (value) => value.decorations),
});

export const textLanguageExtensions = [
  pseudocodeLanguage,
  syntaxHighlighting(pseudocodeHighlightStyle),
  executionLine,
  diagnosticLine,
];
