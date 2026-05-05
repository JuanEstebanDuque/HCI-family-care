# Limitantes del proyecto HCI (estado actual)

Este documento describe **qué no hace**, **qué no garantiza** y **qué riesgos asume** el sistema **tal como está hoy** en el repositorio `hci-backend` (firmware Arduino, `bluetooth-bridge.js` y API NestJS). Sirve para informes académicos, handover y decisiones de producto.

---

## 1. Alcance funcional incompleto

| Limitante | Descripción |
|-----------|-------------|
| **Frontend fuera del repo** | La aplicación para la cuidadora (p. ej. Next.js) no forma parte de este repositorio; el “producto completo” no es desplegable ni versionable como un solo monorepo desde aquí. |
| **Sin cliente móvil/publicado** | No hay binario en tiendas ni PWA empaquetada vinculada a este código base. |
| **Pruebas e2e del camino físico** | No hay automatización que cubra Arduino → Bluetooth → bridge → API; la validación de ese trayecto es **manual**. |

---

## 2. Comunicación hardware y dependencia del entorno

| Limitante | Descripción |
|-----------|-------------|
| **PC obligatoria para el enlace actual** | Los eventos del Arduino llegan al backend pasando por **`bluetooth-bridge.js`** en un ordenador con Windows (u otro SO) y puerto **COM**; sin PC encendida y bridge ejecutándose, **no hay ingesta** de eventos vía Bluetooth. |
| **No hay camino Wi‑Fi embebido activo** | La documentación menciona ESP8266; en el flujo implementado **no** existe un módulo en el hogar que publique solo con alimentación eléctrica a internet. |
| **Exclusividad del puerto serie** | El mismo COM no puede usarse a la vez por el Monitor Serie del IDE, PuTTY y el bridge: **un solo proceso** a la vez. |
| **Alcance y fiabilidad Bluetooth** | Clase 2 típica (~10 m), obstáculos, interferencias; desconexiones silenciosas si no hay reconexión supervisada en el bridge. |
| **Baudios distintos** | `Serial` (USB) a 115200 y `Serial1` (HC‑05) a 9600: documentación y soporte deben ser explícitos para evitar errores de configuración. |

---

## 3. Recordatorios hacia el Arduino

| Limitante | Descripción |
|-----------|-------------|
| **`localhost` fijo** | `RemindersService` invoca `http://localhost:3001/notify`. Si NestJS corre en otra máquina, contenedor sin `host` network, o en la nube **sin** un agente local, **no** se entregarán comandos al HC‑05. |
| **Acoplamiento al bridge** | La lógica de negocio del servidor asume que **siempre** existe el proceso Node del bridge en la misma red lógica que “localhost”. |
| **Resolución temporal** | La comparación de hora usa la **zona horaria del proceso Node**; no hay campo explícito de zona por usuario ni por hogar. |
| **Un marcador global por minuto** | `lastTriggeredMinute` evita re-disparos en el mismo minuto; el diseño actual puede **no cubrir** todos los casos de varias notificaciones independientes en el mismo `HH:mm` según evolución futura del código. |

---

## 4. Seguridad y privacidad

| Limitante | Descripción |
|-----------|-------------|
| **API sin capa de autorización global** | No hay guards JWT (u otro) aplicados de forma uniforme a los controladores: quien conozca la URL puede intentar **GET/POST** (dependiendo de exposición en red). |
| **CORS abierto** | `main.ts` usa `origin: '*'`, adecuado para desarrollo; en producción **amplía superficie** de abuso desde sitios arbitrarios si el API es público. |
| **Token en firmware** | El PIN/token del anciano está **literal en el `.ino`**; cualquiera con acceso al código o al dispositivo puede enviar eventos falsos si el backend solo valida ese token. |
| **Login simplificado** | `UsersService.login` compara credenciales de forma directa sobre el modelo; **no** refleja un esquema de hash seguro (bcrypt/Argon2) ni tokens de sesión en la respuesta según estándar OAuth/OpenID. |
| **Cadena de conexión a MongoDB** | La URI con credenciales está **incrustada** en `AppModule`; riesgo de filtración si el repo es público o se comparte, y dificulta rotación de secretos sin cambiar código. |

---

## 5. Consistencia de datos y contrato API

| Limitante | Descripción |
|-----------|-------------|
| **`data` sin esquema rígido** | Los eventos guardan `data: any`; no hay validación fuerte con class-validator en el POST Arduino: payloads malformados o campos inesperados pueden **romper** lógica del front o de analytics si asumen estructura fija. |
| **Semántica de `modulo` vs sensores** | Parte de la lógica de negocio (p. ej. sedentarismo) depende de **`sensor_id` y `estado`**, no solo del enum `modulo`; los consumidores que solo lean `modulo` obtendrán **vistas incompletas**. |
| **Parámetro `elderId` en analytics** | Las rutas `/analytics/.../:elderId` resuelven por **PIN** (`findByPin`), no por ObjectId de MongoDB; es una **limitación de claridad del contrato**, no un bug de runtime, pero provoca errores de integración. |
| **`Reminder.elder_id` vs `Medication.elder_id`** | Uno es `string`, el otro `ObjectId`: consultas cruzadas y tipado en front son **más frágiles**. |
| **Rutas dinámicas en `UsersController`** | Conviven `GET :id`, `GET :email`, etc.; riesgo de **ambigüedad** según orden de registro de rutas. |

---

## 6. Hardware y sensores (precisión y mantenimiento)

| Limitante | Descripción |
|-----------|-------------|
| **No calibración por usuario final** | Umbrales (sofá, nevera, pasos, vibración) están **fijos en código**; cada hogar requiere recompilar o retocar constantes para un ajuste fino. |
| **RTC no operativo en firmware** | Pines DS1302 definidos; la librería RTC está comentada: la **hora civil** del dispositivo no gobierna lógica de negocio en el Arduino. |
| **Potenciómetro sin uso** | Declarado; no participa en el `loop` actual. |
| **Calibración PIR bloqueante** | ~30 s al inicio en los que el resto del sistema no avanza: limitante para demos rápidas y para reinicios en campo. |
| **`delay()` en el `loop`** | En varios flujos se usa `delay`, lo que **congela** lectura de sensores y Bluetooth durante ese intervalo. |
| **Fiabilidad médica nula** | El sistema es **prototipo / acompañamiento**; no está validado como dispositivo médico ni como monitor clínico de signos vitales. |

---

## 7. Escalabilidad, disponibilidad y despliegue

| Limitante | Descripción |
|-----------|-------------|
| **Un bridge por COM** | Un solo flujo serie típico ⇒ un hogar / un laboratorio por instancia de bridge sin rediseño (multiplexión, colas, etc.). |
| **Sin alta disponibilidad** | No hay réplicas, balanceo ni cola persistente de eventos si Mongo o Nest caen: **pérdida** de telemetría durante la caída. |
| **Sin reintentos explícitos en firmware** | Si `Serial1.println` falla por buffer lleno o desconexión, **no** hay cola offline en EEPROM/SD en el código actual. |
| **Despliegue “solo API” incompleto** | Subir NestJS a la nube **no** activa notificaciones al Arduino ni ingesta Bluetooth sin componentes adicionales en el hogar. |

---

## 8. Observabilidad y operación

| Limitante | Descripción |
|-----------|-------------|
| **Logging heterogéneo** | Arduino por Serial, bridge por `console.log`, Nest por logger: **no** hay trazas correlacionadas (trace-id) de extremo a extremo. |
| **Sin panel de salud** | No hay endpoint tipo `/health` documentado en el alcance habitual ni métricas Prometheus listas para producción. |

---

## 9. Legal, ética y uso

| Limitante | Descripción |
|-----------|-------------|
| **Vigilancia y consentimiento** | El sistema registra comportamiento en el hogar; su uso real exige **consentimiento informado**, política de datos y límites legales (RGPD, leyes locales de salud/datos) **no implementados** en software aquí. |
| **Falsos positivos/negativos** | Decisiones de la cuidadora basadas solo en sensores pueden ser **incorrectas**; el diseño no sustituye contacto humano ni juicio clínico. |

---

## 10. Resumen ejecutivo

En el estado actual, el proyecto es un **prototipo integrado** útil para demostración y desarrollo, con **fuerte dependencia de una PC local**, **contratos API ambiguos en puntos clave**, **seguridad de desarrollo** (CORS abierto, sin auth uniforme, secretos en código) y **hardware no homologable** sin trabajo adicional. Cualquier uso fuera de laboratorio o curso debería planear explícitamente la mitigación de estas limitantes.

---

*Documento alineado con el código y documentación existentes en el repo; actualizar si cambia la arquitectura (Wi‑Fi, auth, env vars, etc.).*
