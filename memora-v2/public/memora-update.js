// This page is served outside V1's offline navigation fallback, under /api/.
document.getElementById('update').addEventListener('click', async () => {
  const button = document.getElementById('update');
  const status = document.getElementById('status');
  button.disabled = true;
  status.textContent = 'Retirando la versión antigua…';
  try {
    if ('serviceWorker' in navigator) {
      const registrations = await navigator.serviceWorker.getRegistrations();
      for (const registration of registrations) {
        const worker = registration.active || registration.waiting || registration.installing;
        if (!worker) continue;
        const script = new URL(worker.scriptURL);
        if (script.origin === location.origin && script.pathname === '/sw.js') await registration.unregister();
      }
    }
    location.replace('/?memora-version=2');
  } catch {
    status.textContent = 'No se pudo completar la actualización. Cierra las otras pestañas de Memora y vuelve a intentarlo.';
    button.disabled = false;
  }
});
