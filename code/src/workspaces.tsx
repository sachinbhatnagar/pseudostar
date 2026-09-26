import { SelectControl } from './components/ui/controls';
import { useSyncExternalStore } from 'react';

export const workspaces = [
  { id: 'ict', name: 'ICT', path: '/ict' },
  { id: 'english', name: 'English', path: '/english' },
] as const;
const changed = 'pseudostar:navigate';
let blocker: (() => boolean) | null = null;
let acceptedPath = location.pathname;
export function guardNavigation(check: () => boolean) {
  blocker = check;
  return () => {
    if (blocker === check) blocker = null;
  };
}
export function canLeaveWorkspace() {
  return !blocker || blocker();
}
export function navigate(path: string, replace = false) {
  if (!canLeaveWorkspace()) return;
  history[replace ? 'replaceState' : 'pushState'](null, '', path);
  acceptedPath = path;
  try {
    localStorage.setItem('pseudostar:workspace', path.startsWith('/english') ? 'english' : 'ict');
  } catch {}
  window.dispatchEvent(new Event(changed));
  window.scrollTo(0, 0);
}
function subscribe(callback: () => void) {
  const pop = () => {
    if (blocker && !blocker()) {
      history.pushState(null, '', acceptedPath);
      return;
    }
    acceptedPath = location.pathname;
    callback();
  };
  window.addEventListener('popstate', pop);
  window.addEventListener(changed, callback);
  return () => {
    window.removeEventListener('popstate', pop);
    window.removeEventListener(changed, callback);
  };
}
export function usePath() {
  return useSyncExternalStore(subscribe, () => location.pathname);
}
export function WorkspaceSwitcher({
  value,
  beforeChange,
}: {
  value: 'ict' | 'english';
  beforeChange?: () => boolean;
}) {
  return (
    <label className="workspace-switcher">
      Workspace{' '}
      <SelectControl
        label="Workspace"
        value={value}
        subject={value}
        onValueChange={(next) => {
          if (!beforeChange || beforeChange())
            navigate(workspaces.find((w) => w.id === next)!.path);
        }}
        options={workspaces.map((w) => ({ value: w.id, label: w.name }))}
      />
    </label>
  );
}
export function RouteLink({
  to,
  children,
  className,
}: {
  to: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <a
      className={className}
      href={to}
      onClick={(e) => {
        if (e.button || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
        e.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}
