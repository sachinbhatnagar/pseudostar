import { useMemo, useState } from 'react';
import { compareLines } from './diff';
export function SolutionComparison({ source, solution }: { source: string; solution: string }) {
  const rows = useMemo(() => compareLines(source, solution), [source, solution]);
  const [visible, setVisible] = useState(300);
  return (
    <div className="solution-comparison">
      <p className="comparison-note">
        Shaded lines differ. A different approach can still be correct.
      </p>
      <p className="comparison-scroll-hint">Swipe across to compare both columns.</p>
      <div className="diff-scroll" role="region" aria-label="Pseudocode comparison" tabIndex={0}>
        <table className="diff-table">
          <thead>
            <tr>
              <th scope="col">Your pseudocode</th>
              <th scope="col">Reference solution</th>
            </tr>
          </thead>
          <tbody>
            {rows.slice(0, visible).map((row, index) => (
              <tr key={index} className={row.changed ? 'diff-changed' : ''}>
                <td className={row.left === undefined ? 'diff-empty' : ''}>
                  <span className="diff-line" aria-hidden="true">
                    {row.leftLine ?? ''}
                  </span>
                  <code>{row.left ?? ''}</code>
                  {row.changed && <span className="sr-only"> Different line.</span>}
                </td>
                <td className={row.right === undefined ? 'diff-empty' : ''}>
                  <span className="diff-line" aria-hidden="true">
                    {row.rightLine ?? ''}
                  </span>
                  <code>{row.right ?? ''}</code>
                  {row.changed && <span className="sr-only"> Different line.</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {visible < rows.length && (
        <button className="learning-action" onClick={() => setVisible((v) => v + 300)}>
          Show more lines ({rows.length - visible} remaining)
        </button>
      )}
    </div>
  );
}
