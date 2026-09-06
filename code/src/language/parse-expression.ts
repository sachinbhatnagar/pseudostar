import type { Expr } from './types';
type Token = {
  value: string;
  type: 'number' | 'string' | 'name' | 'op' | 'end';
  start: number;
  end: number;
};
export class SyntaxIssue extends Error {
  constructor(
    message: string,
    public code = 'SYNTAX_ERROR',
  ) {
    super(message);
  }
}
export function tokenize(source: string): Token[] {
  const out: Token[] = [];
  let i = 0;
  while (i < source.length) {
    if (/\s/.test(source[i])) {
      i++;
      continue;
    }
    const start = i;
    if (source[i] === '"') {
      let value = '';
      i++;
      let closed = false;
      while (i < source.length) {
        const c = source[i++];
        if (c === '"') {
          closed = true;
          break;
        }
        if (c === '\\') {
          const n = source[i++];
          if (n === undefined) break;
          value += n === 'n' ? '\n' : n === 't' ? '\t' : n;
        } else value += c;
      }
      if (!closed) throw new SyntaxIssue('This message needs a closing double quote.');
      out.push({ value, type: 'string', start, end: i });
      continue;
    }
    const number = source.slice(i).match(/^(?:\d+(?:\.\d*)?|\.\d+)/);
    if (number) {
      i += number[0].length;
      out.push({ value: number[0], type: 'number', start, end: i });
      continue;
    }
    const name = source.slice(i).match(/^[A-Za-z_][A-Za-z0-9_]*/);
    if (name) {
      i += name[0].length;
      out.push({
        value: name[0],
        type: ['AND', 'OR', 'MOD', 'NOT'].includes(name[0]) ? 'op' : 'name',
        start,
        end: i,
      });
      continue;
    }
    const op = source.slice(i).match(/^(?:==|>=|<=|<>|!=|[+\-*/&=<>(),])/);
    if (!op)
      throw new SyntaxIssue(`The symbol ${source[i]} is not part of this pseudocode language.`);
    i += op[0].length;
    out.push({ value: op[0], type: 'op', start, end: i });
  }
  return [...out, { value: '', type: 'end', start: i, end: i }];
}
const precedence: Record<string, number> = {
  OR: 1,
  AND: 2,
  '=': 3,
  '==': 3,
  '<>': 3,
  '!=': 3,
  '<': 3,
  '>': 3,
  '<=': 3,
  '>=': 3,
  '&': 4,
  '+': 5,
  '-': 5,
  '*': 6,
  '/': 6,
  MOD: 6,
};
export function parseExpressions(source: string, list = false): Expr[] {
  const tokens = tokenize(source);
  let at = 0;
  const current = () => tokens[at];
  const parse = (min: number): Expr => {
    const start = current().start;
    const t = tokens[at++];
    let left: Expr;
    if (t.type === 'number') {
      const value = Number(t.value);
      if (!Number.isFinite(value)) throw new SyntaxIssue('This number is too large.');
      left = { kind: 'literal', value, raw: t.value };
    } else if (t.type === 'string')
      left = { kind: 'literal', value: t.value, raw: source.slice(t.start, t.end) };
    else if (t.type === 'name')
      left =
        t.value === 'TRUE' || t.value === 'FALSE'
          ? { kind: 'literal', value: t.value === 'TRUE', raw: t.value }
          : { kind: 'name', name: t.value, raw: t.value };
    else if (t.value === '+' || t.value === '-' || t.value === 'NOT')
      left = { kind: 'unary', op: t.value, value: parse(7), raw: '' };
    else if (t.value === '(') {
      left = parse(1);
      if (current().type !== 'op' || current().value !== ')')
        throw new SyntaxIssue('This expression needs a closing parenthesis.');
      at++;
    } else
      throw new SyntaxIssue('An expression is missing. Enter a value, variable, or calculation.');
    while (current().type === 'op' && (precedence[current().value] ?? 0) >= min) {
      const op = tokens[at++].value;
      if (precedence[op] === 3 && left.kind === 'binary' && precedence[left.op] === 3)
        throw new SyntaxIssue('Join separate comparisons with AND instead of chaining them.');
      const right = parse(precedence[op] + 1);
      left = { kind: 'binary', op, left, right, raw: '' };
    }
    left.raw = source.slice(start, tokens[at - 1].end);
    return left;
  };
  const result = [parse(1)];
  while (list && current().type === 'op' && current().value === ',') {
    at++;
    result.push(parse(1));
  }
  if (current().type !== 'end')
    throw new SyntaxIssue(`Unexpected ${current().value}. Check the expression before it.`);
  return result;
}
export const parseExpression = (source: string) => parseExpressions(source)[0];
