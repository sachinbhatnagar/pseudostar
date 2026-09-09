import type { Scalar, Value } from './types';
export class RuntimeIssue extends Error {
  constructor(
    public code: string,
    message: string,
    public nextAction = 'Check the values used in this instruction.',
  ) {
    super(message);
  }
}
export function issue(code: string, message: string): never {
  throw new RuntimeIssue(code, message);
}
export const number = (v: Value): number =>
  typeof v === 'number' ? v : issue('EXPECTED_NUMBER', 'This calculation needs a number.');
export const bool = (v: Value): boolean =>
  typeof v === 'boolean' ? v : issue('EXPECTED_CONDITION', 'Compare values to give true or false.');
const scalar = (v: Value): Scalar =>
  typeof v === 'object'
    ? issue('EXPECTED_SCALAR', 'Use a number, text, or true/false value as a key.')
    : v;
const list = (v: Value): Value[] =>
  Array.isArray(v) ? v : issue('EXPECTED_LIST', 'Use a list for this operation.');
const map = (v: Value): Map<Scalar, Value> =>
  v instanceof Map ? v : issue('EXPECTED_MAP', 'Use a map for this operation.');
const set = (v: Value): Set<Scalar> =>
  v instanceof Set ? v : issue('EXPECTED_SET', 'Use a set for this operation.');
export function index(v: Value, key: Value) {
  if (!Array.isArray(v) && typeof v !== 'string')
    issue('EXPECTED_LIST', 'Only lists and text use numbered indexes.');
  const n = number(key);
  if (!Number.isSafeInteger(n) || n < 1 || n > v.length)
    issue('INVALID_INDEX', `Choose an index from 1 to ${v.length}.`);
  return n - 1;
}
// Bound the whole value, including nested lists, before copying or displaying it.
export function valueCost(value: unknown, maxText = 200000): number {
  let size = 0,
    textSize = 0;
  const walk = (v: unknown, depth: number) => {
    if (++size > 10000 || depth > 32)
      issue('VALUE_LIMIT', 'This collection is too large or too deeply nested.');
    if (typeof v === 'string') {
      textSize += v.length;
      if (textSize > maxText) issue('VALUE_LIMIT', 'This text is too long.');
    } else if (typeof v === 'number') {
      if (!Number.isFinite(v)) issue('NUMBER_LIMIT', 'This number is too large.');
    } else if (typeof v === 'boolean') return;
    else if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (v instanceof Map)
      v.forEach((x, k) => {
        scalar(k);
        walk(k, depth + 1);
        walk(x, depth + 1);
      });
    else if (v instanceof Set)
      v.forEach((x) => {
        scalar(x);
        walk(x, depth + 1);
      });
    else issue('INVALID_VALUE', 'Use numbers, text, true/false values, or lists.');
  };
  walk(value, 0);
  return size + textSize;
}
export function validateValue(value: unknown): asserts value is Value {
  valueCost(value);
}
export function copy(v: Value): Value {
  validateValue(v);
  return structuredClone(v);
}
export function display(v: Value): string {
  validateValue(v);
  if (typeof v === 'boolean') return v ? 'TRUE' : 'FALSE';
  if (typeof v !== 'object') return String(v);
  return JSON.stringify(v, (_k, x) =>
    x instanceof Map ? [...x.entries()] : x instanceof Set ? [...x] : x,
  );
}
const arities: Record<string, number[]> = {
  LENGTH: [1],
  APPEND: [2],
  REMOVE: [2],
  SLICE: [3],
  MAP: [0],
  SET: [0],
  GET: [2],
  PUT: [3],
  HAS: [2],
  ADD: [2],
  KEYS: [1],
  VALUES: [1],
  NUMBER: [1],
  TEXT: [1],
  FLOOR: [1],
  ABS: [1],
  MIN: [2],
  MAX: [2],
};
export const isBuiltin = (name: string) => Object.hasOwn(arities, name);
export function builtin(name: string, args: Value[]): Value {
  if (!arities[name]?.includes(args.length))
    issue('ARGUMENT_COUNT', `Check the number of inputs for ${name}.`);
  const [a, b, c] = args;
  let result: Value = true;
  switch (name) {
    case 'MAP':
      return new Map();
    case 'SET':
      return new Set();
    case 'LENGTH':
      if (typeof a === 'string' || Array.isArray(a)) return a.length;
      if (a instanceof Map || a instanceof Set) return a.size;
      return issue('EXPECTED_COLLECTION', 'LENGTH needs text, a list, a map, or a set.');
    case 'APPEND':
      list(a).push(copy(b));
      break;
    case 'PUT':
      map(a).set(scalar(b), copy(c));
      break;
    case 'ADD':
      set(a).add(scalar(b));
      break;
    case 'GET': {
      const m = map(a),
        key = scalar(b);
      if (!m.has(key))
        issue('MISSING_KEY', 'This map does not contain that key. Check with HAS first.');
      return copy(m.get(key)!);
    }
    case 'HAS':
      if (a instanceof Map || a instanceof Set) return a.has(scalar(b));
      return issue('EXPECTED_COLLECTION', 'HAS needs a map or a set.');
    case 'REMOVE':
      if (Array.isArray(a)) a.splice(index(a, b), 1);
      else if (a instanceof Map || a instanceof Set) a.delete(scalar(b));
      else issue('EXPECTED_COLLECTION', 'REMOVE needs a list, map, or set.');
      break;
    case 'KEYS':
      return [...map(a).keys()];
    case 'VALUES':
      if (a instanceof Map || a instanceof Set) return copy([...a.values()]);
      return issue('EXPECTED_COLLECTION', 'VALUES needs a map or a set.');
    case 'SLICE': {
      const start = index(a, b),
        end = index(a, c);
      if (end < start) issue('INVALID_INDEX', 'The end index must not precede the start.');
      return typeof a === 'string' ? a.slice(start, end + 1) : copy(list(a).slice(start, end + 1));
    }
    case 'TEXT':
      return display(a);
    case 'NUMBER':
      if (typeof a !== 'string' && typeof a !== 'number')
        issue('EXPECTED_NUMBER', 'NUMBER needs numeric text or a number.');
      if (typeof a === 'string' && !/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(a.trim()))
        issue('EXPECTED_NUMBER', 'Enter numeric text.');
      result = Number(a);
      break;
    case 'FLOOR':
      result = Math.floor(number(a));
      break;
    case 'ABS':
      result = Math.abs(number(a));
      break;
    case 'MIN':
      result = Math.min(number(a), number(b));
      break;
    case 'MAX':
      result = Math.max(number(a), number(b));
      break;
  }
  if (a !== undefined) validateValue(a);
  validateValue(result);
  return result;
}
