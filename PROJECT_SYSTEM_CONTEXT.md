MASTER MANIFEST: Vínculo Pasivo (HCI Ecosystem)
1. Visión y Filosofía de Diseño (HCI)
Problema: Brecha de comunicación y ansiedad en el cuidado remoto.

Enfoque: Tecnología Invisible y Ubicua. El sistema debe integrarse en la vida de Manuel (80 años, busca autonomía) sin ser invasivo, y en la de Laura (45 años, cuidadora ansiosa) como una interfaz ambiental.

Principio de Diseño: Evitar la estética médica. Usar materiales cálidos y feedback visual/sonoro sutil (Ambient Intelligence).

2. Personas y Escenarios
Manuel (User A): No usa smartphone. Resiste el control médico. Necesita recordatorios que parezcan hábitos, no alarmas.

Laura (User B): Hiperconectada pero saturada. Necesita "Paz Mental de un Vistazo" en lugar de datos crudos o llamadas de control.

3. Especificaciones Técnicas de Hardware (Kit Elegoo + R4 Minima)
Inventario Priorizado:
Controlador Principal: Arduino UNO R4 Minima (Procesamiento 32-bit).

Módulo de Comunicación: ESP32 (Como Bridge Wi-Fi para peticiones HTTP/JSON).

Sensores de Entrada:

HC-SR04 (Ultrasonido) x2: Para nivel de agua en vaso y detección de presencia en sofá.

Tilt Switch: Sensor de inclinación para el frasco de pastillas.

Push Buttons: Para el Tótem de Ritual de Manuel.

PIR (HC-SR501): Sensor de movimiento para actividad general en casa.

Actuadores de Salida:

LED RGB: Para el "Faro de Laura" (Feedback ambiental).

Passive Buzzer: Para alertas de sedentarismo en el Tótem.

LEDs Colores: Feedback local para Manuel.

4. Lógica de Módulos y Algoritmos
A. Módulo de Medicación (Doble Validación)
Lógica: Si tilt_sensor == HIGH (Frasco inclinado) AND ultrasonic_vaso detecta distancia > 10cm (Vaso levantado), disparar evento MEDICINA_TOMADA.

Technical Check: El sistema debe esperar un intervalo de 2 minutos para que ocurran ambas acciones. Si solo ocurre una, el estado en el backend pasa a INC_CONFIRMATION (Amarillo).

B. Módulo de Sedentarismo (Cojín Activo)
Lógica: Si ultrasonic_sofa detecta distancia < 40cm (Manuel sentado) por más de 3600 segundos (1 hora), activar buzzer con frecuencia de 440Hz (tono suave).

Feedback: Al levantarse, enviar ACTIVITY_UPDATE al backend para resetear el Faro de Laura a Verde.

C. El Tótem de Ritual
Interacción: Botón físico con INPUT_PULLUP. Al presionar, el LED RGB local parpadea en Azul y se envía un HTTP POST con el payload {"status": "well_being_confirmed"}.

5. Arquitectura de Software & Backend (NestJS)
Estructura del Backend:
Framework: NestJS (Modular).

API Endpoints:

POST /status/update: Recibe JSON del Arduino/ESP32.

GET /status: Consultas desde el Frontend (Next.js).

Data Structure (JSON):

JSON
{
  "sensor_id": "string",
  "value": "boolean/number",
  "module": "medication | activity | ritual",
  "timestamp": "ISO_Date"
}
Comunicación Real-Time:
Implementación de Socket.io en NestJS para empujar actualizaciones al Frontend de Laura sin necesidad de polling, asegurando que el Faro cambie de color instantáneamente.

--------------------------------------------------------------------------

Especificación Técnica por Caso de Uso (Capa Arduino)
Caso 1: Olvido de la medicación y preocupación a la distancia
Objetivo: Asegurar que Manuel tome su medicina sin alarmas invasivas y dar paz mental a Laura.

Hardware (Kit Elegoo): * Entrada: Tilt Ball Switch (en el frasco) + Sensor Ultrasónico HC-SR04 (bajo el vaso de agua).

Salida: LED Verde (en el Tótem de Manuel) + Petición HTTP (vía ESP32).

Lógica de Arduino:

Detectar cambio de estado en el Tilt Switch (frasco inclinado).

Iniciar ventana de espera de 2 minutos.

Validar si la distancia del ultrasónico aumenta (vaso levantado).

Acción: Si se cumplen ambos, enviar JSON { "medicina": "confirmada" }. Si solo se mueve el frasco, enviar JSON { "medicina": "incompleta" }.

Caso 2: Rutina sedentaria y diferentes puntos de vista
Objetivo: Fomentar el movimiento de Manuel sin usar métricas técnicas que lo presionen.

Hardware (Kit Elegoo):

Entrada: Sensor Ultrasónico HC-SR04 (colocado en el respaldo del sofá).

Salida: Passive Buzzer (en el Tótem de Manuel).

Lógica de Arduino:

Medir distancia constantemente. Si distancia < 50cm, Manuel está sentado.

Contador de tiempo: Si el estado se mantiene por > 1 hora (60 min).

Acción: El Buzzer emite una frecuencia suave (440Hz - Nota La) por 2 segundos. Al detectar distancia > 50cm (Manuel se levantó), enviar JSON { "actividad": "activo" } para resetear el Faro de Laura.

Caso 3: Falta de respuesta y angustia por la distancia
Objetivo: Confirmar que Manuel está bien a través de su actividad normal, sin llamadas invasivas.

Hardware (Kit Elegoo):

Entrada: Sensor PIR (Movimiento) colocado en la zona común (cocina o sala).

Salida: Petición HTTP de "Heartbeat" constante.

Lógica de Arduino:

El PIR detecta movimiento.

Acción: Cada vez que hay un disparo del sensor, el Arduino actualiza una variable last_seen y envía al backend: JSON { "status": "actividad_detectada", "ubicación": "sala" }. Laura verá en su app: "Papá estuvo activo hace 5 min".

Caso 4: Alimentación cotidiana no visible para Laura
Objetivo: Inferir hábitos alimenticios mediante el uso de espacios.

Hardware (Kit Elegoo):

Entrada: Tilt Ball Switch o Photoresistor (LDR) pegado en la puerta de la nevera/alacena.

Lógica de Arduino:

Si se usa el LDR: Detectar aumento de luz (puerta abierta).

Si se usa el Tilt Switch: Detectar inclinación de la puerta al abrirse.

Acción: Registrar hora y duración de apertura. Enviar JSON { "alimentacion": "nevera_abierta", "duracion": seg }. Laura recibe una métrica de "Diversidad/Frecuencia" basada en estos eventos.

Caso 5: Resistencia al uso de dispositivos de control médico
Objetivo: Eliminar la estética clínica y usar materiales y sensores invisibles.

Hardware (Kit Elegoo):

Interfaz: Botón Pulsador grande integrado en el "Tótem de Ritual" (madera/textil).

Feedback: Anillo de LEDs o LED RGB (difuminado bajo el material).

Lógica de Arduino:

Lectura de Boton con INPUT_PULLUP.

Acción: Al presionar, el LED RGB brilla en un color cálido (Naranja/Amarillo) por 3 segundos. Envía JSON { "ritual": "bienestar_confirmado" }. No se piden datos médicos, solo señales de "estoy bien".

Caso 6: Confusión sobre dosis ya tomada (Riesgo de duplicación)
Objetivo: Dar una respuesta física inmediata a la duda de Manuel.

Hardware (Kit Elegoo):

Feedback Local: Un LED Rojo y un LED Verde colocados cerca del frasco de medicina.

Lógica de Arduino:

El Arduino mantiene un estado interno is_taken = false cada 24 horas.

Si Manuel intenta mover el frasco (Tilt Switch) y is_taken == true.

Acción: Encender LED Rojo y sonar el Buzzer con un tono de advertencia. Si Manuel pregunta por voz (si implementas el mic), el sistema responde que ya la tomó. Al final del día, el estado se resetea.

Caso 7: Confirmación incompleta y falsa tranquilidad
Objetivo: Validar acciones con múltiples evidencias antes de informar a Laura.

Hardware (Kit Elegoo):

Entradas: Combinación de sensores de los Casos 1 y 4.

Lógica de Arduino (Multi-evidencia):

Para marcar un "Check" total, el Arduino requiere: Movimiento PIR + Apertura Nevera + Botón Tótem.

Acción: Si solo ocurre uno, el backend recibe un estado de "Certeza Baja". Si ocurren los tres, envía JSON { "certeza": "alta", "estado": "rutina_completada" }.

--------------------------------------------------------------------------

# Project Manifest: Vínculo Pasivo (HCI University Project)

## Context
- **Users:** Manuel (Elderly, values autonomy) and Laura (Caregiver, high anxiety).
- **Goal:** Remote monitoring using "Invisible Technology" to respect privacy.

## Architecture
- **Hardware:** Arduino UNO R4 Minima / ESP32.
- **Backend:** NestJS (Strictly separated).
- **Frontend:** Next.js (App for Laura).

## Hardware & Logic
1. **Medication Module:** Double validation (Tilt/Button on bottle + Ultrasonic sensor on water glass). 
2. **Sedentary Module (Cojín Activo):** Ultrasonic sensor (HC-SR04) on couch + Passive Buzzer for soft alerts.
3. **The Totem (Manuel):** Physical button for "I'm okay" signals.
4. **The Lighthouse (Laura):** Ambient RGB LED reflecting status (Green/Yellow/Red).

## Technical Requirements
- Arduino communicates with NestJS via HTTP POST (JSON).
- NestJS serves data to Next.js (Planned: WebSockets for real-time).
- Design Style: Minimalist, Corporate Blue & Orange (Canva-inspired).