import * as Blockly from 'blockly/core';
import * as En from 'blockly/msg/en';
import type { Program, Statement } from '../language/types';
import { parse } from '../language/parse';
Blockly.setLocale(
  Object.fromEntries(
    Object.entries(En).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
  ),
);
const field = (name: string, text: string) => ({ type: 'field_input', name, text });
const dropdown = (name: string, options: [string, string][]) => ({
  type: 'field_dropdown',
  name,
  options,
});
Blockly.Extensions.register('ps_assignment_syntax', function () {
  const prefix = this.getField('PREFIX')!;
  const row = this.inputList.find((input) => input.fieldRow.includes(prefix))!;
  const syntax = this.appendDummyInput('SYNTAX');
  syntax.setVisible(false);
  prefix.setValidator((value) => {
    const from = value ? syntax : row;
    const to = value ? row : syntax;
    const index = from.fieldRow.indexOf(prefix);
    if (index !== -1) {
      from.fieldRow.splice(index, 1);
      to.fieldRow.unshift(prefix);
    }
    prefix.setVisible(value !== '');
    this.setFieldValue(value === 'COMPUTE' ? 'AS' : '=', 'SEPARATOR');
    return value;
  });
  (this as Blockly.BlockSvg).customContextMenu = (options) => {
    for (const [value, text] of [
      ['SET', 'Use SET'],
      ['COMPUTE', 'Use COMPUTE'],
      ['', 'Use plain assignment'],
    ])
      options.push({
        text,
        enabled: prefix.getValue() !== value,
        callback: () => prefix.setValue(value),
      });
  };
});
Blockly.common.defineBlocksWithJsonArray([
  {
    type: 'ps_output',
    message0: '%1 %2',
    args0: [
      dropdown('KEYWORD', [
        ['OUTPUT', 'OUTPUT'],
        ['PRINT', 'PRINT'],
      ]),
      field('EXPR', '"Hello"'),
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'output',
  },
  {
    type: 'ps_input',
    message0: 'INPUT %1 %2',
    args0: [
      dropdown('FORMAT', [
        ['value', ''],
        ['JSON list or value', 'JSON'],
      ]),
      field('NAME', 'number'),
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'input',
  },
  {
    type: 'ps_set',
    message0: '%1 %2 %3 %4',
    args0: [
      dropdown('PREFIX', [
        ['SET', 'SET'],
        ['COMPUTE', 'COMPUTE'],
        ['Plain assignment', ''],
      ]),
      field('NAME', 'total'),
      { type: 'field_label', name: 'SEPARATOR', text: '=' },
      field('EXPR', '0'),
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'variable',
    extensions: ['ps_assignment_syntax'],
  },
  {
    type: 'ps_function_value',
    message0: '%1 %2 %3 %4 ( %5 )',
    args0: [
      dropdown('PREFIX', [
        ['SET', 'SET'],
        ['COMPUTE', 'COMPUTE'],
        ['Plain assignment', ''],
      ]),
      field('NAME', 'count'),
      { type: 'field_label', name: 'SEPARATOR', text: '=' },
      field('FUNCTION', 'LENGTH'),
      field('ARGS', 'items'),
    ],
    previousStatement: null,
    nextStatement: null,
    style: 'variable',
    extensions: ['ps_assignment_syntax'],
    tooltip:
      'Run a function and store its result. Choose COMPUTE to show COMPUTE count AS LENGTH(items).',
  },
  {
    type: 'ps_while',
    message0: 'WHILE %1',
    args0: [field('EXPR', 'count < 5')],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    message2: 'ENDWHILE',
    previousStatement: null,
    nextStatement: null,
    style: 'loop',
  },
  {
    type: 'ps_function',
    message0: 'FUNCTION %1 ( %2 )',
    args0: [field('NAME', 'double'), field('PARAMS', 'number')],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    message2: 'END FUNCTION',
    previousStatement: null,
    nextStatement: null,
    style: 'routine',
  },
  {
    type: 'ps_return',
    message0: 'RETURN %1',
    args0: [field('EXPR', 'number * 2')],
    previousStatement: null,
    nextStatement: null,
    style: 'routine',
  },
  {
    type: 'ps_invoke',
    message0: 'CALL %1',
    args0: [field('EXPR', 'APPEND(items, 1)')],
    previousStatement: null,
    nextStatement: null,
    style: 'routine',
  },
  {
    type: 'ps_sub',
    message0: 'SUB-ROUTINE %1 ( )',
    args0: [field('NAME', 'showTotal')],
    message1: '%1',
    args1: [{ type: 'input_statement', name: 'BODY' }],
    message2: 'END SUB',
    previousStatement: null,
    nextStatement: null,
    style: 'routine',
  },
  {
    type: 'ps_call',
    message0: '%1 ( )',
    args0: [field('NAME', 'showTotal')],
    previousStatement: null,
    nextStatement: null,
    style: 'routine',
  },
]);
type Loop = Blockly.BlockSvg & { updateSyntax: (style: string) => void };
Blockly.Blocks['ps_for'] = {
  init(this: Loop) {
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setStyle('loop');
    const name = new Blockly.FieldTextInput('counter', (value) => {
      const counter = this.getFieldValue('COUNTER'),
        current = this.getFieldValue('NAME'),
        increase = counter?.startsWith(current) ? counter.slice(current.length) : '';
      this.getField('COUNTER')?.setValue(value + increase);
      return value;
    });
    const style = new Blockly.FieldDropdown(
      [
        ['TO / NEXT', 'next'],
        ['TO / colon', 'colon'],
        ['RANGE / colon', 'range'],
      ],
      (value) => {
        this.updateSyntax(value);
        return value;
      },
    );
    this.appendDummyInput('HEADER')
      .appendField('FOR')
      .appendField(name, 'NAME')
      .appendField(new Blockly.FieldLabel('='), 'OPEN')
      .appendField(new Blockly.FieldTextInput('1'), 'START')
      .appendField(new Blockly.FieldLabel('TO'), 'SEPARATOR')
      .appendField(new Blockly.FieldTextInput('5'), 'END')
      .appendField(new Blockly.FieldLabel(''), 'CLOSE')
      .appendField(style, 'STYLE');
    style.setVisible(false);
    this.appendStatementInput('BODY');
    this.updateSyntax('next');
    this.setTooltip(
      'Right-click to change the loop form. Edit NEXT to use an increase such as counter + 2.',
    );
  },
  updateSyntax(this: Loop, style: string) {
    this.setFieldValue(style === 'range' ? 'IN RANGE(' : '=', 'OPEN');
    this.setFieldValue(style === 'range' ? ',' : 'TO', 'SEPARATOR');
    this.setFieldValue(style === 'range' ? '):' : style === 'colon' ? ':' : '', 'CLOSE');
    if (style === 'next') {
      if (!this.getInput('FOOTER'))
        this.appendDummyInput('FOOTER')
          .appendField('NEXT')
          .appendField(new Blockly.FieldTextInput(this.getFieldValue('NAME')), 'COUNTER');
    } else if (this.getInput('FOOTER')) this.removeInput('FOOTER');
  },
  customContextMenu(this: Loop, options: Blockly.ContextMenuRegistry.ContextMenuOption[]) {
    for (const [value, text] of [
      ['next', 'Use TO with NEXT'],
      ['colon', 'Use TO with colon'],
      ['range', 'Use RANGE with colon'],
    ]) {
      options.push({
        id: `ps_loop_${value}`,
        scope: { block: this },
        weight: 100,
        text,
        enabled: this.getFieldValue('STYLE') !== value,
        callback: () => this.setFieldValue(value, 'STYLE'),
      });
    }
  },
};
type Conditional = Blockly.BlockSvg & {
  branchCount: number;
  hasElse: boolean;
  rebuild: () => void;
};
Blockly.Blocks['ps_if'] = {
  init(this: Conditional) {
    this.branchCount = 1;
    this.hasElse = true;
    this.setPreviousStatement(true);
    this.setNextStatement(true);
    this.setStyle('selection');
    this.rebuild();
  },
  rebuild(this: Conditional) {
    const saved: Record<string, string> = {};
    const children: Record<string, Blockly.Connection | null> = {};
    for (const input of this.inputList) {
      for (const f of input.fieldRow) if (f.name) saved[f.name] = String(f.getValue());
      if (input.connection) children[input.name] = input.connection.targetConnection;
    }
    while (this.inputList.length) this.removeInput(this.inputList[0].name);
    for (let i = 0; i < this.branchCount; i++) {
      this.appendDummyInput(`HEAD${i}`)
        .appendField(i ? 'ELSEIF' : 'IF')
        .appendField(new Blockly.FieldTextInput(saved[`EXPR${i}`] ?? 'number >= 1'), `EXPR${i}`)
        .appendField('THEN');
      this.appendStatementInput(`BODY${i}`);
    }
    if (this.hasElse) {
      this.appendDummyInput('ELSE_LABEL').appendField('ELSE');
      this.appendStatementInput('ELSE');
    }
    this.appendDummyInput('END').appendField('ENDIF');
    for (const [name, connection] of Object.entries(children))
      if (connection && this.getInput(name)?.connection)
        this.getInput(name)!.connection!.connect(connection);
  },
  saveExtraState(this: Conditional) {
    return { branches: this.branchCount, hasElse: this.hasElse };
  },
  loadExtraState(this: Conditional, state: { branches: number; hasElse: boolean }) {
    if (!Number.isSafeInteger(state.branches) || state.branches < 1)
      throw new Error('Invalid IF branch count.');
    this.branchCount = state.branches;
    this.hasElse = state.hasElse !== false;
    this.rebuild();
  },
  customContextMenu(this: Conditional, options: Blockly.ContextMenuRegistry.ContextMenuOption[]) {
    const change = (update: () => void) => {
      const before = JSON.stringify(this.saveExtraState!());
      const group = Blockly.Events.getGroup();
      Blockly.Events.setGroup(true);
      try {
        update();
        this.rebuild();
        Blockly.Events.fire(
          new Blockly.Events.BlockChange(
            this,
            'mutation',
            null,
            before,
            JSON.stringify(this.saveExtraState!()),
          ),
        );
      } finally {
        Blockly.Events.setGroup(group);
      }
    };
    options.push({
      id: 'ps_add_branch',
      scope: { block: this },
      weight: 100,
      enabled: true,
      text: 'Add ELSEIF branch',
      callback: () =>
        change(() => {
          this.branchCount++;
        }),
    });
    options.push({
      id: 'ps_toggle_else',
      scope: { block: this },
      weight: 101,
      enabled: true,
      text: this.hasElse ? 'Remove ELSE branch' : 'Add ELSE branch',
      callback: () =>
        change(() => {
          this.hasElse = !this.hasElse;
        }),
    });
  },
};
const style = (colourPrimary: string, colourTertiary: string) => ({
  colourPrimary,
  colourSecondary: colourPrimary,
  colourTertiary,
});
export const theme = Blockly.Theme.defineTheme('pseudostar', {
  name: 'pseudostar',
  blockStyles: {
    output: style('#d2e3d3', '#92ad94'),
    input: style('#e8d8d7', '#b89d9a'),
    variable: style('#e4e1cc', '#b8b293'),
    selection: style('#e9d7c4', '#ba9c7b'),
    loop: style('#d4e2e5', '#95afb4'),
    routine: style('#d9dcd0', '#9ea88c'),
  },
  componentStyles: {
    workspaceBackgroundColour: '#f0f4ed',
    scrollbarColour: '#889988',
    scrollbarOpacity: 0.5,
    insertionMarkerColour: '#324f3b',
    insertionMarkerOpacity: 0.3,
    selectedGlowColour: '#44684b',
    selectedGlowOpacity: 0.25,
  },
  fontStyle: { family: '"SFMono-Regular",Consolas,monospace', weight: '500', size: 13 },
});
export const palette = [
  { type: 'ps_output', label: 'OUTPUT', hint: 'Show a value', category: 'output' },
  { type: 'ps_input', label: 'INPUT', hint: 'Ask for a value', category: 'input' },
  {
    type: 'ps_set',
    label: 'SET / COMPUTE',
    hint: 'Store or calculate a value',
    category: 'variable',
  },
  {
    type: 'ps_function_value',
    label: 'Function result',
    hint: 'Store the result of function',
    category: 'variable',
  },
  { type: 'ps_if', label: 'IF / ELSE', hint: 'Make a decision', category: 'selection' },
  { type: 'ps_for', label: 'FOR / NEXT', hint: 'Repeat instructions', category: 'loop' },
  { type: 'ps_while', label: 'WHILE', hint: 'Repeat while a condition is true', category: 'loop' },
  {
    type: 'ps_function',
    label: 'FUNCTION',
    hint: 'Name a calculation with inputs',
    category: 'routine',
  },
  { type: 'ps_return', label: 'RETURN', hint: 'Send back a result', category: 'routine' },
  {
    type: 'ps_invoke',
    label: 'CALL',
    hint: 'Use a function or change a collection',
    category: 'routine',
  },
  { type: 'ps_sub', label: 'SUB-ROUTINE', hint: 'Group instructions', category: 'routine' },
  { type: 'ps_call', label: 'name()', hint: 'Call a sub-routine', category: 'routine' },
];
export function sourceFor(ws: Blockly.Workspace, selected?: Blockly.Block) {
  const chain = (block: Blockly.Block | null, depth = 0, siblings = true): string => {
    if (!block) return '';
    const pad = '    '.repeat(depth),
      f = (n: string) => block.getFieldValue(n),
      body = (n: string) => chain(block.getInputTargetBlock(n), depth + 1);
    let text = '';
    switch (block.type) {
      case 'ps_output':
        text = `${f('KEYWORD')} ${f('EXPR')}`;
        break;
      case 'ps_input':
        text = `INPUT ${f('FORMAT') === 'JSON' ? 'JSON ' : ''}${f('NAME')}`;
        break;
      case 'ps_set':
        text = `${f('PREFIX') ? f('PREFIX') + ' ' : ''}${f('NAME')} ${f('PREFIX') === 'COMPUTE' ? 'AS' : '='} ${f('EXPR')}`;
        break;
      case 'ps_function_value':
        text = `${f('PREFIX') ? f('PREFIX') + ' ' : ''}${f('NAME')} ${f('PREFIX') === 'COMPUTE' ? 'AS' : '='} ${f('FUNCTION')}(${f('ARGS')})`;
        break;
      case 'ps_while':
        text = `WHILE ${f('EXPR')}\n${body('BODY')}${pad}ENDWHILE`;
        break;
      case 'ps_function':
        text = `FUNCTION ${f('NAME')}(${f('PARAMS')})\n${body('BODY')}${pad}END FUNCTION`;
        break;
      case 'ps_return':
        text = `RETURN ${f('EXPR')}`;
        break;
      case 'ps_invoke':
        text = `CALL ${f('EXPR')}`;
        break;
      case 'ps_call':
        text = `${f('NAME')}()`;
        break;
      case 'ps_sub':
        text = `SUB-ROUTINE ${f('NAME')}()\n${body('BODY')}${pad}END SUB`;
        break;
      case 'ps_for':
        text =
          (f('STYLE') === 'range'
            ? `FOR ${f('NAME')} IN RANGE(${f('START')}, ${f('END')}):`
            : `FOR ${f('NAME')} = ${f('START')} TO ${f('END')}${f('STYLE') === 'colon' ? ':' : ''}`) +
          `\n${body('BODY')}` +
          (f('STYLE') === 'next' ? `${pad}NEXT ${f('COUNTER')}` : '');
        text = text.trimEnd();
        break;
      case 'ps_if': {
        const c = block as Conditional;
        let data: { newlines?: boolean[] } = {};
        try {
          data = JSON.parse(block.data ?? '{}');
        } catch {}
        for (let i = 0; i < c.branchCount; i++)
          text += `${i ? pad + 'ELSEIF' : 'IF'} ${f('EXPR' + i)}${data.newlines?.[i] ? '\n' + pad + 'THEN' : ' THEN'}\n${body('BODY' + i)}`;
        if (c.hasElse) text += `${pad}ELSE\n${body('ELSE')}`;
        text += pad + 'ENDIF';
        break;
      }
    }
    return pad + text + '\n' + (siblings ? chain(block.getNextBlock(), depth) : '');
  };
  if (selected) return chain(selected, 0, false).trimEnd();
  return ws
    .getTopBlocks(true)
    .map((b) => chain(b))
    .join('\n')
    .trimEnd();
}
type Serialized = {
  type: string;
  id?: string;
  fields?: Record<string, string>;
  inputs?: Record<string, { block: Serialized }>;
  next?: { block: Serialized };
  extraState?: unknown;
  data?: string;
  x?: number;
  y?: number;
};
export function programToWorkspace(program: Program, ws: Blockly.Workspace, recordUndo = false) {
  const chain = (items: Statement[]): Serialized | undefined => {
    let next: Serialized | undefined;
    for (const s of [...items].reverse()) {
      let block: Serialized = { type: '', id: s.id };
      const input = (items: Statement[]) => {
        const block = chain(items);
        return block ? { block } : undefined;
      };
      switch (s.kind) {
        case 'input':
          block = {
            ...block,
            type: 'ps_input',
            fields: { NAME: s.name, FORMAT: s.json ? 'JSON' : '' },
          };
          break;
        case 'output':
          block = {
            ...block,
            type: 'ps_output',
            fields: { KEYWORD: s.keyword, EXPR: s.values.map((v) => v.raw).join(', ') },
          };
          break;
        case 'assign':
        case 'indexedAssign':
          block =
            s.value.kind === 'invoke'
              ? {
                  ...block,
                  type: 'ps_function_value',
                  fields: {
                    PREFIX: s.compute ? 'COMPUTE' : s.set ? 'SET' : '',
                    NAME: s.kind === 'assign' ? s.name : s.target.raw,
                    FUNCTION: s.value.name,
                    ARGS: s.value.args.map((a) => a.raw).join(', '),
                  },
                }
              : {
                  ...block,
                  type: 'ps_set',
                  fields: {
                    PREFIX: s.compute ? 'COMPUTE' : s.set ? 'SET' : '',
                    NAME: s.kind === 'assign' ? s.name : s.target.raw,
                    EXPR: s.value.raw,
                  },
                };
          break;
        case 'invoke':
          block = { ...block, type: 'ps_invoke', fields: { EXPR: s.expression.raw } };
          break;
        case 'return':
          block = { ...block, type: 'ps_return', fields: { EXPR: s.value.raw } };
          break;
        case 'while':
        case 'function': {
          block = {
            ...block,
            type: s.kind === 'while' ? 'ps_while' : 'ps_function',
            fields:
              s.kind === 'while'
                ? { EXPR: s.condition.raw }
                : { NAME: s.name, PARAMS: s.parameters.join(', ') },
            inputs: {},
          };
          const child = input(s.body);
          if (child) block.inputs!.BODY = child;
          break;
        }
        case 'call':
          block = { ...block, type: 'ps_call', fields: { NAME: s.name } };
          break;
        case 'sub':
        case 'for':
          block = {
            ...block,
            type: s.kind === 'sub' ? 'ps_sub' : 'ps_for',
            fields:
              s.kind === 'sub'
                ? { NAME: s.name }
                : {
                    NAME: s.name,
                    START: s.start.raw,
                    END: s.end.raw,
                    STYLE: s.style,
                    COUNTER: s.step ? `${s.name} + ${s.step.raw}` : s.name,
                  },
            inputs: {},
          };
          {
            const child = input(s.body);
            if (child) block.inputs!.BODY = child;
          }
          break;
        case 'if':
          block = {
            ...block,
            type: 'ps_if',
            extraState: { branches: s.branches.length, hasElse: s.otherwise !== undefined },
            data: JSON.stringify({ newlines: s.branches.map((b) => b.thenNewline) }),
            fields: {},
            inputs: {},
          };
          s.branches.forEach((b, i) => {
            block.fields!['EXPR' + i] = b.condition.raw;
            const child = input(b.body);
            if (child) block.inputs!['BODY' + i] = child;
          });
          {
            const child = input(s.otherwise ?? []);
            if (child) block.inputs!.ELSE = child;
          }
          break;
      }
      if (next) block.next = { block: next };
      next = block;
    }
    return next;
  };
  const root = chain(program.statements);
  if (root) {
    root.x = 30;
    root.y = 30;
  }
  const matches = (block: Blockly.Block | null, state: Serialized | undefined): boolean => {
    if (!block || !state) return !block && !state;
    if (block.type !== state.type || block.data !== (state.data ?? null)) return false;
    if (
      state.extraState &&
      JSON.stringify(block.saveExtraState?.()) !== JSON.stringify(state.extraState)
    )
      return false;
    for (const input of block.inputList)
      if (
        input.connection?.type === Blockly.ConnectionType.NEXT_STATEMENT &&
        !matches(input.connection.targetBlock(), state.inputs?.[input.name]?.block)
      )
        return false;
    return matches(block.getNextBlock(), state.next?.block);
  };
  const update = (block: Blockly.Block, state: Serialized) => {
    for (const [name, value] of Object.entries(state.fields ?? {}))
      if (block.getFieldValue(name) !== value) block.setFieldValue(value, name);
    for (const [name, input] of Object.entries(state.inputs ?? {}))
      update(block.getInputTargetBlock(name)!, input.block);
    if (state.next) update(block.getNextBlock()!, state.next.block);
  };
  const previousGroup = Blockly.Events.getGroup();
  if (recordUndo) Blockly.Events.setGroup(true);
  else Blockly.Events.disable();
  const group = Blockly.Events.getGroup();
  try {
    const tops = ws.getTopBlocks(true);
    if (recordUndo && tops.length === 1 && root && matches(tops[0], root)) update(tops[0], root);
    else
      Blockly.serialization.workspaces.load(
        { blocks: { languageVersion: 0, blocks: root ? [root] : [] } },
        ws,
        { recordUndo },
      );
  } finally {
    if (recordUndo) Blockly.Events.setGroup(previousGroup);
    else Blockly.Events.enable();
  }
  return group;
}
export const workspaceToProgram = (ws: Blockly.Workspace) => parse(sourceFor(ws));
export { Blockly };
