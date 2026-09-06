export type DiffRow = {
  left?: string;
  right?: string;
  leftLine?: number;
  rightLine?: number;
  changed: boolean;
};
export function compareLines(left: string, right: string): DiffRow[] {
  const a = left.split('\n'),
    b = right.split('\n');
  if (a.length * b.length > 1_000_000)
    return Array.from({ length: Math.max(a.length, b.length) }, (_, i) => ({
      left: a[i],
      right: b[i],
      leftLine: i < a.length ? i + 1 : undefined,
      rightLine: i < b.length ? i + 1 : undefined,
      changed: a[i] !== b[i],
    }));
  const width = b.length + 1,
    lengths = new Uint16Array((a.length + 1) * width);
  for (let i = a.length - 1; i >= 0; i--)
    for (let j = b.length - 1; j >= 0; j--)
      lengths[i * width + j] =
        a[i] === b[j]
          ? 1 + lengths[(i + 1) * width + j + 1]
          : Math.max(lengths[(i + 1) * width + j], lengths[i * width + j + 1]);
  const rows: DiffRow[] = [],
    removed: { text: string; line: number }[] = [],
    added: { text: string; line: number }[] = [];
  const flush = () => {
    for (let k = 0; k < Math.max(removed.length, added.length); k++)
      rows.push({
        left: removed[k]?.text,
        right: added[k]?.text,
        leftLine: removed[k]?.line,
        rightLine: added[k]?.line,
        changed: true,
      });
    removed.length = added.length = 0;
  };
  let i = 0,
    j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      flush();
      rows.push({ left: a[i], right: b[j], leftLine: ++i, rightLine: ++j, changed: false });
    } else if (
      i < a.length &&
      (j === b.length || lengths[(i + 1) * width + j] >= lengths[i * width + j + 1])
    )
      removed.push({ text: a[i], line: ++i });
    else added.push({ text: b[j], line: ++j });
  }
  flush();
  return rows;
}
