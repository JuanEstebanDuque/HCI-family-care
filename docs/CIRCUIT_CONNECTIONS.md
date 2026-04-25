# Guía de Conexión del Circuito (HCI)

¡Bienvenido a la guía de ensamblaje! Aquí armaremos tu prototipo usando la placa **Arduino UNO R4 Minima** como el "Cerebro Central" de los sensores, y el pequeño módulo **ESP8266 (ESP-01) con su Adaptador** como la "Antena Wi-Fi" que manda los datos a internet.

## ⚠️ Lo Básico de la Protoboard
El Arduino opera a **5V**. Afortunadamente, como usarás el Adaptador del ESP8266 rojo, este ya se encarga de regular la energía automáticamente, por lo que conectar todo será facilísimo:
1. Conecta el pin `5V` del Arduino a la línea ROJA (+) de tu protoboard.
2. Conecta el pin `GND` (Tierra) del Arduino a la línea AZUL/NEGRA (-) de la protoboard.
3. **Todo** lo que armes tomará energía de estas dos líneas largas de colores.

---

## Módulo 1: Comunicación (La Antena Wi-Fi ESP8266)
**Objeto físico sugerido:** Mini caja técnica ventilada (impresa en 3D o acrílico) ubicada junto al Arduino, con salida de cables por un costado.

**Contexto (por qué así):** Aunque Manuel no interactúa con este módulo, la conexión estable sostiene toda la experiencia silenciosa del sistema. Si falla, Laura pierde visibilidad y vuelve la incertidumbre; por eso se diseña "invisible pero confiable".

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

## Módulo 1B: Comunicación Alternativa (Bluetooth HC-05 / HC-06)
*Si no dispones del módulo Wi-Fi temporalmente, usarás este módulo Bluetooth como plan de respaldo para enviar los datos a tu computadora mediante PuTTY.*

**Objeto físico sugerido:** Clip o base lateral desmontable para el HC-05, colocado sobre la misma base del cerebro central.

**Contexto (por qué así):** Esta alternativa protege la continuidad del cuidado sin imponer fricción al usuario. Si no hay Wi-Fi, el equipo puede seguir validando rutina y evidencias sin cambiar hábitos de Manuel ni dejar a Laura "a ciegas".

Para cablear el HC-05 al Arduino UNO R4 Minima (usando el puerto `Serial1`):
1. Pata `VCC` ➔ Línea **ROJA (5V)**.
2. Pata `GND` ➔ Línea **AZUL (GND)**.
3. Pata `TXD` ➔ Al **Pin RX (Pin 0)** del Arduino.
4. Pata `RXD` ➔ Al **Pin TX (Pin 1)** del Arduino.
*(Nota: Las patas EN y STATE puedes dejarlas al aire. Al igual que con el Wi-Fi, recuerda que RX va con TX, y TX va con RX de forma cruzada).*

### ¿Cómo probar la conexión Inalámbrica con PuTTY?

Dado que este módulo no envía datos directo al Wi-Fi, tu computadora leerá los datos en bruto usando el programa de terminal **PuTTY**:

**Paso 1: Emparejar el Módulo con Windows**
1. Enciende el Arduino. El LED del Bluetooth empezará a parpadear rápidamente.
2. Ve a la **Configuración de Bluetooth** de Windows y selecciona "Agregar dispositivo".
3. Selecciona tu módulo (usualmente se llama `HC-05`, `HC-06` o similar). El código PIN suele ser `1234` o `0000`.
4. Una vez emparejado, presiona las teclas `Win + R` en tu teclado, escribe `devmgmt.msc` y pulsa Enter para abrir el Administrador de Dispositivos.
5. Despliega la categoría **Puertos (COM y LPT)**. Verás un par de puertos nuevos llamados "Puerto serie estándar a través de vínculos Bluetooth" (ej. `COM4` y `COM5`). Anota esos puertos COM (el de número menor suele ser el correcto, llamado "Saliente").

**Paso 2: Leer los datos en PuTTY**
1. Descarga (si no lo tienes) y abre el programa **PuTTY**.
2. En la pantalla de inicio, en la categoría "Connection type", selecciona la burbuja de **Serial**.
3. En la casilla "Serial line", escribe el puerto COM de tu Bluetooth (por ejemplo, `COM4`).
4. En la casilla "Speed", escribe `9600` (que es la velocidad base predeterminada de los HC-05).
5. Haz clic en el botón **Open** abajo a la derecha.

Si el Arduino está corriendo tu código de prueba que imprimía en `Serial1`, verás que la terminal negra de PuTTY se abre y mágicamente empieza a mostrar los textos de bienvenida que programaste en el Arduino, demostrando que la señal está viajando por el aire exitosamente.

---

## Módulo 2: Interfaz del Tótem (Bienestar y Estado)
**Objeto físico sugerido:** Tótem de mesa orientado al usuario (adulto mayor), con frente visible y altura aproximada de 20 a 30 cm.

**Contexto (por qué así):** Se materializa como "objeto de compañía" y no como dispositivo médico, para evitar rechazo por sensación de control. Su presencia cotidiana permite acompañar la rutina de Manuel preservando dignidad y autonomía.

### Pantalla LCD 1602 (I2C)
Mostraremos los mensajes como "Modo Sedentario detectado" o "Medicina Tomada" directamente acá en vez de depender solo del LED.
**Objeto físico sugerido:** Ventana frontal rectangular, con visor inclinado entre 10 y 20 grados.

**Contexto (por qué así):** Manuel necesita señales claras sin menús ni apps. Por eso la información se vuelve breve, legible y situada en un objeto cotidiano que no le exige aprendizaje tecnológico.
1. `VCC` ➔ Línea de **5V**.
2. `GND` ➔ Línea de **GND**.
3. `SDA` ➔ Pin **A4** (SDA) del Arduino R4.
4. `SCL` ➔ Pin **A5** (SCL) del Arduino R4.

### Módulo Touch (Para el ritual de "Estoy Bien" - Caso 5)
Sustituirá al botón pulsador normal, usando sensado táctil. Cuanto el abuelo lo toque, el Arduino cambia el LCD a "Todo Bien".
**Objeto físico sugerido:** Placa táctil amplia (moneda metálica o disco conductor cubierto con vinilo) en la cara frontal del tótem.

**Contexto (por qué así):** Esta interacción convierte la vigilancia en comunicación voluntaria: Manuel "se reporta" cuando quiere, en lugar de sentirse monitoreado. Así se equilibra tranquilidad de Laura con autonomía del usuario.
1. `VCC` ➔ **5V** o **3.3V** (Soporta ambos).
2. `GND` ➔ **GND**.
3. `SIG` / `OUT` (Señal) ➔ **Pin Digital 2** del Arduino (Soporta `attachInterrupt()`). 

### Módulo Heart Rate (MAX30100 / MAX30102)
Para el Tótem. Esa ventanita transparente emite una luz roja e infrarroja para leer el pulso de la sangre en el dedo y se comunica por tecnología avanzada I2C, la misma de la pantalla.
**Objeto físico sugerido:** Nicho lateral con guía de dedo (tipo "dedal corto"), con borde redondeado y superficie limpia.

**Contexto (por qué así):** En el proyecto, la señal fisiológica no busca medicalizar la experiencia sino aportar certeza en momentos puntuales. La guía física minimiza errores y evita que Manuel dude si "lo hizo bien" o no.
Como la pantalla ya está usando los puertos A4 y A5, deberás conectar los cables **en los mismos agujeros/líneas** (hacer un paralelo):
1. `VIN` ➔ **Línea ROJA (5V)** (o si tu placa es de las rojas estrictas, ponla en la de 3.3V, pero usualmente usan 5V).
2. `GND` ➔ **Línea AZUL (GND)**.
3. `SDA` ➔ Comparte cableado hacia el **Pin Analógico A4** del Arduino (junto a la Pantalla).
4. `SCL` ➔ Comparte cableado hacia el **Pin Analógico A5** del Arduino (junto a la Pantalla).
5. `INT` ➔ Puedes dejarlo suelto (al aire), es solo para interrupciones avanzadas.

### Módulo Traffic Light (Semáforo de advertencias)
Para dar feedack de la medicación o actividad (Verde = Rutina OK, Amarillo = Posible Sedentarismo, Rojo = No toque el pastillero ya tomó).
**Objeto físico sugerido:** Columna de 3 difusores grandes (verde/amarillo/rojo) visibles a distancia.

**Contexto (por qué así):** El código de color responde al principio del Faro de Bienestar: traducir complejidad a una lectura emocional rápida. Manuel entiende estado local y Laura obtiene tranquilidad sin revisar reportes extensos.
1. `GND` ➔ **GND**.
2. `R` (Rojo) ➔ **Pin Digital 11** del Arduino.
3. `Y` (Amarillo) ➔ **Pin Digital 12** del Arduino.
4. `G` (Verde) ➔ **Pin Digital 13** del Arduino.

### Módulo Buzzer (Zumbador de Alertas en Placa PCB)
Trabajará sincronizado con el Semáforo para dar retroalimentación auditiva a Manuel, garantizando que entienda la advertencia incluso si no está mirando los LEDs. Como tienes la excelente variante de un módulo montado (que protege a la placa de picos de voltaje gracias a su transistor integrado), las conexiones quedan así:
**Objeto físico sugerido:** Salida acústica superior con rejilla y espuma fina antipolvo.

**Contexto (por qué así):** Los recordatorios deben sentirse como acompañamiento suave, no alarma clínica. El buzzer refuerza la señal visual para no depender de que Manuel esté mirando el tótem todo el tiempo.
1. `VCC` ➔ **Línea ROJA (5V)** permanente.
2. `GND` ➔ **Línea AZUL (GND)** permanente.
3. `I/O` (Input/Output Señal) ➔ **Pin Analógico A2** (Configurado internamente como la salida digital emisora de la melodía).

---

## Módulo 3: Sedentarismo (Silla/Sofá - Caso 2)
**Objeto físico sugerido:** Mini soporte frontal fijado al borde de una mesa auxiliar o base del sillón, apuntando al torso del usuario.

**Contexto (por qué así):** Este módulo funciona como Nodo de Contexto pasivo: observa microhábitos sin pedir acciones extra. Así se visibiliza sedentarismo sin wearables ni sensación de vigilancia constante.

### Sensor Ultrasónico (HC-SR04)
Este único sensor medirá si alguien está frente a él en el sillón.
**Objeto físico sugerido:** Carcasa con "ojos" del sensor al descubierto y ajuste de inclinación.

**Contexto (por qué así):** La decisión de apuntar solo a la zona de descanso busca interpretar rutina real, no "movimiento cualquiera". Eso reduce falsas alertas y evita angustia innecesaria en Laura.
1. `VCC` ➔ **5V**.
2. `GND` ➔ **GND**.
3. `TRIG` ➔ **Pin Digital 6** del Arduino.
4. `ECHO` ➔ **Pin Digital 7** del Arduino.

---

## Módulo 4: Actividad y Heartbeat Infrarrojo (Caso 3)
**Objeto físico sugerido:** Nodo de monitoreo ambiental colocado en pared o repisa media (1.2 a 1.8 m de altura).

**Contexto (por qué así):** Se prioriza una lectura ambiental discreta para distinguir silencio normal de posible riesgo. La meta no es rastrear a Manuel, sino dar contexto mínimo confiable a la distancia.

### Sensor de Movimiento (PIR Motion)
Detecta rastros de calor moviéndose para saber si está activo de forma general por el cuarto.
Gracias a la foto que enviaste, ya lo tengo completamente descifrado basándome en los circuitos de la placa verde. Acomódalo en tu mesa para verlo **exactamente en la misma posición de tu foto** (con las 2 perillas amarillas a la izquierda, y los 3 picos de metal a la derecha). 
**Objeto físico sugerido:** Cúpula PIR expuesta en el frontal de una caja pequeña, con visera para reducir luz directa.

**Contexto (por qué así):** Cuando el sistema interpreta bien presencia/ausencia, Laura recibe menos alarmas por ruido y más señales útiles. Esa confianza en la información es clave para reducir ansiedad cotidiana.

En ese orden de Arriba hacia Abajo, las patas son:
1. **La pata de más Arriba (`GND`)** ➔ **Línea AZUL (GND)**. *(Sé que es la tierra porque la soldadura tiene las muecas de anclaje térmico a la masa general).*
2. **La pata del Medio (`OUT/Señal`)** ➔ **Pin Digital 3** del Arduino (Soporta `attachInterrupt()`).
3. **La pata de más Abajo (`VCC`)** ➔ **Línea ROJA (5V)**. *(Sé que es la energía porque la pista va derechito hacia el diodo cilíndrico anaranjado de protección).*

---

## Módulo 5: Medicación (Pastillero - Caso 1 y 6)
**Objeto físico sugerido:** Pastillero inteligente acoplado externamente (sin modificar el frasco interno de medicamento), con sensor adherido al cuerpo.

**Contexto (por qué así):** La medicación es el punto de mayor riesgo del caso, por eso se diseña sobre el hábito existente (frasco/pastillero) y no contra él. Manuel no cambia su rutina; el sistema gana evidencia de lo que realmente ocurrió.

### Módulo de Vibración (Vibration Sensor)
Como no hay Tilt Switch, el sensor de vibración irá pegado al cuerpo del frasco de pastillas. Cuando el usuario lo agarre y sacuda por mínimo que sea, el sensor disparará.
**Objeto físico sugerido:** Sensor pegado con cinta doble faz o velcro industrial en la parte media del frasco.

**Contexto (por qué así):** Esta decisión soporta la feature de "evidencia y certeza": no basta recordar, hay que diferenciar intento de toma vs. acción completada dentro de una secuencia lógica de uso.
1. `VCC` ➔ **5V**.
2. `GND` ➔ **GND**.
3. `D0` (Salida Digital) ➔ **Pin Digital 4** del Arduino.
*(El sensor a veces trae DO - Digital, y AO - Analógico. Usa DO).*

---

## Módulo 6: Alimentación (Nevera - Caso 4)
**Objeto físico sugerido:** Sensor ToF montado en soporte interior adhesivo, apuntando al marco o puerta de la nevera.

**Contexto (por qué así):** Se busca hacer visible la alimentación sin pedir registro manual ni juicio explícito. Al capturar interacción con la nevera como señal contextual, Laura entiende mejor la rutina sin invadir.

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
**Objeto físico sugerido:** Módulo interno dentro de la caja principal, lejos de fuentes de calor y vibración.

**Contexto (por qué así):** El proyecto depende de interpretar hábitos en tiempo (mañana/tarde/noche). Mantener referencia horaria consistente evita mensajes fuera de contexto que podrían frustrar a Manuel o alarmar de más a Laura.
1. `VCC` ➔ **5V**.
2. `GND` ➔ **GND**.
3. `CLK` (Reloj) ➔ **Pin Digital 8** del Arduino.
4. `DAT` (Datos) ➔ **Pin Digital 9** del Arduino.
5. `RST` o `CE` ➔ **Pin Digital 10** del Arduino.

### Potenciómetro de Ajuste
Úsalo como simulador o variable del sistema (Por ejemplo, en vivo puedes rotarlo para cambiar qué "Hora del día" le estas tratando de hacer creer al programa durante tu demo de sustentación).
**Objeto físico sugerido:** Perilla accesible en la parte lateral de la caja (marcada con mínimo/máximo).

**Contexto (por qué así):** En pruebas UX permite recrear escenarios de rutina de forma rápida para validar si los mensajes y estados realmente se entienden como compañía, no como control.
1. `Pin Extremo Izquierdo` ➔ **5V**.
2. `Pin Extremo Derecho` ➔ **GND**.
3. `Pin Central (Wiper)` ➔ **Pin Analógico A1** del Arduino.
