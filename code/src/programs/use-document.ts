import { useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import { api, type User } from './api';
import { createDocumentController } from './document-controller';
export type { Document } from './document-controller';

export function useDocument(user: User | null, initial: string) {
  const owner = user?.id ?? null;
  const seed = useRef(initial);
  const controller = useMemo(
    () =>
      createDocumentController(owner, seed.current, {
        // Access storage inside the controller's try/catch: the browser getter can throw.
        storage: {
          getItem: (key) => localStorage.getItem(key),
          setItem: (key, value) => localStorage.setItem(key, value),
        },
        request: (path, options) =>
          api(path, {
            ...options,
            headers: { ...options.headers, ...(owner ? { 'X-Pseudostar-User': owner } : {}) },
          }),
        uuid: () => crypto.randomUUID(),
      }),
    [owner],
  );
  const snapshot = useSyncExternalStore(controller.subscribe, controller.getSnapshot);
  useEffect(() => {
    controller.start();
    const warn = (event: BeforeUnloadEvent) => {
      if (controller.hasUnsavedChanges()) {
        event.preventDefault();
        event.returnValue = '';
      }
    };
    window.addEventListener('beforeunload', warn);
    return () => {
      controller.stop();
      window.removeEventListener('beforeunload', warn);
    };
  }, [controller]);
  return {
    ...snapshot,
    setDoc: controller.setDoc,
    save: controller.save,
    fresh: controller.fresh,
    load: controller.load,
    copy: controller.copy,
  };
}
