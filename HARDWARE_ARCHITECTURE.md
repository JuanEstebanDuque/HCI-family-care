# Arquitectura de Hardware: Sistema de Sensores HCI

Este documento explica cómo funciona el cerebro físico del proyecto "Vínculo Pasivo" y la lógica implementada en el código principal (`arduino_device.ino`).

## 1. Topología del Hardware
El proyecto usa una topología de "Cerebro Central + Puente de Red":

*   **Arduino UNO R4 Minima (Cerebro):** Se encarga exclusivamente de leer los sensores a altísima velocidad, manejar las interrupciones, calcular los temporizadores de inactividad y estructurar los datos. Al carecer de antena Wi-Fi, envía la información procesada a través de su puerto USB/Serial (`TX`/`RX`).
*   **ESP32 (Puente de Red):** Actúa como esclavo. Escucha permanentemente el cable Serial que viene del Arduino. Cuando lee un paquete JSON válido, abre una conexión Wi-Fi y hace un `HTTP POST` hacia nuestro servidor NestJS.

---

## 2. Funcionamiento Lógico por Módulos (El Código INO)

El archivo `arduino_device.ino` es un monolito que corre a miles de ciclos por segundo (`loop()`). En cada vuelta evalúa el estado del anciano basándose en estos sensores:

### Módulo de Medicación (Casos 1 y 6)
*   **Componentes:** Tilt Switch (en el frasco) + Sensor Ultrasónico (bajo el vaso).
*   **Lógica:** Usamos `attachInterrupt()` en el pin del Tilt Switch. Cuando Manuel inclina el frasco, el procesador detiene lo que esté haciendo e inicia un cronómetro interno (`pendingGlassCheck`). Si dentro de 2 minutos el sensor ultrasónico detecta que el vaso de agua fue levantado (>10cm), marca un éxito.
*   **Prevención de Duplicación:** Si Manuel vuelve a inclinar el frasco más tarde ese mismo día, el código lo sabe (porque no ha pasado el `RESET_TIME_MS` de 24 horas) y no graba el evento; en su lugar enciende un LED rojo de advertencia local y manda una alerta al backend.

### Módulo de Sedentarismo (Caso 2)
*   **Componentes:** Sensor Ultrasónico (en el sofá) + Buzzer Pasivo.
*   **Lógica:** A diferencia del Delay tradicional que paraliza el Arduino, usamos la función no-bloqueante `millis()` para contar milisegundos en segundo plano. Si el ultrasónico detecta `< 50cm` ininterrumpidamente por 1 hora (`3600000UL`), emite un pitido muy suave (Nota "La" a 440Hz) por 2 segundos. Cuando la persona se levanta, envía el evento de "Resumed Activity" para calmar la App de Laura.

### Módulo de Presencia y Alimentación (Casos 3 y 4)
*   **Componentes:** Sensor PIR (Sala) + LDR / Fotorresistencia (Nevera).
*   **Lógica:** El PIR funciona como un gatillo binario de latidos (Heartbeat). Cada vez que hay movimiento envía un ping al servidor. La fotorresistencia en la nevera detecta picos de luz (puerta abierta); cuando se cierra, el Arduino calcula internamente cuántos segundos estuvo abierta y manda esa duración empaquetada.

### Módulo "El Tótem" (Caso 5)
*   **Componentes:** Push Button + LED RGB.
*   **Lógica:** Diseñado para la "autonomía pasiva". Es un botón en resistencia Pull-Up. Al presionarse, el código inyecta por PWM un color Naranja/Cálido al LED RGB durante 3 segundos para confirmar que el mensaje "Estoy Bien" fue enviado con éxito sin pantallas ni interfaces clínicas.

---

## 3. Formateo de Salida (JSON Serializado)
Para no saturar al ESP32 con la creación de diccionarios pesados, el Arduino ensambla cadenas de texto en formato JSON purista. Ejemplo de la función interna:
```cpp
// Salida cruda por el Monitor Serie hacia el ESP32
{"token": "CASA10", "modulo": "MEDICACION", "data": {"estado": "CONFIRMADO"}}
```
*(Para consultar exactamente qué pin físico usar para armar los componentes en la protoboard, revisar el archivo `CIRCUIT_CONNECTIONS.md`).*
