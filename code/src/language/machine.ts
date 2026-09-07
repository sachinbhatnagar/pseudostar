import { parse } from './parse';
import type {
  Diagnostic,
  Expr,
  MachineEvent,
  Program,
  RunLimits,
  RunResult,
  Scalar,
  Statement,
} from './types';
const defaults: RunLimits = { statements: 100_000, depth: 64, outputs: 1000, outputBytes: 256_000 };
class RuntimeIssue extends Error {
  constructor(
    public code: string,
    message: string,
    public nextAction: string,
  ) {
    super(message);
  }
}
const issue = (
  code: string,
  message: string,
  nextAction = 'Check the values used in this instruction.',
): never => {
  throw new RuntimeIssue(code, message, nextAction);
};
const number = (value: Scalar): number =>
  typeof value === 'number'
    ? value
    : issue(
        'EXPECTED_NUMBER',
        `This calculation needs a number, but received ${JSON.stringify(value)}.`,
      );
const bool = (value: Scalar): boolean =>
  typeof value === 'boolean'
    ? value
    : issue('EXPECTED_CONDITION', 'This condition must compare values to give true or false.');
const display = (v: Scalar): string =>
  typeof v === 'boolean' ? (v ? 'TRUE' : 'FALSE') : String(v);
export function createMachine(program: Program, custom: Partial<RunLimits> = {}) {
  const limits = { ...defaults, ...custom };
  const variables: Record<string, Scalar> = Object.create(null);
  const routines = new Map<string, Statement & { kind: 'sub' }>();
  const activeCounters = new Set<string>();
  let current: Statement | undefined;
  let steps = 0;
  let outputs = 0;
  let bytes = 0;
  const snapshot = () => ({ ...variables });
  const evaluate = (expr: Expr): Scalar => {
    switch (expr.kind) {
      case 'literal':
        return expr.value;
      case 'name':
        return Object.hasOwn(variables, expr.name)
          ? variables[expr.name]
          : issue(
              'UNASSIGNED_VARIABLE',
              `${expr.name} has no value yet.`,
              'Give it a value with INPUT or an assignment before this line.',
            );
      case 'unary': {
        const v = evaluate(expr.value);
        return expr.op === 'NOT' ? !bool(v) : expr.op === '-' ? -number(v) : number(v);
      }
      case 'binary': {
        const a = evaluate(expr.left);
        if (expr.op === 'AND') return bool(a) && bool(evaluate(expr.right));
        if (expr.op === 'OR') return bool(a) || bool(evaluate(expr.right));
        const b = evaluate(expr.right);
        let result: Scalar;
        switch (expr.op) {
          case '=':
          case '==':
            return a === b;
          case '<>':
          case '!=':
            return a !== b;
          case '&':
            if (display(a).length + display(b).length > 200_000)
              issue('VALUE_LIMIT', 'This text value is too long.');
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
            if (number(b) === 0)
              issue(
                'DIVISION_BY_ZERO',
                'This calculation divides by zero.',
                'Check the divisor before dividing.',
              );
            result = expr.op === '/' ? number(a) / number(b) : number(a) % number(b);
            break;
          default: {
            if (typeof a !== typeof b || typeof a === 'boolean' || typeof b === 'boolean')
              return issue('INCOMPATIBLE_COMPARISON', 'Compare two numbers or two text values.');
            if (expr.op === '<') return a < b;
            if (expr.op === '<=') return a <= b;
            if (expr.op === '>') return a > b;
            if (expr.op === '>=') return a >= b;
            return issue('UNKNOWN_OPERATOR', `The operator ${expr.op} is not supported.`);
          }
        }
        if (typeof result === 'number' && !Number.isFinite(result))
          issue('NUMBER_LIMIT', 'This calculation makes a number that is too large.');
        if (typeof result === 'string' && result.length > 200_000)
          issue('VALUE_LIMIT', 'This text value is too long.');
        return result;
      }
    }
  };
  const assign = (name: string, value: Scalar) => {
    if (activeCounters.has(name))
      issue(
        'LOOP_COUNTER_WRITE',
        `${name} is counting an active loop.`,
        'Use a different variable inside this loop.',
      );
    variables[name] = value;
  };
  function* execute(
    items: Statement[],
    depth: number,
  ): Generator<MachineEvent, void, string | undefined> {
    if (depth > limits.depth)
      issue(
        'CALL_LIMIT',
        'Too many sub-routine calls are waiting.',
        'Check whether a sub-routine calls itself without a stopping condition.',
      );
    for (const s of items) {
      if (s.kind === 'sub') continue;
      current = s;
      if (++steps > limits.statements)
        issue(
          'STEP_LIMIT',
          'The program reached its instruction limit.',
          'Check the loop bounds or sub-routine calls.',
        );
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
          if (raw === undefined)
            issue(
              'MISSING_INPUT',
              `${s.name} needs an input value.`,
              'Enter a value and submit it.',
            );
          const input = raw!;
          if (input.length > 10000) issue('INPUT_LIMIT', 'This input is too long.');
          const numeric = /^[+-]?(?:\d+(?:\.\d*)?|\.\d+)$/.test(input.trim());
          const value = numeric ? Number(input) : input;
          if (typeof value === 'number' && !Number.isFinite(value))
            issue('NUMBER_LIMIT', 'This input number is too large.');
          assign(s.name, value);
          break;
        }
        case 'assign':
          assign(s.name, evaluate(s.value));
          break;
        case 'output': {
          const text = s.values.map((e) => display(evaluate(e))).join('');
          bytes += new TextEncoder().encode(text).length;
          if (++outputs > limits.outputs || bytes > limits.outputBytes)
            issue(
              'OUTPUT_LIMIT',
              'The program has produced too much output.',
              'Check whether a loop prints more times than you intended.',
            );
          yield { type: 'output', text, nodeId: s.id, line: s.range.line, variables: snapshot() };
          break;
        }
        case 'if': {
          const branch = s.branches.find((b) => bool(evaluate(b.condition)));
          yield* execute(branch?.body ?? s.otherwise ?? [], depth);
          break;
        }
        case 'for': {
          const start = number(evaluate(s.start)),
            end = number(evaluate(s.end));
          if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end))
            issue('LOOP_INTEGER', 'Loop bounds must be safe whole numbers.');
          if (activeCounters.has(s.name))
            issue('LOOP_COUNTER_WRITE', `${s.name} is already counting another loop.`);
          activeCounters.add(s.name);
          try {
            for (let i = start; s.style === 'range' ? i < end : i <= end; i++) {
              current = s;
              if (++steps > limits.statements)
                issue(
                  'STEP_LIMIT',
                  'The loop reached its instruction limit.',
                  'Use a smaller loop bound.',
                );
              variables[s.name] = i;
              yield { type: 'step', nodeId: s.id, line: s.range.line, variables: snapshot() };
              yield* execute(s.body, depth);
            }
          } finally {
            activeCounters.delete(s.name);
          }
          break;
        }
        case 'call': {
          const routine = routines.get(s.name);
          if (!routine)
            issue(
              'UNKNOWN_ROUTINE',
              `${s.name} has not been defined.`,
              'Add its SUB-ROUTINE definition or check its spelling.',
            );
          yield* execute(routine!.body, depth + 1);
          break;
        }
      }
    }
  }
  function* start(): Generator<MachineEvent, void, string | undefined> {
    try {
      for (const s of program.statements)
        if (s.kind === 'sub') {
          current = s;
          if (routines.has(s.name))
            issue('DUPLICATE_ROUTINE', `${s.name} is defined more than once.`);
          routines.set(s.name, s);
        }
      const nested = (items: Statement[], inside = false) => {
        for (const s of items) {
          if (inside && s.kind === 'sub') {
            current = s;
            issue('NESTED_ROUTINE', 'Put sub-routine definitions outside other instructions.');
          }
          if (s.kind === 'sub' || s.kind === 'for') nested(s.body, true);
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
          : new RuntimeIssue(
              'EXECUTION_ERROR',
              'The program could not continue.',
              'Check the highlighted instruction.',
            );
      yield {
        type: 'error',
        nodeId: current?.id,
        line: current?.range.line,
        variables: snapshot(),
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
  const machine = createMachine(parsed.program, limits);
  const output: string[] = [];
  let index = 0;
  let event = machine.advance();
  while (true) {
    if (event.type === 'output') output.push(event.text!);
    if (event.type === 'done' || event.type === 'error')
      return { output, variables: event.variables, error: event.diagnostic, steps: machine.steps };
    if (event.type === 'input') {
      if (index >= inputs.length)
        return {
          output,
          variables: event.variables,
          error: {
            code: 'MISSING_INPUT',
            message: `${event.name} needs another input.`,
            nextAction: 'Supply enough inputs for every INPUT instruction.',
          },
          steps: machine.steps,
        };
      event = machine.advance(inputs[index++]);
    } else event = machine.advance();
  }
}
