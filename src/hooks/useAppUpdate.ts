import { useEffect, useRef, useState } from "react";
export function useAppUpdate() {
  const [needRefresh, setNeedRefresh] = useState(false);
  const registration = useRef<ServiceWorkerRegistration | undefined>(undefined);
  const applying = useRef(false);
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    let disposed = false;
    let worker: ServiceWorker | null = null;
    let registered: ServiceWorkerRegistration | undefined;
    const check = () => {
      if (!disposed)
        setNeedRefresh(
          !!registered?.waiting && !!navigator.serviceWorker.controller,
        );
    };
    const found = () => {
      worker?.removeEventListener("statechange", check);
      worker = registered?.installing || null;
      worker?.addEventListener("statechange", check);
      check();
    };
    const changed = () => {
      if (applying.current) window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", changed);
    void navigator.serviceWorker.ready.then((value) => {
      if (disposed) return;
      registered = value;
      registration.current = value;
      value.addEventListener("updatefound", found);
      found();
      void value.update().catch(() => {});
    });
    return () => {
      disposed = true;
      worker?.removeEventListener("statechange", check);
      registered?.removeEventListener("updatefound", found);
      navigator.serviceWorker.removeEventListener("controllerchange", changed);
    };
  }, []);
  return {
    needRefresh,
    updateApp: () => {
      if (!registration.current?.waiting) return;
      applying.current = true;
      registration.current.waiting.postMessage({ type: "SKIP_WAITING" });
    },
  };
}
