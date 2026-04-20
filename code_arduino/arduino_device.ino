#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "Adafruit_VL53L0X.h" // Librería obligatoria para el sensor Láser VL53L0X
//#include <virtuabotixRTC.h> // Descomenta si instalas la librería virtuabotixRTC para tu módulo DS1302

// =========================================================================
// DEFINICIÓN DE PINES (Adaptado al nuevo Hardware)
// =========================================================================

// Entradas Digitales
const int TOUCH_TOTEM_PIN  = 2;  // Módulo Touch capacitivo (Tótem ritual)
const int PIR_PIN          = 3;  // Sensor de movimiento (Actividad general)
const int VIB_MED_PIN      = 4;  // Sensor de vibración (Frasco de pastillas)
// El Pin 5 quedó libre. El láser VL53L0X ahora va por I2C junto a la pantalla (A4 y A5)
const int TRIG_SOFA        = 6;  // HC-SR04 Trigger (Sofá)
const int ECHO_SOFA        = 7;  // HC-SR04 Echo (Sofá)

// RTC DS1302 (Pines)
const int RTC_CLK = 8;
const int RTC_DAT = 9;
const int RTC_RST = 10;

// Salidas Digitales (Semáforo)
const int LED_RED_TRAFFIC  = 11; // Rojo (Peligro/Duplicación)
const int LED_YEL_TRAFFIC  = 12; // Amarillo (Precaución/Sedentarismo)
const int LED_GRN_TRAFFIC  = 13; // Verde (Normal/Rutina ok)
const int BUZZER_PIN       = A2; // Zumbador Pasivo (Alertas)

// Entradas Analógicas
const int POT_PIN          = A1; // Potenciómetro para simulador de tiempo

// LCD I2C y Laser VL53L0X
// La dirección I2C de la pantalla común suele ser 0x27 o 0x3F.
LiquidCrystal_I2C lcd(0x27, 16, 2); 
Adafruit_VL53L0X lox = Adafruit_VL53L0X(); // Instancia del Laser

// Instancia RTC (Descomentar al usar la librería física virtuabotixRTC)
// virtuabotixRTC myRTC(RTC_CLK, RTC_DAT, RTC_RST);

// =========================================================================
// CONSTANTES Y UMBRALES
// =========================================================================

const unsigned long ONE_HOUR_MS = 3600000UL;
const unsigned long RESET_TIME_MS = 86400000UL;

const float DIST_SOFA_THRESHOLD = 50.0; // cm para considerar sentado en el sofá

// =========================================================================
// VARIABLES DE ESTADO Y TEMPORIZADORES
// =========================================================================

// Tiempos globales
unsigned long currentMillis = 0;
unsigned long lastResetTime = 0;

// Caso 1 & 6: Medicación y Duplicación
volatile bool medVibrated = false; 
bool isTaken = false;

// Caso 2: Sedentarismo
unsigned long sedentaryStartTime = 0;
bool isSitting = false;
bool sedentaryAlertSent = false;

// Caso 3: Presencia (PIR)
unsigned long lastSeenTime = 0;
bool pirActive = false;
bool movementCheckFullfilled = false; 

// Caso 4: Nevera (Láser digital)
bool isFridgeOpen = false;
unsigned long fridgeOpenTime = 0;
bool fridgeCheckFullfilled = false; 

// Caso 5: Tótem (Touch y Heart Rate)
bool lastTouchState = LOW;
bool totemCheckFullfilled = false; 

// Caso 7: Multi-evidencia 
bool routineNotifiedToday = false;

// Prototipos
void handleVibInterrupt();
float getDistance(int trigPin, int echoPin);
void sendJsonEvent(String sensorId, String value, String module);
void updateTrafficLight(bool r, bool y, bool g);
void printLCD(String line1, String line2);

void setup() {
  Serial.begin(115200);

  // Inicializar Pantalla LCD
  lcd.init();
  lcd.backlight();
  printLCD("Iniciando...", "Sistema HCI");

  // Configuración de Entradas
  pinMode(TOUCH_TOTEM_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(VIB_MED_PIN, INPUT);
  
  pinMode(TRIG_SOFA, OUTPUT);
  pinMode(ECHO_SOFA, INPUT);

  // Configuración del Semáforo
  pinMode(LED_RED_TRAFFIC, OUTPUT);
  pinMode(LED_YEL_TRAFFIC, OUTPUT);
  pinMode(LED_GRN_TRAFFIC, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Semáforo inicia en verde
  updateTrafficLight(LOW, LOW, HIGH);

  // Interrupción para capturar la vibración del pastillero rápidamente
  // Dependiendo del módulo, la señal activa puede ser RISING o FALLING
  attachInterrupt(digitalPinToInterrupt(VIB_MED_PIN), handleVibInterrupt, RISING);

  // Inicializar tiempo base
  lastResetTime = millis();
  
  // Iniciar sensor Láser
  if (!lox.begin()) {
    Serial.println("¡Alerta! No se detecto el Sensor Láser VL53L0X. Revisa los cables SDA/SCL.");
  } else {
    lox.startRangeContinuous();
  }
  
  delay(2000);
  printLCD("Monitoreando", "Actividad Abuelo");
}

void loop() {
  unsigned long currentMillis = millis();

  // =========================================================================
  // SISTEMA DE FEEDBACK: LECTURA DEL ESP8266 (INTERNET)
  // =========================================================================
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\n');
    msg.trim();
    
    if (msg == "WIFI_OFF") {
      printLCD("! SIN INTERNET !", "Revise el Router");
      digitalWrite(LED_YEL_TRAFFIC, HIGH); // Prende el amarillo de precaución
      tone(BUZZER_PIN, 250, 1000);         // Sonido de error grave
    } 
    else if (msg == "WIFI_ON") {
      printLCD("Wi-Fi Conectado", "Sistema en linea");
      digitalWrite(LED_YEL_TRAFFIC, LOW);  // Apaga el amarillo
      tone(BUZZER_PIN, 1500, 300);         // Sonido agudo feliz
      delay(2000); // Pausa para que Manuel lo alcance a leer
      printLCD("Monitoreando", "Actividad Abuelo"); // Retoma interfaz limpia
    }
  }

  // Reset diario de variables (Para nueva rutina diaria)
  if (currentMillis - lastResetTime >= RESET_TIME_MS) {
    isTaken = false;
    routineNotifiedToday = false;
    movementCheckFullfilled = false;
    fridgeCheckFullfilled = false;
    totemCheckFullfilled = false;
    lastResetTime = currentMillis;
    updateTrafficLight(LOW, LOW, HIGH);
    printLCD("Nuevo Dia", "Rutina Reiniciada");
    delay(2000);
  }

  // =========================================================================
  // CASO 1 & 6: MEDICACIÓN (Vibración)
  // =========================================================================
  
  if (medVibrated) {
    delay(200); // Debounce físico del resorte o cristal
    
    if (isTaken) {
      // Caso 6: Riesgo de Duplicación (Ya se tomó e intentó de nuevo)
      updateTrafficLight(HIGH, LOW, LOW); // Semáforo Rojo
      tone(BUZZER_PIN, 1000, 1000); // Zumbido de alerta fuerte de 1 segundo
      printLCD("ALERTA!", "Peligro Duplic.");
      sendJsonEvent("vib_sensor", "duplication_warning", "medication");
      delay(3000); // Mantiene visualizando la advertencia
      printLCD("Monitoreando", "Actividad Abuelo");
      updateTrafficLight(LOW, LOW, HIGH); // Vuelve a verde
    } else {
      // Caso 1: Inicio de rutina de medicación OK
      isTaken = true;
      printLCD("Medicina OK", "Buen trabajo");
      updateTrafficLight(LOW, LOW, HIGH); // Mantiene o fuerza Verde
      tone(BUZZER_PIN, 600, 200); // Beep de confirmación positiva
      sendJsonEvent("vib_sensor", "confirmed_taken", "medication");
      delay(2000);
      printLCD("Monitoreando", "Actividad Abuelo");
    }
    medVibrated = false;
  }

  // =========================================================================
  // CASO 2: SEDENTARISMO (Sillón / HC-SR04)
  // =========================================================================
  
  float distSofa = getDistance(TRIG_SOFA, ECHO_SOFA);
  if (distSofa > 0 && distSofa < DIST_SOFA_THRESHOLD) {
    if (!isSitting) {
      isSitting = true;
      sedentaryStartTime = currentMillis;
    } else if (!sedentaryAlertSent && (currentMillis - sedentaryStartTime >= ONE_HOUR_MS)) {
      // Alerta Sedentarismo 
      updateTrafficLight(LOW, HIGH, LOW); // Semáforo Amarillo
      tone(BUZZER_PIN, 440, 2000); // Zumbido tenue y prolongado para avisar
      printLCD("Sedentarismo!", "Ponte de pie");
      sendJsonEvent("sofa_ultrasonic", "sedentary_alert", "activity");
      sedentaryAlertSent = true;
    }
  } else if (distSofa >= DIST_SOFA_THRESHOLD) {
    if (isSitting) {
      sendJsonEvent("sofa_ultrasonic", "activity_resumed", "activity");
      updateTrafficLight(LOW, LOW, HIGH); // Vuelve a verde
      printLCD("Monitoreando", "Actividad Abuelo");
    }
    isSitting = false;
    sedentaryAlertSent = false;
  }

  // =========================================================================
  // CASO 3: PRESENCIA ESTÁTICA (PIR)
  // =========================================================================
  
  if (digitalRead(PIR_PIN) == HIGH) {
    if (!pirActive) {
      pirActive = true;
      lastSeenTime = currentMillis;
      movementCheckFullfilled = true; // Acumular para Caso 7
      sendJsonEvent("pir_sensor", "motion_detected", "activity");
    }
  } else {
    pirActive = false;
  }

  // =========================================================================
  // CASO 4: ALIMENTACIÓN (NEVERA LASER I2C)
  // =========================================================================
  
  if (lox.isRangeComplete()) {
    int distance_mm = lox.readRange();
    // 500mm = 50cm, si la distancia supera 50cm es porq no está apuntando al marco (Puerta Abierta)
    if (distance_mm > 500) { 
      if (!isFridgeOpen) {
        isFridgeOpen = true;
        fridgeOpenTime = currentMillis;
      }
    } else {
      if (isFridgeOpen) {
        unsigned long duracion = (currentMillis - fridgeOpenTime) / 1000; // Segundos abierta
        isFridgeOpen = false;
        fridgeCheckFullfilled = true; // Acumular para Caso 7
        sendJsonEvent("fridge_laser", "closed_duration_" + String(duracion) + "s", "activity");
      }
    }
  }

  // =========================================================================
  // CASO 5: TÓTEM (TOUCH)
  // =========================================================================
  
  bool currentTouchState = digitalRead(TOUCH_TOTEM_PIN);
  if (lastTouchState == LOW && currentTouchState == HIGH) {
    // Abuelo puso su dedo en el Touch. 
    // Aquí podrías opcionalmente leer `analogRead(HEART_RATE_PIN)` para enviar su pulso cardíaco
    
    updateTrafficLight(LOW, LOW, HIGH);
    tone(BUZZER_PIN, 800, 300); // Beep feliz de check-in
    printLCD("Todo Bien", "Buen dia Abuelo!");
    
    totemCheckFullfilled = true; // Acumular para Caso 7
    sendJsonEvent("touch_totem", "well_being_confirmed", "ritual");
    
    delay(3000);
    printLCD("Monitoreando", "Actividad Abuelo");
  }
  lastTouchState = currentTouchState;

  // =========================================================================
  // CASO 7: CERTEZA COMPLETA (MULTI-EVIDENCIA)
  // =========================================================================
  
  if (!routineNotifiedToday && movementCheckFullfilled && fridgeCheckFullfilled && totemCheckFullfilled) {
    sendJsonEvent("multi_evidence_system", "routine_completed_high_certainty", "activity");
    routineNotifiedToday = true;
  }

  delay(100); 
}

// -------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// -------------------------------------------------------------------------

void handleVibInterrupt() {
  medVibrated = true; 
}

float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH, 25000); // 25ms timeout
  if (duration == 0) return -1.0;
  
  return (duration * 0.0343) / 2.0;
}

void updateTrafficLight(bool r, bool y, bool g) {
  digitalWrite(LED_RED_TRAFFIC, r);
  digitalWrite(LED_YEL_TRAFFIC, y);
  digitalWrite(LED_GRN_TRAFFIC, g);
}

void printLCD(String line1, String line2) {
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print(line1);
  lcd.setCursor(0, 1);
  lcd.print(line2);
}

// Genera JSON puro
void sendJsonEvent(String sensorId, String value, String module) {
  String jsonPayload = "{";
  jsonPayload += "\"token\": \"CASA10\", "; // Inyectamos el Token de Manuel que conversamos
  jsonPayload += "\"modulo\": \"" + module + "\", ";
  
  jsonPayload += "\"data\": {";
  jsonPayload += "\"sensor_id\": \"" + sensorId + "\", ";
  jsonPayload += "\"estado\": \"" + value + "\"";
  jsonPayload += "}}";
  
  Serial.println(jsonPayload);
}
