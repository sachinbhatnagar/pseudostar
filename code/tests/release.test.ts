// @vitest-environment jsdom
import { describe, expect, it } from 'vitest';
import { releaseAssets } from '../src/release';

describe('release update detection', () => {
  it('distinguishes releases by their generated script and stylesheet names', () => {
    document.head.innerHTML = `
      <script type="module" src="/assets/index-old.js"></script>
      <link rel="stylesheet" href="/assets/index-old.css">
    `;
    const current = releaseAssets(document, 'https://pseudostar.test/');
    const latest = new DOMParser().parseFromString(
      `<script type="module" src="/assets/index-new.js"></script>
       <link rel="stylesheet" href="/assets/index-new.css">`,
      'text/html',
    );
    expect(releaseAssets(latest, 'https://pseudostar.test/')).not.toEqual(current);
  });
});
