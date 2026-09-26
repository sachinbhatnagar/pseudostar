import { parseExpression, parseExpressions, SyntaxIssue } from './parse-expression';
import type { Base, ParseResult, Statement } from './types';
const identifier = '[A-Za-z_][A-Za-z0-9_]*';
export function parse(source: string): ParseResult {
  if (source.length > 200_000)
    return {
      ok: false,
      diagnostics: [
        {
          code: 'SOURCE_LIMIT',
          message: 'This program is too large.',
          nextAction: 'Keep the program below 200 KB.',
        },
      ],
    };
  let offset = 0;
  const lines = source
    .split('\n')
    .map((raw, index) => {
      const line = {
        text: raw.trim(),
        indent: raw.match(/^ */)![0].length,
        line: index + 1,
        offset,
        raw,
      };
      offset += raw.length + 1;
      return line;
    })
    .filter((x) => x.text.length > 0);
  let errorAt = 0;
  let at = 0;
  let total = 0;
  let depth = 0;
  const fail = (message: string): never => {
    throw new SyntaxIssue(message);
  };
  const base = (): Base => {
    const line = lines[at];
    return {
      id: `line-${line.line}`,
      range: {
        start: line.offset,
        end: line.offset + line.raw.length,
        line: line.line,
        column: line.indent + 1,
      },
    };
  };
  const isEnd = (text: string) =>
    /^(ELSEIF\b|ELSE$|ENDIF$|NEXT\b|END SUB$|ENDWHILE$|END FUNCTION$)/.test(text);
  const sequence = (indentEnd?: number): Statement[] => {
    if (++depth > 64)
      fail('This program is nested too deeply. Use a sub-routine to make it smaller.');
    const result: Statement[] = [];
    while (
      at < lines.length &&
      !isEnd(lines[at].text) &&
      (indentEnd === undefined || lines[at].indent > indentEnd)
    )
      result.push(statement());
    depth--;
    return result;
  };
  const thenCondition = (text: string, prefix: string) => {
    errorAt = at;
    const same = text.match(new RegExp(`^${prefix} (.+) THEN$`));
    if (same) {
      at++;
      return { condition: parseExpression(same[1]), thenNewline: false };
    }
    const split = text.match(new RegExp(`^${prefix} (.+)$`));
    if (split && lines[at + 1]?.text === 'THEN') {
      at += 2;
      return { condition: parseExpression(split[1]), thenNewline: true };
    }
    return fail(`${prefix} needs a condition followed by THEN.`);
  };
  const statement = (): Statement => {
    if (++total > 5000) fail('This program has too many instructions. Keep it below 5,000.');
    errorAt = at;
    const b = base();
    const line = lines[at];
    const text = line.text;
    let m: RegExpMatchArray | null;
    if (/\t/.test(line.raw.slice(0, line.raw.length - line.raw.trimStart().length)))
      fail('Use spaces for indentation, not tabs.');
    if ((m = text.match(new RegExp(`^INPUT (JSON )?(${identifier})$`)))) {
      at++;
      return { ...b, kind: 'input', name: m[2], ...(m[1] ? { json: true } : {}) };
    }
    if ((m = text.match(/^(OUTPUT|PRINT) (.+)$/))) {
      at++;
      return {
        ...b,
        kind: 'output',
        keyword: m[1] as 'OUTPUT' | 'PRINT',
        values: parseExpressions(m[2], true),
      };
    }
    if ((m = text.match(/^WHILE (.+)$/))) {
      const condition = parseExpression(m[1]);
      at++;
      const body = sequence();
      if (lines[at]?.text !== 'ENDWHILE') fail('This WHILE needs ENDWHILE.');
      at++;
      return { ...b, kind: 'while', condition, body };
    }
    if ((m = text.match(/^FUNCTION ([A-Za-z_][A-Za-z0-9_]*)\((.*)\)$/))) {
      const parameters = m[2].trim() ? m[2].split(',').map((x) => x.trim()) : [];
      if (
        parameters.some((x) => !/^[A-Za-z_][A-Za-z0-9_]*$/.test(x)) ||
        new Set(parameters).size !== parameters.length
      )
        fail('Use different variable names for the function inputs.');
      const name = m[1];
      at++;
      const body = sequence();
      if (lines[at]?.text !== 'END FUNCTION') fail('This function needs END FUNCTION.');
      at++;
      return { ...b, kind: 'function', name, parameters, body };
    }
    if ((m = text.match(/^RETURN (.+)$/))) {
      at++;
      return { ...b, kind: 'return', value: parseExpression(m[1]) };
    }
    if ((m = text.match(/^CALL (.+)$/))) {
      const expression = parseExpression(m[1]);
      if (expression.kind !== 'invoke') fail('CALL needs a function name and parentheses.');
      at++;
      return { ...b, kind: 'invoke', expression };
    }
    if (
      (m = text.match(/^(COMPUTE\s+)([A-Za-z_][A-Za-z0-9_]*(?:\[.+?\])?)\s*(=|\sAS\s)\s*(.+)$/i)) ||
      (m = text.match(/^(SET\s+)?([A-Za-z_][A-Za-z0-9_]*(?:\[.+?\])?)\s*(=|TO)\s*(.+)$/))
    ) {
      if (m[3] === 'TO' && !m[1]) fail('Use SET before an assignment with TO.');
      const target = parseExpression(m[2]);
      const value = parseExpression(m[4]);
      at++;
      const syntax =
        m[1]?.trim().toUpperCase() === 'COMPUTE' ? { compute: true } : m[1] ? { set: true } : {};
      if (target.kind === 'name')
        return { ...b, ...syntax, kind: 'assign', name: target.name, value };
      if (target.kind !== 'index') fail('Choose a variable or an indexed list item.');
      return { ...b, ...syntax, kind: 'indexedAssign', target, value };
    }
    if (text.startsWith('IF ')) {
      const first = thenCondition(text, 'IF');
      const branches = [{ ...first, body: sequence() }];
      while (lines[at]?.text.startsWith('ELSEIF ')) {
        const branch = thenCondition(lines[at].text, 'ELSEIF');
        branches.push({ ...branch, body: sequence() });
      }
      let otherwise: Statement[] | undefined;
      if (lines[at]?.text === 'ELSE') {
        at++;
        otherwise = sequence();
      }
      if (lines[at]?.text !== 'ENDIF') fail('This IF needs ENDIF.');
      at++;
      return { ...b, kind: 'if', branches, otherwise };
    }
    if ((m = text.match(new RegExp(`^FOR (${identifier}) IN RANGE\\((.+),\\s*(.+)\\):$`)))) {
      const name = m[1],
        start = parseExpression(m[2]),
        end = parseExpression(m[3]);
      at++;
      const body = sequence(line.indent);
      return { ...b, kind: 'for', name, start, end, style: 'range', body };
    }
    if ((m = text.match(new RegExp(`^FOR (${identifier}) = (.+) TO (.+?)(:)?$`)))) {
      const name = m[1],
        start = parseExpression(m[2]),
        end = parseExpression(m[3]);
      const style = m[4] ? 'colon' : 'next';
      at++;
      const body = sequence(style === 'colon' ? line.indent : undefined);
      let step;
      if (style === 'next') {
        const next = lines[at]?.text.match(new RegExp(`^NEXT ${name}(?: \\+ (.+))?$`));
        if (!next) fail(`This loop needs NEXT ${name}, or NEXT ${name} + an increase.`);
        if (next?.[1]) step = parseExpression(next[1]);
        at++;
      }
      return { ...b, kind: 'for', name, start, end, style, body, ...(step ? { step } : {}) };
    }
    if ((m = text.match(new RegExp(`^SUB-ROUTINE (${identifier})\\(\\)$`)))) {
      const name = m[1];
      at++;
      const body = sequence();
      if (lines[at]?.text !== 'END SUB') fail('This sub-routine needs END SUB.');
      at++;
      return { ...b, kind: 'sub', name, body };
    }
    if ((m = text.match(new RegExp(`^(${identifier})\\(\\)$`)))) {
      at++;
      return { ...b, kind: 'call', name: m[1] };
    }
    if (/^[A-Za-z_][A-Za-z0-9_]*\s*\(/.test(text)) {
      const expression = parseExpression(text);
      if (expression.kind !== 'invoke') fail('Use SET or OUTPUT to use this calculation.');
      at++;
      return { ...b, kind: 'invoke', expression };
    }
    if (/^COMPUTE\b/i.test(text))
      fail('Use COMPUTE name AS expression, such as COMPUTE area AS height * width.');
    return fail(
      `Cannot read “${text.slice(0, 60)}”. Use a textbook instruction such as INPUT or OUTPUT.`,
    );
  };
  try {
    const statements = sequence();
    if (at < lines.length)
      fail(`Unexpected ${lines[at].text}. Check the matching opening instruction.`);
    return { ok: true, program: { version: 1, statements } };
  } catch (error) {
    const line = lines[Math.min(errorAt, lines.length - 1)];
    return {
      ok: false,
      diagnostics: [
        {
          code: error instanceof SyntaxIssue ? error.code : 'SYNTAX_ERROR',
          message: error instanceof Error ? error.message : 'Cannot read this program.',
          nextAction: 'Check this line and its surrounding instructions.',
          range: line
            ? {
                start: line.offset,
                end: line.offset + line.raw.length,
                line: line.line,
                column: line.indent + 1,
              }
            : undefined,
          nodeId: line ? `line-${line.line}` : undefined,
        },
      ],
    };
  }
}
