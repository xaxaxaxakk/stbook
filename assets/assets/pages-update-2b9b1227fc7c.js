if ('serviceWorker' in navigator) {
  const started = performance.now();
  const hadController = Boolean(navigator.serviceWorker.controller);
  let reloading = false;
  let pending = false;
  const reload = () => { if (reloading) return; reloading = true; location.reload(); };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    if (!hadController) return;
    if (document.hidden || performance.now() - started < 15000) reload();
    else pending = true;
  });
  document.addEventListener('visibilitychange', () => { if (pending && document.hidden) reload(); });
  const register = async () => {
    try {
      const registration = await navigator.serviceWorker.register(new URL('./sw.js', document.baseURI), { scope: './', updateViaCache: 'none' });
      const check = () => { if (navigator.onLine) void registration.update().catch(() => {}); };
      check();
      window.addEventListener('online', check);
      document.addEventListener('visibilitychange', () => { if (!document.hidden) check(); });
    } catch (error) { console.error('[sillybooks] Update check failed.', error); }
  };
  if (document.readyState === 'complete') void register();
  else window.addEventListener('load', register, { once: true });
}
