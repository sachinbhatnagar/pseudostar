import { parse } from './parse';
import type { Expr, MachineEvent, Program, RunLimits, RunResult, Value, Statement } from './types';
import {
  RuntimeIssue,
  issue,
  number,
  bool,
  display,
  index,
  copy,
  validateValue,
  builtin,
  isBuiltin,
  valueCost,
} from './collections';
const defaults: RunLimits = {
  statements: 100_000,
  depth: 64,
  outputs: 1000,
  outputBytes: 256_000,
  work: 20_000_000,
};
type Events<T = void> = Generator<MachineEvent, T, string | undefined>;
class Returned {
  constructor(public value: Value) {}
}
export function createMachine(program: Program, custom: Partial<RunLimits> = {}) {
  const limits = { ...defaults, ...custom };
  let variables: Record<string, Value> = Object.create(null);
  let activeCounters = new Set<string>();
  const routines = new Map<string, Statement & { kind: 'sub' | 'function' }>();
  let current: Statement | undefined;
  let steps = 0,
    outputs = 0,
    bytes = 0,
    work = 0;
  const charge = (cost = 1) => {
    if ((work += cost) > limits.work!)
      issue('WORK_LIMIT', 'The program is doing too much work on collections. Use smaller inputs.');
  };
  const snapshot = () => {
    charge(valueCost(Object.values(variables), 1000000));
    return structuredClone({ ...variables });
  };
  const tick = () => {
    if (++steps > limits.statements)
      issue('STEP_LIMIT', 'The program reached its instruction limit. Check its loops and calls.');
  };
  function* evaluate(expr: Expr, depth: number): Events<Value> {
    charge();
    switch (expr.kind) {
      case 'literal':
        return expr.value;
      case 'name':
        return Object.hasOwn(variables, expr.name)
          ? variables[expr.name]
          : issue('UNASSIGNED_VARIABLE', `${expr.name} has no value yet.`);
      case 'list': {
        const items: Value[] = [];
        for (const e of expr.items) items.push(copy(yield* evaluate(e, depth)));
        validateValue(items);
        return items;
      }
      case 'index': {
        const target = yield* evaluate(expr.target, depth),
          key = yield* evaluate(expr.index, depth);
        const i = index(target, key);
        return (target as Value[] | string)[i];
      }
      case 'invoke': {
        const args: Value[] = [];
        for (const a of expr.args) args.push(yield* evaluate(a, depth));
        if (isBuiltin(expr.name)) {
          charge(valueCost(args, 1000000));
          const result = builtin(expr.name, args);
          charge(valueCost(result));
          return result;
        }
        const fn = routines.get(expr.name);
        if (!fn || fn.kind !== 'function')
          issue('UNKNOWN_ROUTINE', `${expr.name} is not a defined function.`);
        const f = fn as Statement & { kind: 'function' };
        if (args.length !== f.parameters.length)
          issue('ARGUMENT_COUNT', `Supply ${f.parameters.length} inputs to ${f.name}.`);
        if (depth >= limits.depth)
          issue('CALL_LIMIT', 'Too many calls are waiting. Check the stopping condition.');
        const saved = variables,
          counters = activeCounters;
        variables = Object.create(null);
        activeCounters = new Set();
        f.parameters.forEach((p, i) => {
          variables[p] = copy(args[i]);
        });
        try {
          yield* execute(f.body, depth + 1, true);
        } catch (e) {
          if (e instanceof Returned) return copy(e.value);
          throw e;
        } finally {
          variables = saved;
          activeCounters = counters;
        }
        return issue('MISSING_RETURN', `${f.name} must RETURN a value on this path.`);
      }
      case 'unary': {
        const v = yield* evaluate(expr.value, depth);
        return expr.op === 'NOT' ? !bool(v) : expr.op === '-' ? -number(v) : number(v);
      }
      case 'binary': {
        const a = yield* evaluate(expr.left, depth);
        if (expr.op === 'AND') return bool(a) && bool(yield* evaluate(expr.right, depth));
        if (expr.op === 'OR') return bool(a) || bool(yield* evaluate(expr.right, depth));
        const b = yield* evaluate(expr.right, depth);
        let result: Value;
        switch (expr.op) {
          case '=':
          case '==':
            return a === b;
          case '<>':
          case '!=':
            return a !== b;
          case '&':
            result = display(a) + display(b);
            break;
          case '+':
            result =
              typeof a === 'string' || typeof b === 'string'
                ? display(a) + display(b)
                : number(a) + number(b);
            break;
          case '-':
            result = number(a) - number(b);
            break;
          case '*':
            result = number(a) * number(b);
            break;
          case '/':
          case 'MOD':
            if (number(b) === 0) issue('DIVISION_BY_ZERO', 'This calculation divides by zero.');
            result = expr.op === '/' ? number(a) / number(b) : number(a) % number(b);
            break;
          default:
            if (
              (typeof a !== 'number' && typeof a !== 'string') ||
              (typeof b !== 'number' && typeof b !== 'string') ||
              typeof a !== typeof b
            )
              return issue('INCOMPATIBLE_COMPARISON', 'Compare two numbers or two text values.');
            if (expr.op === '<') return a < b;
            if (expr.op === '<=') return a <= b;
            if (expr.op === '>') return a > b;
            if (expr.op === '>=') return a >= b;
            return issue('UNKNOWN_OPERATOR', `The operator ${expr.op} is not supported.`);
        }
        validateValue(result);
        return result;
      }
    }
  }
  const assign = (name: string, value: Value) => {
    if (activeCounters.has(name))
      issue('LOOP_COUNTER_WRITE', `${name} is counting an active loop.`);
    variables[name] = copy(value);
    if (Object.keys(variables).length > 1000)
      issue('VALUE_LIMIT', 'This program has too many variables.');
  };
  function* execute(items: Statement[], depth: number, inFunction = false): Events {
    if (depth > limits.depth) issue('CALL_LIMIT', 'Too many sub-routine calls are waiting.');
    for (const s of items) {
      if (s.kind === 'sub' || s.kind === 'function') continue;
      current = s;
      tick();
      yield { type: 'step', nodeId: s.id, line: s.range.line, variables: snapshot() };
      switch (s.kind) {
        case 'input': {
          const raw = yield {
            type: 'input',
            name: s.name,
            nodeId: s.id,
            line: s.range.line,
            variables: snapshot(),
          };
          if (raw === undefined) issue('MISSING_INPUT', `${s.name} needs an input value.`);
          const input = raw!;
          if (input.length > 10000) issue('INPUT_LIMIT', 'This input is too long.');
          let value: unknown = input;
          if (s.json) {
            try {
              value = JSON.parse(input);
            } catch {
              issue('INVALID_VALUE', 'Enter JSON, such as [2, 4, 6].');
            }
          } else if (/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input.trim())) value = Number(input);
          validateValue(value);
          assign(s.name, value);
          break;
        }
        case 'assign':
          assign(s.name, yield* evaluate(s.value, depth));
          break;
        case 'indexedAssign': {
          if (s.target.kind !== 'index') issue('INVALID_INDEX', 'Choose a list item.');
          const t = s.target as Expr & { kind: 'index' };
          const target = yield* evaluate(t.target, depth),
            key = yield* evaluate(t.index, depth);
          if (!Array.isArray(target)) issue('EXPECTED_LIST', 'Only list items can be changed.');
          const i = index(target, key),
            value = copy(yield* evaluate(s.value, depth));
          (target as Value[])[i] = value;
          validateValue(target);
          break;
        }
        case 'invoke':
          yield* evaluate(s.expression, depth);
          break;
        case 'return':
          if (!inFunction) issue('RETURN_OUTSIDE_FUNCTION', 'Use RETURN inside a function.');
          throw new Returned(yield* evaluate(s.value, depth));
        case 'output': {
          const parts: string[] = [];
          for (const e of s.values) parts.push(display(yield* evaluate(e, depth)));
          const text = parts.join('');
          bytes += new TextEncoder().encode(text).length;
          if (++outputs > limits.outputs || bytes > limits.outputBytes)
            issue('OUTPUT_LIMIT', 'The program has produced too much output.');
          yield { type: 'output', text, nodeId: s.id, line: s.range.line, variables: snapshot() };
          break;
        }
        case 'if': {
          let chosen = s.otherwise ?? [];
          for (const branch of s.branches)
            if (bool(yield* evaluate(branch.condition, depth))) {
              chosen = branch.body;
              break;
            }
          yield* execute(chosen, depth, inFunction);
          break;
        }
        case 'while':
          while (bool(yield* evaluate(s.condition, depth))) {
            current = s;
            tick();
            yield { type: 'step', nodeId: s.id, line: s.range.line, variables: snapshot() };
            yield* execute(s.body, depth, inFunction);
          }
          break;
        case 'for': {
          const start = number(yield* evaluate(s.start, depth)),
            end = number(yield* evaluate(s.end, depth));
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end))
            issue('LOOP_INTEGER', 'Loop bounds must be safe whole numbers.');
          if (activeCounters.has(s.name))
            issue('LOOP_COUNTER_WRITE', `${s.name} is already counting another loop.`);
          activeCounters.add(s.name);
          try {
            for (let i = start; s.style === 'range' ? i < end : i <= end; i++) {
              current = s;
              tick();
              variables[s.name] = i;
              yield { type: 'step', nodeId: s.id, line: s.range.line, variables: snapshot() };
              yield* execute(s.body, depth, inFunction);
            }
          } finally {
            activeCounters.delete(s.name);
          }
          break;
        }
        case 'call': {
          if (isBuiltin(s.name)) {
            yield* evaluate({ kind: 'invoke', name: s.name, args: [], raw: `${s.name}()` }, depth);
            break;
          }
          const routine = routines.get(s.name);
          if (!routine) issue('UNKNOWN_ROUTINE', `${s.name} has not been defined.`);
          if (routine!.kind === 'function')
            yield* evaluate({ kind: 'invoke', name: s.name, args: [], raw: `${s.name}()` }, depth);
          else yield* execute(routine!.body, depth + 1, inFunction);
          break;
        }
      }
    }
  }
  function* start(): Events {
    try {
      for (const s of program.statements)
        if (s.kind === 'sub' || s.kind === 'function') {
          current = s;
          if (routines.has(s.name) || isBuiltin(s.name))
            issue('DUPLICATE_ROUTINE', `${s.name} is already defined.`);
          routines.set(s.name, s);
        }
      const nested = (items: Statement[], inside = false) => {
        for (const s of items) {
          if (inside && (s.kind === 'sub' || s.kind === 'function')) {
            current = s;
            issue('NESTED_ROUTINE', 'Put definitions outside other instructions.');
          }
          if ('body' in s) nested(s.body, true);
          if (s.kind === 'if') {
            s.branches.forEach((b) => nested(b.body, true));
            nested(s.otherwise ?? [], true);
          }
        }
      };
      nested(program.statements);
      yield* execute(program.statements, 0);
      yield { type: 'done', variables: snapshot() };
    } catch (error) {
      const e =
        error instanceof RuntimeIssue
          ? error
          : new RuntimeIssue('EXECUTION_ERROR', 'The program could not continue.');
      yield {
        type: 'error',
        nodeId: current?.id,
        line: current?.range.line,
        variables: structuredClone({ ...variables }),
        diagnostic: {
          code: e.code,
          message: e.message,
          nextAction: e.nextAction,
          range: current?.range,
          nodeId: current?.id,
        },
      };
    }
  }
  const generator = start();
  return {
    advance: (input?: string): MachineEvent =>
      generator.next(input).value ?? { type: 'done', variables: snapshot() },
    get steps() {
      return steps;
    },
  };
}
export function run(source: string, inputs: string[], limits?: Partial<RunLimits>): RunResult {
  const parsed = parse(source);
  if (!parsed.ok) return { output: [], variables: {}, error: parsed.diagnostics[0], steps: 0 };
  const machine = createMachine(parsed.program, limits),
    output: string[] = [];
  let at = 0,
    event = machine.advance();
  while (true) {
    if (event.type === 'output') output.push(event.text!);
    if (event.type === 'done' || event.type === 'error')
      return { output, variables: event.variables, error: event.diagnostic, steps: machine.steps };
    if (event.type === 'input' && at >= inputs.length)
      return {
        output,
        variables: event.variables,
        steps: machine.steps,
        error: {
          code: 'MISSING_INPUT',
          message: `${event.name} needs another input.`,
          nextAction: 'Supply enough inputs for every INPUT instruction.',
        },
      };
    event = machine.advance(event.type === 'input' ? inputs[at++] : undefined);
  }
}
