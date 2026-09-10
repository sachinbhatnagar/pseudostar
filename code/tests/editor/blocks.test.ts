import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import {
  Blockly,
  programToWorkspace,
  sourceFor,
  workspaceToProgram,
} from '../../src/editor/blocks';
import { parse } from '../../src/language/parse';
import { format } from '../../src/language/format';
import { run } from '../../src/language/machine';

function withWorkspace(source: string, check: (workspace: Blockly.Workspace) => void) {
  const parsed = parse(source);
  expect(parsed.ok, JSON.stringify(parsed)).toBe(true);
  const workspace = new Blockly.Workspace();
  try {
    if (parsed.ok) programToWorkspace(parsed.program, workspace);
    check(workspace);
  } finally {
    workspace.dispose();
  }
}

const visibleRow = (block: Blockly.Block, name: string) =>
  block
    .getInput(name)
    ?.fieldRow.filter((field) => field.isVisible())
    .map((field) => field.getText())
    .filter(Boolean)
    .join(' ');

describe('block round trips', () => {
  it('preserves COMPUTE through blocks, saved workspaces, and syntax changes', () => {
    const source =
      'SET items = [[1, 2]]\nCOMPUTE count AS LENGTH(items[1])\nCOMPUTE items[1][2] AS count * 3\nOUTPUT items';
    withWorkspace(source, (workspace) => {
      const saved = Blockly.serialization.workspaces.save(workspace);
      Blockly.serialization.workspaces.load(saved, workspace);
      expect(sourceFor(workspace)).toBe(source);
      expect(run(sourceFor(workspace), []).output).toEqual(['[[1,6]]']);
      for (const block of workspace
        .getAllBlocks(false)
        .filter((b) => b.getFieldValue('PREFIX') === 'COMPUTE')) {
        expect(block.getField('PREFIX')?.isVisible()).toBe(true);
        expect(block.getFieldValue('SEPARATOR')).toBe('AS');
        for (const prefix of ['', 'SET', 'COMPUTE']) {
          block.setFieldValue(prefix, 'PREFIX');
          expect(block.getFieldValue('SEPARATOR')).toBe(prefix === 'COMPUTE' ? 'AS' : '=');
          expect(block.getField('PREFIX')?.isVisible()).toBe(prefix !== '');
          expect(run(sourceFor(workspace), []).output).toEqual(['[[1,6]]']);
        }
      }
    });
  });
  it('preserves SET and function-result blocks through execution and formatting', () => {
    const source =
      'SET items = [[1,2], [3]]\nSET count = LENGTH(items)\nSET items[2][1] = MAX(count, LENGTH(items[1]))\nOUTPUT items';
    withWorkspace(source, (workspace) => {
      expect(
        workspace.getAllBlocks(false).filter((b) => b.type === 'ps_function_value'),
      ).toHaveLength(2);
      expect(sourceFor(workspace).trim()).toBe(source);
      expect(run(sourceFor(workspace), []).output).toEqual(['[[1,2],[2]]']);
    });
  });
  for (const file of readdirSync('../references').filter((name) => name.endsWith('.md'))) {
    it(`preserves ${file}`, () => {
      const source = readFileSync(`../references/${file}`, 'utf8')
        .split('<!-- prettier-ignore-start -->')[1]
        .split('<!-- prettier-ignore-end -->')[0]
        .trim();
      withWorkspace(source, (workspace) => {
        const original = parse(source);
        const restored = workspaceToProgram(workspace);
        expect(restored.ok, JSON.stringify(restored)).toBe(true);
        if (original.ok && restored.ok)
          expect(format(restored.program).source).toBe(format(original.program).source);
      });
    });
  }

  it.each([
    {
      style: 'next',
      header: 'FOR turn = 2 TO 4',
      footer: 'NEXT turn',
      source: 'FOR turn = 2 TO 4\nOUTPUT turn\nNEXT turn',
      output: ['2', '3', '4'],
    },
    {
      style: 'colon',
      header: 'FOR turn = 2 TO 4 :',
      footer: undefined,
      source: 'FOR turn = 2 TO 4:\n    OUTPUT turn',
      output: ['2', '3', '4'],
    },
    {
      style: 'range',
      header: 'FOR turn IN RANGE( 2 , 4 ):',
      footer: undefined,
      source: 'FOR turn IN RANGE(2, 4):\n    OUTPUT turn',
      output: ['2', '3'],
    },
  ])(
    'shows literal $style syntax and preserves execution',
    ({ source, header, footer, output }) => {
      withWorkspace(source, (workspace) => {
        const block = workspace.getTopBlocks(true)[0];
        expect(visibleRow(block, 'HEADER')).toBe(header);
        expect(visibleRow(block, 'FOOTER')).toBe(footer);
        const result = run(sourceFor(workspace), []);
        expect(result.error).toBeUndefined();
        expect(result.output).toEqual(output);
      });
    },
  );

  it('changes loop form and counter without losing its body', () => {
    withWorkspace('FOR i = 1 TO 3\nOUTPUT "body"\nNEXT i', (workspace) => {
      const block = workspace.getTopBlocks(true)[0];
      const body = block.getInputTargetBlock('BODY');
      block.setFieldValue('range', 'STYLE');
      expect(visibleRow(block, 'HEADER')).toBe('FOR i IN RANGE( 1 , 3 ):');
      expect(block.getInput('FOOTER')).toBeNull();
      block.setFieldValue('colon', 'STYLE');
      expect(visibleRow(block, 'HEADER')).toBe('FOR i = 1 TO 3 :');
      block.setFieldValue('next', 'STYLE');
      block.setFieldValue('turn', 'NAME');
      expect(visibleRow(block, 'FOOTER')).toBe('NEXT turn');
      expect(block.getInputTargetBlock('BODY')).toBe(body);
      const result = run(sourceFor(workspace), []);
      expect(result.error).toBeUndefined();
      expect(result.output).toEqual(['body', 'body', 'body']);
    });
  });

  it('edits and preserves the NEXT increase', () => {
    withWorkspace('FOR counter = 1 TO 6\nOUTPUT counter\nNEXT counter + 2', (workspace) => {
      const block = workspace.getTopBlocks(true)[0];
      expect(visibleRow(block, 'FOOTER')).toBe('NEXT counter + 2');
      block.setFieldValue('counter + 3', 'COUNTER');
      expect(sourceFor(workspace)).toBe(
        'FOR counter = 1 TO 6\n    OUTPUT counter\nNEXT counter + 3',
      );
      expect(run(sourceFor(workspace), []).output).toEqual(['1', '4']);
    });
  });

  it('preserves 20 ELSEIF branches, bodies, and THEN placement through saved blocks', () => {
    const branches = Array.from(
      { length: 21 },
      (_, i) =>
        `${i ? 'ELSEIF' : 'IF'} choice = ${i}${i % 2 ? '\nTHEN' : ' THEN'}\n    OUTPUT "branch ${i}"`,
    );
    const source = `INPUT choice\n${branches.join('\n')}\nELSE\n    OUTPUT "other"\nENDIF`;
    withWorkspace(source, (workspace) => {
      const saved = Blockly.serialization.workspaces.save(workspace);
      Blockly.serialization.workspaces.load(saved, workspace);
      const restored = sourceFor(workspace);
      const original = parse(source);
      if (original.ok) expect(restored).toBe(format(original.program).source);
      for (let i = 0; i <= 21; i++) {
        const result = run(restored, [String(i)]);
        expect(result.error).toBeUndefined();
        expect(result.output).toEqual([i <= 20 ? `branch ${i}` : 'other']);
      }
    });
  });

  it('keeps field edits in place and conversion undo separate from previous edits', async () => {
    const workspace = new Blockly.Workspace();
    const load = (source: string, recordUndo = false) => {
      const parsed = parse(source);
      if (!parsed.ok) throw new Error(JSON.stringify(parsed));
      programToWorkspace(parsed.program, workspace, recordUndo);
    };
    const flush = () => new Promise((resolve) => setTimeout(resolve, 10));
    try {
      load('OUTPUT "original"');
      const block = workspace.getTopBlocks(true)[0];
      block.setFieldValue('"block edit"', 'EXPR');
      await flush();
      load('PRINT "text edit"', true);
      expect(workspace.getTopBlocks(true)[0]).toBe(block);
      await flush();
      workspace.undo(false);
      expect(sourceFor(workspace)).toBe('OUTPUT "block edit"');
      await flush();
      workspace.undo(false);
      expect(sourceFor(workspace)).toBe('OUTPUT "original"');
      await flush();
      workspace.undo(true);
      await flush();
      workspace.undo(true);
      expect(sourceFor(workspace)).toBe('PRINT "text edit"');
      await flush();
      load('FOR i = 1 TO 2\nOUTPUT i\nNEXT i', true);
      await flush();
      workspace.undo(false);
      expect(sourceFor(workspace)).toBe('PRINT "text edit"');
      await flush();
      workspace.undo(false);
      expect(sourceFor(workspace)).toBe('OUTPUT "block edit"');
    } finally {
      workspace.dispose();
    }
  });
});

it('round trips advanced functions, collections, and loop bodies', () => {
  const source =
    'FUNCTION sum(items)\n    total = 0\n    i = 1\n    WHILE i <= LENGTH(items)\n        total = total + items[i]\n        i = i + 1\n    ENDWHILE\n    RETURN total\nEND FUNCTION\na = [1, 2]\na[2] = 4\nCALL APPEND(a, 3)\nOUTPUT sum(a)';
  withWorkspace(source, (ws) => {
    expect(run(sourceFor(ws), []).output).toEqual(['8']);
    expect(ws.getAllBlocks(false).some((b) => b.type === 'ps_function')).toBe(true);
    expect(ws.getAllBlocks(false).some((b) => b.type === 'ps_while')).toBe(true);
  });
});
