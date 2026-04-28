const { SerialPort } = require('serialport');
const { ReadlineParser } = require('@serialport/parser-readline');
const axios = require('axios');

// ==========================================
// CONFIGURACIÓN (¡CÁMBIA ESTO SEGÚN TU PC!)
// ==========================================
const BLUETOOTH_COM_PORT = 'COM7'; // <-- Reemplaza por tu puerto COM real
const BAUDRATE = 9600;             // Debe coincidir con Serial1.begin(9600) de tu Arduino
const BACKEND_URL = 'http://localhost:3000/events/arduino';

console.log(`\n========================================`);
console.log(`🤖 INICIANDO PUENTE BLUETOOTH -> NESTJS`);
console.log(`========================================\n`);
console.log(`Intentando conectar al Arduino en ${BLUETOOTH_COM_PORT} a ${BAUDRATE} baudios...`);

const port = new SerialPort({
  path: BLUETOOTH_COM_PORT,
  baudRate: BAUDRATE,
  autoOpen: false,
});

const parser = port.pipe(new ReadlineParser({ delimiter: '\n' }));

// Abrir puerto manualmente para capturar errores
port.open(function (err) {
  if (err) {
    console.error(`❌ ERROR DE BLUETOOTH: No se pudo abrir ${BLUETOOTH_COM_PORT}.`);
    console.error(`- Verifica que el HC-05 esté emparejado a la PC.`);
    console.error(`- Verifica que nadie más (ni el Monitor Serie de Arduino IDE) esté usando este puerto.`);
    console.error(`Detalle del error: ${err.message}`);
    process.exit(1);
  }
});

port.on('open', () => {
  console.log(`✅ ¡Conexión Bluetooth Exitosa en ${BLUETOOTH_COM_PORT}!`);
  console.log(`📡 Esperando datos de Manuel (Arduino HC-05)...\n`);
});

// Evento que se dispara cada vez que el Arduino manda un "Serial1.println(jsonPayload)"
parser.on('data', async (data) => {
  const cleanData = data.trim();
  if (!cleanData) return;

  console.log(`[HC-05 RECIBIDO] ${cleanData}`);

  try {
    // Intentar convertir a JSON para validar que es un dato válido del proyecto
    const payload = JSON.parse(cleanData);

    // Mapear los módulos del Arduino a los Enums exactos del Backend NestJS
    const moduloMap = {
      'activity': 'ACTIVIDAD',
      'medication': 'MEDICACION',
      'ritual': 'RITUAL',
      'baston': 'ACTIVIDAD' // El bastón cuenta como actividad física
    };

    if (payload.modulo && moduloMap[payload.modulo.toLowerCase()]) {
      payload.modulo = moduloMap[payload.modulo.toLowerCase()];
    }

    if (payload.token) {
      console.log(`🌍 Reenviando evento del módulo "${payload.modulo}" a la Base de Datos...`);

      // Enviar a nuestro backend NestJS local
      const response = await axios.post(BACKEND_URL, payload);
      console.log(`✅ Evento guardado correctamente: Status ${response.status}\n`);
    } else {
      console.log(`⚠️ Mensaje ignorado: No tiene el formato de Token esperado.\n`);
    }

  } catch (error) {
    // Ignorar logs normales del Serial.print que no sean JSON
    if (cleanData.startsWith('---') || cleanData.startsWith('WIFI') || cleanData.startsWith('!')) {
      // Es un mensaje de texto normal de depuración
      return;
    }
    console.error(`❌ ERROR: No se pudo enviar el dato a la BD. ¿Está encendido NestJS?`);
    console.error(`Detalle: ${error.message}\n`);
  }
});

port.on('error', (err) => {
  console.error(`❌ Error en el puerto serial:`, err.message);
});
