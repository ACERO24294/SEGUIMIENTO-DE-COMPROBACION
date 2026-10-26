const CACHE_NAME = 'acreimex-pwa-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  'https://cdn.tailwindcss.com',
  'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css'
];

// Instalación: Guarda en caché los archivos base
self.addEventListener('install', (e) => {
  e.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(ASSETS_TO_CACHE);
    })
  );
  self.skipWaiting();
});

// Activación: Limpia cachés antiguas
self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) return caches.delete(key);
        })
      );
    })
  );
  self.clients.claim();
});

// Estrategia Network First (intenta red, si falla usa caché)
self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET' || e.request.url.includes('script.google.com')) {
    return;
  }

  e.respondWith(
    fetch(e.request)
      .then((networkResponse) => {
        return caches.open(CACHE_NAME).then((cache) => {
          cache.put(e.request, networkResponse.clone());
          return networkResponse;
        });
      })
      .catch(() => caches.match(e.request))
  );
});

// Escuchar mensajes enviados desde el archivo HTML
self.addEventListener('message', (event) => {
  if (event.data && event.data.action === 'PROGRAMAR_ALERTAS') {
    verificarYProgramarAlerta();
  }
});

function verificarYProgramarAlerta() {
  const ahora = new Date();
  const horaActual = ahora.getHours();

  // Si ya pasaron las 10:00 AM de hoy
  if (horaActual >= 10) {
    // Lanzar notificación 10 segundos después de otorgar permisos
    setTimeout(() => {
      mostrarNotificacionPush(
        "⚠️ Atención: Revisión de Créditos Pendientes",
        "Ya han pasado las 10:00 AM. Revisa los créditos de Solidarios vigentes que requieren comprobación."
      );
    }, 10000);
  } else {
    // Calcular cuántos milisegundos faltan para las 10:00 AM de hoy
    const objetivo = new Date();
    objetivo.setHours(10, 0, 0, 0);
    const tiempoRestante = objetivo.getTime() - ahora.getTime();

    setTimeout(() => {
      mostrarNotificacionPush(
        "🔔 Alerta Automática 10:00 AM - ACREIMEX",
        "Es hora de revisar las comprobaciones de créditos pendientes en Solidarios."
      );
    }, tiempoRestante);
  }
}

function mostrarNotificacionPush(titulo, cuerpo) {
  self.registration.showNotification(titulo, {
    body: cuerpo,
    icon: 'https://lh3.googleusercontent.com/d/1wNGmdjjRdJsbZfCh_c86XwbQItnNk5zC',
    badge: 'https://lh3.googleusercontent.com/d/1wNGmdjjRdJsbZfCh_c86XwbQItnNk5zC',
    tag: 'alerta-diaria-acreimex',
    renotify: true
  });
}