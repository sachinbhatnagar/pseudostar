import React, { useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { BlockEditor } from '../../src/editor/BlockEditor';
import type { BlockHandle } from '../../src/editor/BlockEditor';
import { TextEditor } from '../../src/editor/TextEditor';

function Fixture() {
  const [source, setSource] = useState('INPUT n\nFOR i = 1 TO 3\n    OUTPUT i\nNEXT i');
  const [activeLine, setActiveLine] = useState<number>();
  const [diagnosticLine, setDiagnosticLine] = useState<number>();
  const [hidden, setHidden] = useState(false);
  const blocks = useRef<BlockHandle>(null);
  return (
    <>
      <style>{`body {font-family:system-ui;color:#283e30;margin:16px} button,select {font:inherit;margin:4px;padding:8px} .blocks-layout {display:flex;min-height:420px} .block-tray {width:190px;flex-shrink:0} .palette-block {display:flex;flex-direction:column;width:170px} .block-hint {font-size:11px} .canvas-column {flex:1;min-width:0} .blockly-host {height:340px} .text-editor {height:200px} .drag-preview {position:fixed;pointer-events:none;background:#d2e3d3;padding:10px} @media(max-width:600px){.blocks-layout {display:block}.block-tray {display:flex;overflow-x:auto;width:100%}.palette-block,.tray-touch-hint {flex:0 0 150px}.block-actions{display:flex;flex-wrap:wrap}.block-actions select{max-width:100%}}`}</style>
      <button onClick={() => setSource('PRINT "restored"')}>Restore source</button>
      <button onClick={() => setActiveLine(3)}>Highlight output</button>
      <button onClick={() => setActiveLine(undefined)}>Clear highlight</button>
      <button
        onClick={() => {
          setSource(Array.from({ length: 80 }, (_, i) => `OUTPUT ${i + 1}`).join('\n'));
          setDiagnosticLine(80);
        }}
      >
        Reveal last error
      </button>
      <button onClick={() => setDiagnosticLine(undefined)}>Clear error</button>
      <button onClick={() => setHidden((value) => !value)}>Toggle blocks</button>
      <button onClick={() => blocks.current?.undo()}>Undo conversion</button>
      <div style={{ display: hidden ? 'none' : 'block' }}>
        <BlockEditor
          ref={blocks}
          source={source}
          onChange={setSource}
          invalid={false}
          activeLine={activeLine}
          diagnosticLine={diagnosticLine}
        />
      </div>
      <TextEditor
        source={source}
        onChange={setSource}
        activeLine={activeLine}
        diagnosticLine={diagnosticLine}
      />
    </>
  );
}
createRoot(document.getElementById('root')!).render(<Fixture />);
