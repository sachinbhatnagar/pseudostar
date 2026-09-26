export function releaseAssets(root: ParentNode, base: string) {
  return Array.from(
    root.querySelectorAll<HTMLScriptElement | HTMLLinkElement>(
      'script[type="module"][src], link[rel="stylesheet"][href]',
    ),
    (element) =>
      new URL(element instanceof HTMLScriptElement ? element.src : element.href, base).pathname,
  ).sort();
}

export function watchForRelease() {
  const assets = releaseAssets(document, location.href);
  if (!assets.some((asset) => asset.startsWith('/assets/'))) return;
  const current = assets.join('\n');
  const check = async () => {
    try {
      const response = await fetch('/', { cache: 'no-store', headers: { Accept: 'text/html' } });
      if (!response.ok) return;
      const latest = releaseAssets(
        new DOMParser().parseFromString(await response.text(), 'text/html'),
        location.href,
      ).join('\n');
      if (latest && latest !== current) location.reload();
    } catch {}
  };
  setInterval(check, 60_000);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) void check();
  });
}
