// sw.js - Alertas automáticas programadas de 10:00 AM a 11:00 AM
const CACHE_NAME = 'acreimex-pwa-v10';
const SHEET_ID = "181BS2rGdsPnDLOBob3sZ5DghSTo4IQeF";
const GID = "1166317926";

self.addEventListener('install', (e) => {
  self.skipWaiting();
});

self.addEventListener('activate', (e) => {
  e.waitUntil(clients.claim());
});

// Recibir orden desde el HTML para programar o ejecutar
self.addEventListener('message', (event) => {
  if (event.data && (
    event.data.action === 'PROGRAMAR_PRUEBA_1000' || 
    event.data.action === 'PROGRAMAR_PRUEBA_1200' || 
    event.data.action === 'CHECK_NOW'
  )) {
    verificarYProgramarVentanaMatutina();
  }
});

// Sincronización en segundo plano nativa de la PWA
self.addEventListener('periodicsync', (event) => {
  if (event.tag === 'check-creditos-vencidos') {
    event.waitUntil(evaluarVentanaMatutinaYNotificar());
  }
});

async function evaluarVentanaMatutinaYNotificar() {
  const ahora = new Date();
  const hora = ahora.getHours();

  // Rango de 10:00 AM a 11:00 AM
  if (hora >= 10 && hora < 11) {
    await evaluarYNotificarCreditos();
  }
}

function verificarYProgramarVentanaMatutina() {
  const ahora = new Date();
  const objetivo = new Date();
  
  // Fijar hora objetivo: 10:00:00 AM de hoy
  objetivo.setHours(10, 0, 0, 0);

  let msFaltantes = objetivo.getTime() - ahora.getTime();

  // Si ya pasaron las 10:00 AM hoy, ejecuta a los 5 segundos para pruebas
  if (msFaltantes <= 0) {
    msFaltantes = 5000;
  }

  console.log(`Próxima alerta programada para las 10:00 AM. Se ejecutará en ${Math.round(msFaltantes / 1000)} segundos.`);

  setTimeout(() => {
    evaluarYNotificarCreditos();
  }, msFaltantes);
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

    if (alertasContador > 0) {
      // Formatear el número con comas si es mayor a 999 (ej. 1,678)
      const numeroFormateado = alertasContador.toLocaleString('es-MX');

      self.registration.showNotification("⚠️ ACREIMEX: Comprobaciones Pendientes", {
        body: `ATENCIÓN: Hay ${numeroFormateado} crédito(s) pendientes por comprobar que alcanzaron su día límite de revisión.\n\n👉 Toca aquí para ingresar y revisar.`,
        icon: "https://lh3.googleusercontent.com/d/1wNGmdjjRdJsbZfCh_c86XwbQItnNk5zC",
        badge: "https://lh3.googleusercontent.com/d/1wNGmdjjRdJsbZfCh_c86XwbQItnNk5zC",
        tag: "alerta-matutina-10am",
        requireInteraction: true,
        vibrate: [300, 100, 300, 100, 300]
      });
    }
  } catch (err) {
    console.error("Error al evaluar créditos a las 10:00 AM:", err);
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

// Clic en la notificación abre la PWA directamente
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
