# Guía de Conexión del Circuito (HCI)

¡Bienvenido a la guía de ensamblaje! Aquí armaremos tu prototipo usando la placa **Arduino UNO R4 Minima** como el "Cerebro Central" de los sensores, y el pequeño módulo **ESP8266 (ESP-01) con su Adaptador** como la "Antena Wi-Fi" que manda los datos a internet.

## ⚠️ Lo Básico de la Protoboard
El Arduino opera a **5V**. Afortunadamente, como usarás el Adaptador del ESP8266 rojo, este ya se encarga de regular la energía automáticamente, por lo que conectar todo será facilísimo:
1. Conecta el pin `5V` del Arduino a la línea ROJA (+) de tu protoboard.
2. Conecta el pin `GND` (Tierra) del Arduino a la línea AZUL/NEGRA (-) de la protoboard.
3. **Todo** lo que armes tomará energía de estas dos líneas largas de colores.

---

## Módulo 1: Comunicación (La Antena Wi-Fi ESP8266)
Para armar de forma correcta este "sándwich" magnético:
1. Toma el cuadrito negro pequeño (El ESP-01) e insértalo en las 8 ranuras del Adaptador Rojo. **La flecha blanca impresa en el adaptador indica hacia dónde debe apuntar la antena dorada curvada** del ESP-01 (esa línea dorada en zig-zag que parece un laberinto). 
2. Encájalo firmemente en la protoboard.

Teniendo tus 9 patas disponibles a la vista, conéctalo al Arduino así:
1. Lado Derecho: Pata `5V` ➔ Línea **ROJA (5V)** de la protoboard. *(La placa usará esta energía y la bajará ella misma al 3V3 para no quemarse).*
2. Lado Izquierdo: Pata `GND` ➔ Línea **AZUL (GND)** de la protoboard.
3. Lado Derecho: Pata `EN` (Enable) ➔ Ponle un cablecito punteando hacia la pata `3V3` (en ese mismo lado) o a la línea ROJA de 5V. *(Esto es vital para "encender" el procesador de Wi-Fi y salir del modo reposo)*.
4. Lado Izquierdo: Pata `RX` ➔ Va conectada al pin **TX** (Pin 1) del Arduino.
5. Lado Derecho: Pata `TX` ➔ Va conectada al pin **RX** (Pin 0) del Arduino.

*(Nota: Fíjate que los cables RX y TX se cruzan, como si fueran la boca y el oído de dos personas platicando).*

---

## Módulo 2: Interfaz del Tótem (Bienestar y Estado)

### Pantalla LCD 1602 (I2C)
Mostraremos los mensajes como "Modo Sedentario detectado" o "Medicina Tomada" directamente acá en vez de depender solo del LED.
1. `VCC` ➔ Línea de **5V**.
2. `GND` ➔ Línea de **GND**.
3. `SDA` ➔ Pin **A4** (SDA) del Arduino R4.
4. `SCL` ➔ Pin **A5** (SCL) del Arduino R4.

### Módulo Touch (Para el ritual de "Estoy Bien" - Caso 5)
Sustituirá al botón pulsador normal, usando sensado táctil. Cuanto el abuelo lo toque, el Arduino cambia el LCD a "Todo Bien".
1. `VCC` ➔ **5V** o **3.3V** (Soporta ambos).
2. `GND` ➔ **GND**.
3. `SIG` / `OUT` (Señal) ➔ **Pin Digital 2** del Arduino (Soporta `attachInterrupt()`). 

### Módulo Heart Rate (MAX30100 / MAX30102)
Para el Tótem. Esa ventanita transparente emite una luz roja e infrarroja para leer el pulso de la sangre en el dedo y se comunica por tecnología avanzada I2C, la misma de la pantalla.
Como la pantalla ya está usando los puertos A4 y A5, deberás conectar los cables **en los mismos agujeros/líneas** (hacer un paralelo):
1. `VIN` ➔ **Línea ROJA (5V)** (o si tu placa es de las rojas estrictas, ponla en la de 3.3V, pero usualmente usan 5V).
2. `GND` ➔ **Línea AZUL (GND)**.
3. `SDA` ➔ Comparte cableado hacia el **Pin Analógico A4** del Arduino (junto a la Pantalla).
4. `SCL` ➔ Comparte cableado hacia el **Pin Analógico A5** del Arduino (junto a la Pantalla).
5. `INT` ➔ Puedes dejarlo suelto (al aire), es solo para interrupciones avanzadas.

### Módulo Traffic Light (Semáforo de advertencias)
Para dar feedack de la medicación o actividad (Verde = Rutina OK, Amarillo = Posible Sedentarismo, Rojo = No toque el pastillero ya tomó).
1. `GND` ➔ **GND**.
2. `R` (Rojo) ➔ **Pin Digital 11** del Arduino.
3. `Y` (Amarillo) ➔ **Pin Digital 12** del Arduino.
4. `G` (Verde) ➔ **Pin Digital 13** del Arduino.

### Módulo Buzzer (Zumbador de Alertas en Placa PCB)
Trabajará sincronizado con el Semáforo para dar retroalimentación auditiva a Manuel, garantizando que entienda la advertencia incluso si no está mirando los LEDs. Como tienes la excelente variante de un módulo montado (que protege a la placa de picos de voltaje gracias a su transistor integrado), las conexiones quedan así:
1. `VCC` ➔ **Línea ROJA (5V)** permanente.
2. `GND` ➔ **Línea AZUL (GND)** permanente.
3. `I/O` (Input/Output Señal) ➔ **Pin Analógico A2** (Configurado internamente como la salida digital emisora de la melodía).

---

## Módulo 3: Sedentarismo (Silla/Sofá - Caso 2)

### Sensor Ultrasónico (HC-SR04)
Este único sensor medirá si alguien está frente a él en el sillón.
1. `VCC` ➔ **5V**.
2. `GND` ➔ **GND**.
3. `TRIG` ➔ **Pin Digital 6** del Arduino.
4. `ECHO` ➔ **Pin Digital 7** del Arduino.

---

## Módulo 4: Actividad y Heartbeat Infrarrojo (Caso 3)

### Sensor de Movimiento (PIR Motion)
Detecta rastros de calor moviéndose para saber si está activo de forma general por el cuarto.
Gracias a la foto que enviaste, ya lo tengo completamente descifrado basándome en los circuitos de la placa verde. Acomódalo en tu mesa para verlo **exactamente en la misma posición de tu foto** (con las 2 perillas amarillas a la izquierda, y los 3 picos de metal a la derecha). 

En ese orden de Arriba hacia Abajo, las patas son:
1. **La pata de más Arriba (`GND`)** ➔ **Línea AZUL (GND)**. *(Sé que es la tierra porque la soldadura tiene las muecas de anclaje térmico a la masa general).*
2. **La pata del Medio (`OUT/Señal`)** ➔ **Pin Digital 3** del Arduino (Soporta `attachInterrupt()`).
3. **La pata de más Abajo (`VCC`)** ➔ **Línea ROJA (5V)**. *(Sé que es la energía porque la pista va derechito hacia el diodo cilíndrico anaranjado de protección).*

---

## Módulo 5: Medicación (Pastillero - Caso 1 y 6)

### Módulo de Vibración (Vibration Sensor)
Como no hay Tilt Switch, el sensor de vibración irá pegado al cuerpo del frasco de pastillas. Cuando el usuario lo agarre y sacuda por mínimo que sea, el sensor disparará.
1. `VCC` ➔ **5V**.
2. `GND` ➔ **GND**.
3. `D0` (Salida Digital) ➔ **Pin Digital 4** del Arduino.
*(El sensor a veces trae DO - Digital, y AO - Analógico. Usa DO).*

---

## Módulo 6: Alimentación (Nevera - Caso 4)

### Sensor Laser Ranging Module (VL53L0X u orientados a I2C)
Tienes el láser medidor de "Tiempo de Vuelo" (es muy pro). Funciona midiendo el rebote de la luz igual que los otros, pero se comunica por I2C. Por lo tanto, vas a hacer exactamente lo mismo que con el Heart Rate: ¡Empalmar paralelos!
Apunta con él al marco interior de la nevera:
1. `VIN` ➔ **Línea ROJA (5V)**.
2. `GND` ➔ **Línea AZUL (GND)**.
3. `SDA` ➔ Comparte cableado hacia el **Pin Analógico A4** del Arduino (Empalmado junto a Pantalla y Heart Rate).
4. `SCL` ➔ Comparte cableado hacia el **Pin Analógico A5** del Arduino (Empalmado junto a Pantalla y Heart Rate).
5. `XSHUT` y `GPIO1` ➔ Déjalos sueltos, no los conectes. Son solo para prender/apagar el sensor a la fuerza o interrupciones que no requeriremos.

---

## Módulo Extras para Robustez

### Módulo DS1302 RTC (Real Time Clock)
Súper útil para tu proyecto de cuidar a una persona mayor: Permitiría al Arduino saber internamente que "son las 10:00AM" sin preguntarle a internet, lo cual es vital para reiniciar el estado de las pastillas a primera hora del día.
1. `VCC` ➔ **5V**.
2. `GND` ➔ **GND**.
3. `CLK` (Reloj) ➔ **Pin Digital 8** del Arduino.
4. `DAT` (Datos) ➔ **Pin Digital 9** del Arduino.
5. `RST` o `CE` ➔ **Pin Digital 10** del Arduino.

### Potenciómetro de Ajuste
Úsalo como simulador o variable del sistema (Por ejemplo, en vivo puedes rotarlo para cambiar qué "Hora del día" le estas tratando de hacer creer al programa durante tu demo de sustentación).
1. `Pin Extremo Izquierdo` ➔ **5V**.
2. `Pin Extremo Derecho` ➔ **GND**.
3. `Pin Central (Wiper)` ➔ **Pin Analógico A1** del Arduino.
