import type { Program, SourceRange, Statement } from './types';
export function format(program: Program): { source: string; ranges: Map<string, SourceRange> } {
  const lines: string[] = [];
  const ranges = new Map<string, SourceRange>();
  let offset = 0;
  const line = (text: string, level: number) => {
    const raw = '    '.repeat(level) + text;
    lines.push(raw);
    offset += raw.length + 1;
  };
  const emit = (items: Statement[], level: number) =>
    items.forEach((s) => {
      const start = offset;
      const lineNumber = lines.length + 1;
      switch (s.kind) {
        case 'input':
          line(`INPUT ${s.json ? 'JSON ' : ''}${s.name}`, level);
          break;
        case 'output':
          line(`${s.keyword} ${s.values.map((v) => v.raw).join(', ')}`, level);
          break;
        case 'assign':
        case 'indexedAssign':
          line(
            `${s.compute ? 'COMPUTE ' : s.set ? 'SET ' : ''}${s.kind === 'assign' ? s.name : s.target.raw} ${s.compute ? 'AS' : '='} ${s.value.raw}`,
            level,
          );
          break;
        case 'invoke':
          line(`CALL ${s.expression.raw}`, level);
          break;
        case 'return':
          line(`RETURN ${s.value.raw}`, level);
          break;
        case 'while':
          line(`WHILE ${s.condition.raw}`, level);
          emit(s.body, level + 1);
          line('ENDWHILE', level);
          break;
        case 'function':
          line(`FUNCTION ${s.name}(${s.parameters.join(', ')})`, level);
          emit(s.body, level + 1);
          line('END FUNCTION', level);
          break;
        case 'call':
          line(`${s.name}()`, level);
          break;
        case 'sub':
          line(`SUB-ROUTINE ${s.name}()`, level);
          emit(s.body, level + 1);
          line('END SUB', level);
          break;
        case 'for':
          line(
            s.style === 'range'
              ? `FOR ${s.name} IN RANGE(${s.start.raw}, ${s.end.raw}):`
              : `FOR ${s.name} = ${s.start.raw} TO ${s.end.raw}${s.style === 'colon' ? ':' : ''}`,
            level,
          );
          emit(s.body, level + 1);
          if (s.style === 'next') line(`NEXT ${s.name}`, level);
          break;
        case 'if':
          s.branches.forEach((b, i) => {
            line(`${i ? 'ELSEIF' : 'IF'} ${b.condition.raw}${b.thenNewline ? '' : ' THEN'}`, level);
            if (b.thenNewline) line('THEN', level);
            emit(b.body, level + 1);
          });
          if (s.otherwise !== undefined) {
            line('ELSE', level);
            emit(s.otherwise, level + 1);
          }
          line('ENDIF', level);
          break;
      }
      ranges.set(s.id, { start, end: offset - 1, line: lineNumber, column: level * 4 + 1 });
    });
  emit(program.statements, 0);
  return { source: lines.join('\n'), ranges };
}
