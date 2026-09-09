export type Scalar = number | string | boolean;
export type Value = Scalar | Value[] | Map<Scalar, Value> | Set<Scalar>;
export type SourceRange = { start: number; end: number; line: number; column: number };
export type Diagnostic = {
  code: string;
  message: string;
  nextAction: string;
  range?: SourceRange;
  nodeId?: string;
};
export type Expr = (
  | { kind: 'literal'; value: Scalar }
  | { kind: 'name'; name: string }
  | { kind: 'list'; items: Expr[] }
  | { kind: 'invoke'; name: string; args: Expr[] }
  | { kind: 'index'; target: Expr; index: Expr }
  | { kind: 'unary'; op: string; value: Expr }
  | { kind: 'binary'; op: string; left: Expr; right: Expr }
) & { raw: string };
export type Base = { id: string; range: SourceRange };
export type Statement = Base &
  (
    | { kind: 'input'; name: string; json?: boolean }
    | { kind: 'output'; keyword: 'OUTPUT' | 'PRINT'; values: Expr[] }
    | { kind: 'assign'; name: string; value: Expr; set?: boolean }
    | {
        kind: 'if';
        branches: { condition: Expr; body: Statement[]; thenNewline: boolean }[];
        otherwise?: Statement[];
      }
    | {
        kind: 'for';
        name: string;
        start: Expr;
        end: Expr;
        style: 'next' | 'colon' | 'range';
        body: Statement[];
      }
    | { kind: 'sub'; name: string; body: Statement[] }
    | { kind: 'call'; name: string }
    | { kind: 'invoke'; expression: Expr }
    | { kind: 'indexedAssign'; target: Expr; value: Expr; set?: boolean }
    | { kind: 'while'; condition: Expr; body: Statement[] }
    | { kind: 'function'; name: string; parameters: string[]; body: Statement[] }
    | { kind: 'return'; value: Expr }
  );
export type Program = { version: 1; statements: Statement[] };
export type ParseResult = { ok: true; program: Program } | { ok: false; diagnostics: Diagnostic[] };
export type RunLimits = {
  statements: number;
  depth: number;
  outputs: number;
  outputBytes: number;
  work?: number;
};
export type MachineEvent = {
  type: 'step' | 'input' | 'output' | 'done' | 'error';
  nodeId?: string;
  line?: number;
  name?: string;
  text?: string;
  diagnostic?: Diagnostic;
  variables: Record<string, Value>;
};
export type RunResult = {
  output: string[];
  variables: Record<string, Value>;
  error?: Diagnostic;
  steps: number;
};
