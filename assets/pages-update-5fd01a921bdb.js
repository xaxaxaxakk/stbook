if ('serviceWorker' in navigator) {
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
