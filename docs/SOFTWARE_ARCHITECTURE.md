# Arquitectura de Software: Integración Full-Stack

Este documento describe el ecosistema de red, bases de datos y la comunicación entre los microservicios que le dan vida al Vínculo Pasivo entre Manuel y Laura.

## 1. El Puente (El Rol del ESP8266 / Bridge)
El hardware se comunica con el mundo a través de un intermediario. El módulo Wi-Fi ESP8266 solo tiene un trabajo:
1. Leer el objeto JSON enviado por el Arduino vía Serial.
2. Hacer un `HTTP POST` apuntando a la IP pública (o dominio de Vercel/Render) donde vive NestJS bajo el endpoint: `/events/arduino`.

---

## 2. El Backend (NestJS + MongoDB Atlas)
El servidor fue estructurado con un **Diseño Relacional en base NoSQL (Mongoose)**, lo que garantiza máxima seguridad de datos cruzados sin comprometer la velocidad.

### Autenticación Invisible (El Token)
Manuel no tiene usuario ni contraseña. Cuando Laura abre la App y le crea un perfil a su padre, NestJS le asigna un `pin_vinculacion` (Ej. `CASA10`). Este es el **único** dato que debe conocer el hardware.
Cuando el backend recibe un evento del Arduino con el token `CASA10`, busca ese pin en la base de datos de usuarios (`UsersCollection`). Si hace match, saca el `ObjectId` secreto de Manuel y amarra el evento a su identidad sin que la red pública haya visto nombres ni datos sensibles.

### Estructura de Colecciones (MongoDB)
*   **`users`**: Almacena a Laura (rol `CAREGIVER`) y a Manuel (rol `ELDER`).
*   **`pairings`**: Una tabla de cruce que junta el `_id` de Laura con el `_id` de Manuel, diciéndole al sistema que Laura tiene permiso para ver los eventos de ese ELDER en particular.
*   **`events`**: El registro histórico e infinito. Guarda el `elder_id`, la Categoría (`MEDICACION`, `RITUAL`, etc.), la fecha en ISO (inyectada por el backend automáticamente) y el sub-documento `data` que el Arduino generó.

---

## 3. El Frontend (Next.js - "El Faro")
Next.js es la interfaz móvil o web que usará Laura. Funciona como un consumidor puro de la API.

### Flujo de Renderizado
1. **Login de Laura**: Se loguea y el sistema reconoce su `caregiver_id`.
2. **Obtención de Vínculos**: Next.js le pregunta a NestJS (`GET /pairings` filtrando por Laura). NestJS le responde: *"Cuidas de Manuel con ID X"*.
3. **Consumo de Estados**: Next.js llama al endpoint maestro de NestJS: `GET /events/elder/{id_de_manuel}`.
4. **Respuesta Rápida**: NestJS le devuelve el array ordenado de todos los eventos más recientes que ha sufrido ese anciano.

### Reactividad de la Interfaz (UI)
En base a la respuesta, el Next.js de Laura modifica su interfaz "Ambiental":
*   Si el último evento dice `{"modulo": "RITUAL", "data": {"mensaje": "ESTOY_BIEN"}}`, la tarjeta del dashboard de Laura brilla de color verde inmediatamente.
*   Si el último evento dice `{"modulo": "SEDENTARISMO", "data": {"estado": "ALERTA"}}`, el dashboard en Next.js cambiará suavemente a tonos naranjas, indicándole de reojo a Laura que su padre no se ha movido del sofá en horas, sugiriéndole echarle una llamada sin usar la palabra "peligro" ni alarmas médicas ruidosas.

### Siguientes Pasos de Integración: WebSockets (Opcional)
Para que Next.js no tenga que estar haciendo polling (preguntando a NestJS cada 5 segundos si pasó algo nuevo), el backend de NestJS está listo para escalar a `Socket.io`. Así, en el microsegundo exacto que NestJS guarde el dato en MongoDB Atlas, "empujará" ese mismo JSON hacia Next.js por un túnel, cambiando los colores del celular de Laura en riguroso tiempo real físico.
