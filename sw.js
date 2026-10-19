// sw.js - Prueba de Alerta Programada a las 12:00 PM
const CACHE_NAME = 'acreimex-pwa-v4';
const SHEET_ID = "181BS2rGdsPnDLOBob3sZ5DghSTo4IQeF";
const GID = "1166317926";

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Recibir orden desde el HTML para programar la prueba
self.addEventListener('message', (event) => {
  if (event.data && (event.data.action === 'PROGRAMAR_PRUEBA_1200' || event.data.action === 'PROGRAMAR_PRUEBA_1000' || event.data.action === 'PROGRAMAR_PRUEBA_1230')) {
    programarAlerta1200();
  }
});

function programarAlerta1200() {
  const ahora = new Date();
  const objetivo = new Date();
  
  // Fijar hora objetivo: 12:00:00 PM de hoy
  objetivo.setHours(12, 0, 0, 0);

  let milisegundosFaltantes = objetivo.getTime() - ahora.getTime();

  // Si ya pasaron las 12:00 PM, se dispara en 5 segundos como prueba
  if (milisegundosFaltantes <= 0) {
    milisegundosFaltantes = 5000;
  }

  console.log(`Prueba programada a las 12:00 PM. Se ejecutará en ${Math.round(milisegundosFaltantes / 1000)} segundos.`);

  setTimeout(() => {
    evaluarYNotificarCreditos();
  }, milisegundosFaltantes);
}

// Consultar Google Sheets y lanzar la notificación emergente
async function evaluarYNotificarCreditos() {
  try {
    const response = await fetch(`https://docs.google.com/spreadsheets/d/${SHEET_ID}/gviz/tq?tqx=out:json&gid=${GID}`);
    const text = await response.text();
    
    const jsonString = text.substring(text.indexOf('{'), text.lastIndexOf('}') + 1);
    const data = JSON.parse(jsonString);
    
    const rows = data.table.rows;
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    let alertasContador = 0;

    rows.forEach(r => {
      if (!r.c) return;
      
      const ingresoCell = r.c[4] ? (r.c[4].f || r.c[4].v) : null;
      const destinoRaw = r.c[31] ? String(r.c[31].v).toUpperCase() : (r.c[30] ? String(r.c[30].v).toUpperCase() : '');
      
      if (ingresoCell) {
        const fechaIngreso = parseFecha(ingresoCell);
        if (fechaIngreso) {
          fechaIngreso.setHours(0, 0, 0, 0);
          const diasTranscurridos = Math.floor((today - fechaIngreso) / (1000 * 60 * 60 * 24));
          
          let diaAlerta = 25;
          if (destinoRaw.includes('PROMOCIÓN') || destinoRaw.includes('PROMOCION')) {
            diaAlerta = 10;
          }

          if (diasTranscurridos >= diaAlerta) {
            alertasContador++;
          }
        }
      }
    });

    // Lanza la alerta flotante del sistema
    self.registration.showNotification("🚨 PRUEBA ACREIMEX (12:00 PM)", {
      body: `¡Alerta de prueba de las 12:00 PM! Hay ${alertasContador} crédito(s) pendientes de comprobación (Día 10 o Día 25). Toca aquí para ingresar.`,
      icon: "https://lh3.googleusercontent.com/d/1wNGmdjjRdJsbZfCh_c86XwbQItnNk5zC",
      badge: "https://lh3.googleusercontent.com/d/1wNGmdjjRdJsbZfCh_c86XwbQItnNk5zC",
      tag: "alerta-prueba-1200",
      requireInteraction: true, // No desaparece hasta que la toques
      vibrate: [300, 100, 300, 100, 300]
    });
  } catch (err) {
    console.error("Error al evaluar créditos a las 12:00 PM:", err);
  }
}

function parseFecha(strVal) {
  if (!strVal) return null;
  const str = String(strVal).trim();
  const gvizMatch = str.match(/Date\((\d+),(\d+),(\d+)\)/);
  if (gvizMatch) return new Date(parseInt(gvizMatch[1]), parseInt(gvizMatch[2]), parseInt(gvizMatch[3]));
  
  const match = str.match(/^(\d{1,2})[\/-](\d{1,2})[\/-](\d{4})$/);
  if (match) return new Date(parseInt(match[3]), parseInt(match[2]) - 1, parseInt(match[1]));
  
  const parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

// Clic en la notificación abre la PWA
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (client.url && 'focus' in client) {
          return client.focus();
        }
      }
      if (clients.openWindow) {
        return clients.openWindow('./');
      }
    })
  );
});
