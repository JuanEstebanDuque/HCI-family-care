# Guía de Conexión del Circuito: Vínculo Pasivo (HCI)

Esta guía detalla paso a paso cómo ensamblar tu prototipo basado en el archivo `arduino_device.ino`. Como controlador central utilizaremos la placa **Arduino UNO R4 Minima** y un **ESP32** para actuar como puente Wi-Fi.

## ⚠️ Consideraciones de Energía
Dado que conectarás muchos sensores, es altamente recomendable usar una **protoboard (breadboard)** grande. 
1. Conecta el pin `5V` del Arduino a la línea de alimentación positiva (roja) de la protoboard.
2. Conecta un pin `GND` del Arduino a la línea de tierra negativa (azul/negra) de la protoboard.
3. Alimenta todos los sensores desde las líneas de la protoboard.

---

## Módulo 1: Comunicación (Arduino ↔️ ESP32)
El Arduino no tiene Wi-Fi de fábrica. Le enviará los datos en formato JSON al ESP32 utilizando sus puertos Seriales (RX/TX UART).

* **Arduino `TX` (Pin 1)** ➔ conecta a ➔ **ESP32 `RX` (Pin 16 o RX2)**.
* **Arduino `RX` (Pin 0)** ➔ conecta a ➔ **ESP32 `TX` (Pin 17 o TX2)**.
* **IMPORTANTE**: Asegúrate de que el **Arduino `GND`** y el **ESP32 `GND`** estén conectados entre sí (GND común). De lo contrario, la comunicación Serial arrojará basura.

*(El ESP32 deberá tener un de código cargado que lea el Serial y utilice `HTTPClient` para enviar un POST al NestJS)*.

---

## Módulo 2: Medicación y Duplicación (Caso 1 y 6)

### Sensor Tilt Switch (Frasco de pastillas)
1. Conecta una pata del Tilt Switch al **GND**.
2. Conecta la otra pata al **Pin Digital 2** del Arduino.
*(Nota: Usamos lógica de `INPUT_PULLUP` en el código. No necesitas resistencia extra. La interrupción se dispara cuando hace tierra)*.

### LED Rojo de Advertencia (Sobredosis / Duplicación)
1. Conecta el ánodo del LED (la pata larga) al **Pin Digital 9** del Arduino.
2. Conecta el cátodo (pata corta) a una **resistencia de 220Ω o 330Ω**, y el otro extremo de la resistencia a **GND**.

### Sensor Ultrasónico 1 (Bajo el vaso de agua)
1. `VCC` ➔ Línea de **5V** de la protoboard.
2. `GND` ➔ Línea de **GND** de la protoboard.
3. `TRIG` ➔ **Pin Digital 6** del Arduino.
4. `ECHO` ➔ **Pin Digital 7** del Arduino.

---

## Módulo 3: Cojín Activo y Sedentarismo (Caso 2)

### Sensor Ultrasónico 2 (Respaldo del sofá)
1. `VCC` ➔ Línea de **5V** de la protoboard.
2. `GND` ➔ Línea de **GND** de la protoboard.
3. `TRIG` ➔ **Pin Digital 4** del Arduino.
4. `ECHO` ➔ **Pin Digital 5** del Arduino.

### Buzzer Pasivo (Alarma suave en el Tótem)
1. Pata positiva `+` ➔ **Pin Digital 8** del Arduino.
2. Pata negativa `-` ➔ **GND**.

---

## Módulo 4: Heartbeat de Actividad (Caso 3)

### Sensor de Movimiento (PIR HC-SR501)
1. `VCC` ➔ Línea de **5V** de la protoboard.
2. `GND` ➔ Línea de **GND** de la protoboard.
3. `OUT` o `DATA` ➔ **Pin Digital 3** del Arduino.

*(Nota: Usa los potenciómetros naranjas del sensor módulo PIR para ajustar la sensibilidad y el tiempo de delay físico para que no sature el código con micro-reacciones)*.

---

## Módulo 5: Hábitos de Alimentación (Caso 4)

### Fotorresistencia (LDR - Puerta de la Nevera)
Para usar un LDR debes crear un circuito "Divisor de Tensión" o "Divisor de Voltaje".
1. Conecta una pata del LDR a **5V**.
2. Conecta la otra pata del LDR al **Pin Analógico A0** del Arduino.
3. Conecta **esa misma pata (la conectada a A0)** a una pata de una **resistencia de 10kΩ**.
4. Conecta la otra pata de la resistencia de 10kΩ a **GND**.

---

## Módulo 6: Tótem de Bienestar (Caso 5)

### Botón Físico (Push Button Arcade/Grande)
1. Conecta una pata del botón a **GND**.
2. Conecta la otra pata del botón al **Pin Digital 10** del Arduino.
*(Nota: Al igual que el Tilt, usamos `INPUT_PULLUP`, no requiere resistores pull-down físicos)*.

### LED RGB (Retroiluminación del Tótem)
Asumiendo un LED RGB Cátodo Común (La pata más larga es el GND):
1. Pata más larga ➔ A **GND**.
2. Pata de Color Rojo (R) ➔ **Resistencia de 220Ω** ➔ **Pin Digital 11** (Soporta PWM).
3. Pata de Color Verde (G) ➔ **Resistencia de 220Ω** ➔ **Pin Digital 12**.
4. Pata de Color Azul (B) ➔ **Resistencia de 220Ω** ➔ **Pin Digital 13**.
*(Nota: Si es un LED de Ánodo común, conecta la pata larga a 5V en vez de GND, y habría que invertir la lógica de `analogWrite` en el código Arduino: `analogWrite(pin, 255 - valor)`.)*
