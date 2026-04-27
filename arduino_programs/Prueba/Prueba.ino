#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "Adafruit_VL53L0X.h"
#include "MAX30105.h"
#include "heartRate.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>

// =========================================================================
// DEFINICIÓN DE PINES
// =========================================================================

const int TOUCH_TOTEM_PIN  = 2;  
const int PIR_PIN          = 3;  
const int VIB_MED_PIN      = 4;  
const int TRIG_SOFA        = 6;  
const int ECHO_SOFA        = 7;  

const int RTC_CLK = 8;
const int RTC_DAT = 9;
const int RTC_RST = 10;

const int LED_RED_TRAFFIC  = 11; 
const int LED_YEL_TRAFFIC  = 12; 
const int LED_GRN_TRAFFIC  = 13; 
const int BUZZER_PIN       = A2; 

const int POT_PIN          = A1; 

// =========================================================================
// INSTANCIAS Y VARIABLES GLOBALES
// =========================================================================

LiquidCrystal_I2C lcd(0x27, 16, 2); 
Adafruit_VL53L0X lox = Adafruit_VL53L0X(); 
MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

// Variables del podómetro
int totalPasos = 0;
float umbralPaso = 13.0; // Sensibilidad para sacudida (Gravedad = 9.8m/s2, >13 es un choque)
unsigned long ultimoPasoTime = 0;

const unsigned long ONE_HOUR_MS = 3600000UL;
const unsigned long RESET_TIME_MS = 86400000UL;
const float DIST_SOFA_THRESHOLD = 50.0; 

unsigned long currentMillis = 0;
unsigned long lastResetTime = 0;
unsigned long ultimoPrint = 0;

// Variables PIR (Basadas en documentación técnica)
const int calibrationTime = 30; // Segundos
const unsigned long pause = 5000; // MS de silencio para fin de movimiento
unsigned long lowIn = 0;
boolean lockLow = true;
boolean takeLowTime = false;

// Estados de casos
volatile bool medVibrated = false; 
bool isTaken = false;
unsigned long sedentaryStartTime = 0;
bool isSitting = false;
bool sedentaryAlertSent = false;
unsigned long lastSeenTime = 0;
bool pirActive = false;
bool movementCheckFullfilled = false; 
bool isFridgeOpen = false;
unsigned long fridgeOpenTime = 0;
bool fridgeCheckFullfilled = false; 
bool lastTouchState = LOW;
bool totemCheckFullfilled = false; 
bool routineNotifiedToday = false;

// Variables de ritmo cardíaco
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
int beatsPerMinute = 0;
int beatAvg = 0;

// =========================================================================
// PROTOTIPOS
// =========================================================================
void handleVibInterrupt();
float getDistance(int trigPin, int echoPin);
void sendJsonEvent(String sensorId, String value, String module);
void updateTrafficLight(bool r, bool y, bool g);
void printLCD(String line1, String line2);

// =========================================================================
// SETUP
// =========================================================================

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600); // Bluetooth HC-05

  Serial.println("\n===============================================");
  Serial.println("   SISTEMA HCI - MODO VERBOSO (DEPURACIÓN)     ");
  Serial.println("===============================================");

  // Inicializar Pantalla LCD
  lcd.init();
  lcd.backlight();
  printLCD("Iniciando...", "Modo Verboso");

  // Configuración de Pines
  pinMode(TOUCH_TOTEM_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(VIB_MED_PIN, INPUT);
  pinMode(TRIG_SOFA, OUTPUT);
  pinMode(ECHO_SOFA, INPUT);
  pinMode(LED_RED_TRAFFIC, OUTPUT);
  pinMode(LED_YEL_TRAFFIC, OUTPUT);
  pinMode(LED_GRN_TRAFFIC, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  updateTrafficLight(LOW, LOW, HIGH); // Verde inicial

  attachInterrupt(digitalPinToInterrupt(VIB_MED_PIN), handleVibInterrupt, RISING);

  // Calibración Sensor PIR
  Serial.print("⏳ Calibrando sensor PIR (esperar ");
  Serial.print(calibrationTime);
  Serial.print("s)... ");
  for(int i = 0; i < calibrationTime; i++){
    Serial.print(".");
    delay(1000);
  }
  Serial.println(" ¡LISTO!");

  lastResetTime = millis();
  
  // Iniciar sensor Láser
  Serial.print("🔍 Iniciando VL53L0X...");
  if (!lox.begin()) {
    Serial.println(" ERROR: No detectado. Revisa SDA/SCL.");
    printLCD("ERR: Laser", "Revise cables");
  } else {
    Serial.println(" OK!");
    lox.startRangeContinuous();
  }

  // Iniciar sensor MAX30105
  Serial.print("🔍 Iniciando MAX30105...");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println(" ERROR: No detectado. Revisa SDA/SCL y alimentación 5V.");
  } else {
    Serial.println(" OK!");
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x3F); // Brillo alto para ser visible
    particleSensor.setPulseAmplitudeIR(0x3F);
  }

  // Iniciar sensor MPU6050 (Podómetro)
  Serial.print("🔍 Iniciando MPU6050 (Bastón)...");
  if (!mpu.begin()) {
    Serial.println(" ERROR: MPU6050 no detectado. Revisa SDA/SCL.");
    printLCD("ERR: MPU6050", "Revise cables");
  } else {
    Serial.println(" OK!");
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ); // Filtra ruidos rápidos para pasos suaves
  }
  
  delay(2000);
  Serial.println("🚀 Sistema listo y monitoreando...");
  printLCD("Monitoreando", "Actividad Abuelo");
}

// =========================================================================
// LOOP PRINCIPAL
// =========================================================================

void loop() {
  currentMillis = millis();

  // 1. LECTURA DEL BASTÓN (PODÓMETRO MPU6050)
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  // Calcular magnitud del vector de aceleración 3D: sqrt(x^2 + y^2 + z^2)
  float magnitudAceleracion = sqrt(pow(a.acceleration.x, 2) + pow(a.acceleration.y, 2) + pow(a.acceleration.z, 2));
  
  // Si la fuerza supera la gravedad + un impacto (umbral) y evitamos rebotes rápidos (timeout)
  if (magnitudAceleracion > umbralPaso && (currentMillis - ultimoPasoTime > 500)) {
    totalPasos++;
    ultimoPasoTime = currentMillis;
    Serial.println("🦯 [BASTÓN] Paso detectado! Total: " + String(totalPasos));
    
    // Cada 10 pasos envía una actualización silenciosa al backend (para no ahogar la red)
    if (totalPasos % 10 == 0) {
      sendJsonEvent("mpu6050", String(totalPasos), "baston");
    }
  }

  // 1B. LECTURA DE RITMO CARDÍACO (No bloqueante)
  long irValue = particleSensor.getIR();
  if (checkForBeat(irValue) == true) {
    long delta = millis() - lastBeat;
    lastBeat = millis();
    beatsPerMinute = 60 / (delta / 1000.0);
    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  // 2. FEEDBACK ESP8266 (INTERNET)
  if (Serial.available() > 0) {
    String msg = Serial.readStringUntil('\n');
    msg.trim();
    if (msg == "WIFI_OFF") {
      Serial.println("⚠️ [ESP8266] Alerta: Wi-Fi Desconectado");
      printLCD("! SIN INTERNET !", "Revise el Router");
      digitalWrite(LED_YEL_TRAFFIC, HIGH);
      tone(BUZZER_PIN, 250, 1000);
    } else if (msg == "WIFI_ON") {
      Serial.println("🌐 [ESP8266] Info: Wi-Fi Conectado");
      printLCD("Wi-Fi Conectado", "Sistema en linea");
      digitalWrite(LED_YEL_TRAFFIC, LOW);
      tone(BUZZER_PIN, 1500, 300);
      delay(2000);
      printLCD("Monitoreando", "Actividad Abuelo");
    }
  }

  // 3. RESET DIARIO
  if (currentMillis - lastResetTime >= RESET_TIME_MS) {
    Serial.println("♻️ Reset diario de variables ejecutado.");
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

  // 4. CASO 1 & 6: MEDICACIÓN
  if (medVibrated) {
    Serial.println("📳 [DEBUG] Vibración detectada, procesando...");
    delay(200);
    if (isTaken) {
      Serial.println("🚨 [ALERTA] Intento de toma duplicada detectado!");
      updateTrafficLight(HIGH, LOW, LOW);
      tone(BUZZER_PIN, 1000, 1000);
      printLCD("ALERTA!", "Peligro Duplic.");
      sendJsonEvent("vib_sensor", "duplication_warning", "medication");
      delay(3000);
      printLCD("Monitoreando", "Actividad Abuelo");
      updateTrafficLight(LOW, LOW, HIGH);
    } else {
      Serial.println("💊 [INFO] Medicina tomada correctamente.");
      isTaken = true;
      printLCD("Medicina OK", "Buen trabajo");
      updateTrafficLight(LOW, LOW, HIGH);
      tone(BUZZER_PIN, 600, 200);
      sendJsonEvent("vib_sensor", "confirmed_taken", "medication");
      delay(2000);
      printLCD("Monitoreando", "Actividad Abuelo");
    }
    medVibrated = false;
  }

  // 5. CASO 2: SEDENTARISMO
  float distSofa = getDistance(TRIG_SOFA, ECHO_SOFA);
  if (distSofa > 0 && distSofa < DIST_SOFA_THRESHOLD) {
    if (!isSitting) {
      Serial.println("🛋️ [INFO] Abuelo se ha sentado en el sofá.");
      isSitting = true;
      sedentaryStartTime = currentMillis;
    } else if (!sedentaryAlertSent && (currentMillis - sedentaryStartTime >= ONE_HOUR_MS)) {
      Serial.println("⚠️ [ALERTA] Sedentarismo detectado (1 hora sentado).");
      updateTrafficLight(LOW, HIGH, LOW);
      tone(BUZZER_PIN, 440, 2000);
      printLCD("Sedentarismo!", "Ponte de pie");
      sendJsonEvent("sofa_ultrasonic", "sedentary_alert", "activity");
      sedentaryAlertSent = true;
    }
  } else if (distSofa >= DIST_SOFA_THRESHOLD) {
    if (isSitting) {
      Serial.println("🚶 [INFO] Abuelo se ha levantado del sofá.");
      sendJsonEvent("sofa_ultrasonic", "activity_resumed", "activity");
      updateTrafficLight(LOW, LOW, HIGH);
      printLCD("Monitoreando", "Actividad Abuelo");
    }
    isSitting = false;
    sedentaryAlertSent = false;
  }

  // 6. CASO 3: MOVIMIENTO (PIR Robusto)
  if (digitalRead(PIR_PIN) == HIGH) {
    if (lockLow) {
      lockLow = false;
      pirActive = true;
      movementCheckFullfilled = true;
      Serial.println("🏃 [INFO] Movimiento detectado por el PIR.");
      sendJsonEvent("pir_sensor", "motion_detected", "activity");
    }
    takeLowTime = true;
  }

  if (digitalRead(PIR_PIN) == LOW) {
    if (takeLowTime) {
      lowIn = millis();
      takeLowTime = false;
    }
    if (!lockLow && (millis() - lowIn > pause)) {
      lockLow = true;
      pirActive = false;
      Serial.println("🚶 [INFO] Movimiento terminado (sensor en reposo).");
    }
  }

  // 7. CASO 4: NEVERA (LÁSER)
  if (lox.isRangeComplete()) {
    int distance_mm = lox.readRange();
    // Umbral de 300mm para mayor sensibilidad
    if (distance_mm > 300) { 
      if (!isFridgeOpen) {
        Serial.println("❄️ [INFO] Puerta de la nevera abierta (Dist: " + String(distance_mm) + "mm)");
        printLCD("Nevera", "PUERTA ABIERTA");
        isFridgeOpen = true;
        fridgeOpenTime = currentMillis;
      }
    } else {
      if (isFridgeOpen) {
        unsigned long duracion = (currentMillis - fridgeOpenTime) / 1000;
        Serial.println("❄️ [INFO] Nevera cerrada. Duración abierta: " + String(duracion) + "s");
        printLCD("Nevera Cerrada", "Dur: " + String(duracion) + "s");
        isFridgeOpen = false;
        fridgeCheckFullfilled = true;
        sendJsonEvent("fridge_laser", "closed_duration_" + String(duracion) + "s", "activity");
        delay(1500);
        printLCD("Monitoreando", "Actividad Abuelo");
      }
    }
  }

  // 8. CASO 5: TÓTEM (TOUCH + RITMO)
  bool currentTouchState = digitalRead(TOUCH_TOTEM_PIN);
  if (lastTouchState == LOW && currentTouchState == HIGH) {
    Serial.println("✨ [RITUAL] Abuelo tocó el Tótem.");
    Serial.print("❤️ [RITUAL] Ritmo Cardíaco Promedio: "); Serial.print(beatAvg); Serial.println(" BPM");
    
    updateTrafficLight(LOW, LOW, HIGH);
    tone(BUZZER_PIN, 800, 300);
    printLCD("Todo Bien", "Buen dia Abuelo!");
    
    totemCheckFullfilled = true;
    sendJsonEvent("touch_totem", "well_being_confirmed", "ritual");
    
    delay(3000);
    printLCD("Monitoreando", "Actividad Abuelo");
  }
  lastTouchState = currentTouchState;

  // 9. CASO 7: CERTEZA COMPLETA
  if (!routineNotifiedToday && movementCheckFullfilled && fridgeCheckFullfilled && totemCheckFullfilled) {
    Serial.println("✅ [SISTEMA] Rutina diaria completada con alta certeza.");
    sendJsonEvent("multi_evidence_system", "routine_completed_high_certainty", "activity");
    routineNotifiedToday = true;
  }

  // 10. IMPRESIÓN PERIÓDICA DE ESTADO (Cada 5 segundos)
  if (millis() - ultimoPrint > 5000) {
    ultimoPrint = millis();
    Serial.println("\n--- [ ESTADO ACTUAL ] ---");
    Serial.print("   Sofá: "); Serial.print(distSofa); Serial.println(" cm");
    Serial.print("   Ritmo: "); Serial.print(beatAvg); Serial.println(" BPM");
    Serial.print("   Medicina: "); Serial.println(isTaken ? "Tomada" : "Pendiente");
    Serial.print("   Nevera: "); Serial.println(isFridgeOpen ? "Abierta" : "Cerrada");
    Serial.print("   Pasos Bastón: "); Serial.println(totalPasos);
    Serial.println("--------------------------\n");
    
    if (!isFridgeOpen && !pirActive && !isSitting) {
      lcd.setCursor(0, 1);
      lcd.print("Ritmo: " + String(beatAvg) + " BPM   ");
    }
  }

  delay(10); 
}

// =========================================================================
// FUNCIONES AUXILIARES
// =========================================================================

void handleVibInterrupt() {
  medVibrated = true; 
}

float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  long duration = pulseIn(echoPin, HIGH, 25000); 
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

void sendJsonEvent(String sensorId, String value, String module) {
  String jsonPayload = "{";
  jsonPayload += "\"token\": \"CASA10\", ";
  jsonPayload += "\"modulo\": \"" + module + "\", ";
  jsonPayload += "\"data\": {";
  jsonPayload += "\"sensor_id\": \"" + sensorId + "\", ";
  jsonPayload += "\"estado\": \"" + value + "\"";
  jsonPayload += "}}";
  
  Serial.println(jsonPayload);    // USB
  Serial1.println(jsonPayload);   // Bluetooth
}
