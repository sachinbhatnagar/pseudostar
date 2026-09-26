import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import { Blockly, palette, programToWorkspace, sourceFor, theme } from './blocks';
import { parse } from '../language/parse';
import type { Statement } from '../language/types';
import './editor.css';
import { useTrayDrag } from './useTrayDrag';
export type BlockHandle = { undo: () => void; redo: () => void; fit: () => void };
export const BlockEditor = forwardRef<
  BlockHandle,
  {
    source: string;
    onChange: (value: string) => void;
    invalid: boolean;
    activeLine?: number;
    diagnosticLine?: number;
    lastValidSource?: string;
    onExplain?: (block: string, source: string) => void;
  }
>(({ source, onChange, invalid, activeLine, diagnosticLine, lastValidSource, onExplain }, ref) => {
  const explain = useRef(onExplain);
  explain.current = onExplain;
  const host = useRef<HTMLDivElement>(null),
    workspace = useRef<Blockly.WorkspaceSvg | null>(null),
    last = useRef(source),
    callback = useRef(onChange);
  callback.current = onChange;
  const lastDiagnostic = useRef<number | undefined>(undefined),
    pendingDiagnostic = useRef<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [options, setOptions] = useState<{ id: string; label: string }[]>([]);
  const syncGroups = useRef(new Set<string>()),
    syncPending = useRef(false);
  const [syncing, setSyncing] = useState(false);
  const locked = invalid || syncing;
  const invalidRef = useRef(invalid);
  invalidRef.current = invalid;
  const refreshOptions = (ws: Blockly.WorkspaceSvg) => {
    setOptions(ws.getAllBlocks(false).map((b) => ({ id: b.id, label: b.toString(40) })));
    setSelected((current) => (current && ws.getBlockById(current) ? current : null));
  };
  useImperativeHandle(ref, () => ({
    undo: () => {
      if (!invalidRef.current && !syncPending.current) workspace.current?.undo(false);
    },
    redo: () => {
      if (!invalidRef.current && !syncPending.current) workspace.current?.undo(true);
    },
    fit: () => workspace.current?.zoomToFit(),
  }));
  useEffect(() => {
    if (!host.current) return;
    const ws = Blockly.inject(host.current, {
      renderer: 'zelos',
      theme,
      sounds: false,
      trashcan: false,
      zoom: { controls: false, wheel: true, startScale: 0.85, minScale: 0.5, maxScale: 1.5 },
      move: { scrollbars: true, drag: true, wheel: true },
    });
    workspace.current = ws;
    const menuId = `ps-explain-${ws.id}`;
    Blockly.ContextMenuRegistry.registry.register({
      id: menuId,
      scopeType: Blockly.ContextMenuRegistry.ScopeType.BLOCK,
      displayText: 'Explain Purpose',
      weight: 1,
      preconditionFn: (scope) =>
        scope.block?.workspace !== ws
          ? 'hidden'
          : explain.current && !invalidRef.current
            ? 'enabled'
            : 'disabled',
      callback: (scope) => {
        if (scope.block && explain.current)
          explain.current(sourceFor(ws, scope.block), sourceFor(ws));
      },
    });
    const current = parse(last.current);
    const parsed = current.ok ? current : parse(lastValidSource ?? '');
    if (parsed.ok) programToWorkspace(parsed.program, ws);
    refreshOptions(ws);
    const listener = (event: Blockly.Events.Abstract) => {
      if (event.type === Blockly.Events.SELECTED) {
        const id = (event as Blockly.Events.Selected).newElementId;
        if (id && ws.getBlockById(id)) setSelected(id);
        else if (host.current?.contains(document.activeElement)) setSelected(null);
      }
      // A field emits partial values while the learner is still typing.
      if (event.isUiEvent || event.type === Blockly.Events.BLOCK_FIELD_INTERMEDIATE_CHANGE) return;
      refreshOptions(ws);
      if (invalidRef.current || syncPending.current) return;
      if (event.recordUndo && syncGroups.current.has(event.group)) return;
      const value = sourceFor(ws);
      if (value !== last.current) {
        last.current = value;
        callback.current(value);
      }
    };
    ws.addChangeListener(listener);
    let width = 0;
    const resize = new ResizeObserver(() => {
      if (!host.current?.clientWidth || !host.current.clientHeight) return;
      Blockly.svgResize(ws);
      if (width !== host.current.clientWidth) {
        width = host.current.clientWidth;
        const first = ws.getTopBlocks(true)[0];
        if (first) {
          const p = first.getRelativeToSurfaceXY();
          ws.scroll(24 - p.x * ws.scale, 24 - p.y * ws.scale);
        }
      }
      if (pendingDiagnostic.current && ws.getBlockById(pendingDiagnostic.current)) {
        ws.centerOnBlock(pendingDiagnostic.current);
        pendingDiagnostic.current = null;
      }
    });
    resize.observe(host.current);
    return () => {
      resize.disconnect();
      Blockly.ContextMenuRegistry.registry.unregister(menuId);
      ws.dispose();
      workspace.current = null;
    };
  }, []);
  useEffect(() => {
    syncPending.current = false;
    setSyncing(false);
    if (last.current === source || !workspace.current) return;
    const parsed = parse(source);
    if (!parsed.ok) return;
    syncPending.current = true;
    setSyncing(true);
    const timer = setTimeout(() => {
      if (!workspace.current) return;
      last.current = source;
      syncGroups.current.add(programToWorkspace(parsed.program, workspace.current, true));
      refreshOptions(workspace.current);
      syncPending.current = false;
      setSyncing(false);
    }, 150);
    return () => clearTimeout(timer);
  }, [source]);
  useEffect(() => {
    const ws = workspace.current;
    if (!ws) return;
    for (const block of ws.getAllBlocks(false))
      block.getSvgRoot().classList.remove('ps-execution-block', 'ps-diagnostic-block');
    if (diagnosticLine !== lastDiagnostic.current) pendingDiagnostic.current = null;
    if (diagnosticLine === undefined) lastDiagnostic.current = undefined;
    if (syncPending.current) return;
    const parsed = parse(source);
    if (!parsed.ok) return;
    const statements: Statement[] = [];
    const flatten = (ss: Statement[]) =>
      ss.forEach((s) => {
        statements.push(s);
        if (s.kind === 'if') {
          s.branches.forEach((b) => flatten(b.body));
          flatten(s.otherwise ?? []);
        } else if (
          s.kind === 'for' ||
          s.kind === 'sub' ||
          s.kind === 'function' ||
          s.kind === 'while'
        )
          flatten(s.body);
      });
    flatten(parsed.program.statements);
    const blocks: Blockly.BlockSvg[] = [];
    const visit = (b: Blockly.BlockSvg | null) => {
      if (!b) return;
      blocks.push(b);
      for (const input of b.inputList)
        if (input.connection?.type === Blockly.ConnectionType.NEXT_STATEMENT)
          visit(input.connection.targetBlock() as Blockly.BlockSvg | null);
      visit(b.getNextBlock());
    };
    ws.getTopBlocks(true).forEach(visit);
    const find = (line: number | undefined) =>
      blocks[statements.findIndex((s) => s.range.line === line)];
    find(activeLine)?.getSvgRoot().classList.add('ps-execution-block');
    const failed = find(diagnosticLine);
    if (failed) {
      failed.getSvgRoot().classList.add('ps-diagnostic-block');
      if (diagnosticLine !== lastDiagnostic.current) {
        lastDiagnostic.current = diagnosticLine;
        pendingDiagnostic.current = failed.id;
        if (host.current?.clientWidth && host.current.clientHeight) {
          ws.centerOnBlock(failed.id);
          pendingDiagnostic.current = null;
        }
      }
    }
  }, [activeLine, diagnosticLine, source, syncing]);
  const add = (type: string, point?: { x: number; y: number }) => {
    const ws = workspace.current;
    if (!ws || locked) return;
    const current = selected ? ws.getBlockById(selected) : null;
    const first = ws.getTopBlocks(true)[0];
    Blockly.Events.setGroup(true);
    try {
      const block = ws.newBlock(type);
      block.initSvg();
      block.render();
      const canvas = ws.getCanvas().getScreenCTM();
      if (point && canvas) {
        const p = new DOMPoint(point.x, point.y).matrixTransform(canvas.inverse());
        block.moveBy(p.x - 15, p.y - 12);
        const match = block.previousConnection?.closest(40, new Blockly.utils.Coordinate(0, 0));
        if (match?.connection) block.previousConnection!.connect(match.connection);
      } else {
        let tail: Blockly.BlockSvg | null = current ?? first ?? null;
        while (tail?.getNextBlock()) tail = tail.getNextBlock();
        if (tail?.nextConnection && block.previousConnection)
          tail.nextConnection.connect(block.previousConnection);
        else block.moveBy(30, 30);
      }
      block.select();
    } finally {
      Blockly.Events.setGroup(false);
    }
  };
  const act = (action: 'delete' | 'up' | 'down' | 'nest' | 'unnest') => {
    const ws = workspace.current,
      b = selected ? ws?.getBlockById(selected) : null;
    if (!b || locked) return;
    Blockly.Events.setGroup(true);
    try {
      if (action === 'delete') {
        b.dispose(true);
        return;
      }
      const parent = b.getParent(),
        previous = b.getPreviousBlock(),
        next = b.getNextBlock();
      if (action === 'up' && previous) {
        const before = previous.previousConnection?.targetConnection;
        b.unplug(true);
        if (before && b.previousConnection) before.connect(b.previousConnection);
        if (b.nextConnection && previous.previousConnection)
          b.nextConnection.connect(previous.previousConnection);
      }
      if (action === 'down' && next) {
        b.unplug(true);
        const after = next.nextConnection?.targetConnection;
        if (next.nextConnection && b.previousConnection)
          next.nextConnection.connect(b.previousConnection);
        if (after && b.nextConnection) b.nextConnection.connect(after);
      }
      if (action === 'nest' && previous) {
        const cavity = previous.inputList.find(
          (i) => i.connection?.type === Blockly.ConnectionType.NEXT_STATEMENT,
        )?.connection;
        if (cavity && b.previousConnection) {
          b.unplug(true);
          cavity.connect(b.previousConnection);
        }
      }
      if (action === 'unnest' && parent) {
        let child: Blockly.Block = b;
        let container: Blockly.Block | null = parent;
        while (container && container.getNextBlock() === child) {
          child = container;
          container = container.getParent();
        }
        if (container?.nextConnection && b.previousConnection) {
          b.unplug(true);
          container.nextConnection.connect(b.previousConnection);
        }
      }
      b.select();
    } finally {
      Blockly.Events.setGroup(false);
    }
  };
  const trayDrag = useTrayDrag((type, point) => {
    const r = host.current?.getBoundingClientRect();
    if (r && point.x >= r.left && point.x <= r.right && point.y >= r.top && point.y <= r.bottom)
      add(type, point);
  });
  const { drag } = trayDrag;
  return (
    <div className="blocks-layout">
      <p className="tray-touch-hint">Tap to add. Hold, then drag to place.</p>
      <div className="block-tray" aria-label="Block tray">
        {palette.map((item) => (
          <button
            key={item.type}
            disabled={locked}
            className={`palette-block ${item.category}`}
            {...trayDrag.handlers(item.type, item.label)}
            onClick={() => {
              if (!trayDrag.consumeClick()) add(item.type);
            }}
          >
            <span className="block-syntax">{item.label}</span>
            <span className="block-hint">{item.hint}</span>
          </button>
        ))}
      </div>
      <div className="canvas-column">
        <div className="canvas-heading">
          <span>Block workspace</span>
          <span>{syncing ? 'Updating blocks…' : 'Click a field to edit'}</span>
        </div>
        <div
          className="blockly-host"
          ref={host}
          aria-label="Block workspace"
          inert={locked || undefined}
        />
        {invalid && (
          <div className="invalid-overlay">
            Correct the text error to continue editing blocks. Your last valid blocks are kept.
          </div>
        )}
        <div className="block-actions">
          <select
            aria-label="Select an instruction"
            value={selected ?? ''}
            onChange={(e) => {
              setSelected(e.target.value);
              workspace.current?.getBlockById(e.target.value)?.select();
            }}
          >
            <option value="">Select a block</option>
            {options.map((b) => (
              <option key={b.id} value={b.id}>
                {b.label}
              </option>
            ))}
          </select>
          <button disabled={!selected || locked} onClick={() => act('up')}>
            Up
          </button>
          <button disabled={!selected || locked} onClick={() => act('down')}>
            Down
          </button>
          <button disabled={!selected || locked} onClick={() => act('nest')}>
            Nest
          </button>
          <button disabled={!selected || locked} onClick={() => act('unnest')}>
            Out
          </button>
          <button disabled={!selected || locked} onClick={() => act('delete')}>
            Delete
          </button>
          <button
            disabled={!selected || locked || !onExplain}
            title={!onExplain ? 'Sign in to use AI explanations' : undefined}
            onClick={() => {
              const ws = workspace.current,
                block = selected ? ws?.getBlockById(selected) : null;
              if (ws && block) onExplain?.(sourceFor(ws, block), sourceFor(ws));
            }}
          >
            Explain Purpose
          </button>
        </div>
      </div>
      {drag && (
        <div className="drag-preview" style={{ left: drag.x + 12, top: drag.y + 12 }}>
          {drag.label}
        </div>
      )}
    </div>
  );
});
