#include <Arduino.h>
#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "Adafruit_VL53L0X.h" // Librería obligatoria para el sensor Láser VL53L0X
#include "MAX30105.h"
#include "heartRate.h"
#include <Adafruit_MPU6050.h>
#include <Adafruit_Sensor.h>
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
LiquidCrystal_I2C lcd(0x27, 16, 2); 
Adafruit_VL53L0X lox = Adafruit_VL53L0X(); 
MAX30105 particleSensor;
Adafruit_MPU6050 mpu;

// Variables del podómetro
int totalPasos = 0;
float umbralPaso = 11.0; // Más sensible para registrar caminata ligera
unsigned long ultimoPasoTime = 0;
unsigned long pasosUltimoCambioMs = 0;
int pasosUltimoEnviado = 0;

// Vibración: solo polling con flanco de subida y tiempo mínimo entre golpes (menos falsos positivos)
unsigned long lastVibEdgeMs = 0;
uint8_t lastVibPinLevel = 0;
unsigned long lastVibHandledMs = 0;
unsigned long lastBpmTelemetryMs = 0;

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

int dailyScore = 100; // Puntaje diario de comportamiento

// Variables PIR (Basadas en documentación técnica)
const int calibrationTime = 30; // Segundos
const unsigned long pause = 5000; // MS de silencio para fin de movimiento
unsigned long lowIn = 0;
boolean lockLow = true;
boolean takeLowTime = false;

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

// Variables de ritmo cardíaco
const byte RATE_SIZE = 4;
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0;
int beatsPerMinute = 0;
int beatAvg = 0;

// =========================================================================
// VARIABLES DE NOTIFICACIÓN BIDIRECCIONAL
// =========================================================================
bool isNotifying = false;
String notifyType = ""; // "MED" o "ACT"
unsigned long lastBlinkTime = 0;
int blinkCount = 0;
bool ledYellowState = false;
unsigned long lastSoundTime = 0;
int soundCount = 0;

// Buffer no-bloqueante para leer comandos del HC-05
String btBuffer = "";
bool btCommandReady = false;

// Variables para Fases de Medicación
int medPhase = 0; 
unsigned long phaseStartTime = 0;
bool phaseWaiting = false;
bool phaseEventSent = false;
bool vibrationDuringNotify = false;


// Prototipos
float getDistance(int trigPin, int echoPin);
void sendJsonEvent(String sensorId, String value, String module, String dataExtras = "");
void updateTrafficLight(bool r, bool y, bool g);
void printLCD(String line1, String line2);
void updateGlobalTrafficLight();
void pollVibrationSensitive();

void updateGlobalTrafficLight() {
  if (dailyScore >= 80) updateTrafficLight(LOW, LOW, HIGH);
  else if (dailyScore >= 50) updateTrafficLight(LOW, HIGH, LOW);
  else updateTrafficLight(HIGH, LOW, LOW);
}

void setup() {
  Serial.begin(115200);
  Serial1.begin(9600); // Inicia comunicación Bluetooth (HC-05) en los pines RX(0) y TX(1)

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

  // Semáforo inicia en su estado global
  updateGlobalTrafficLight();

  lastVibPinLevel = digitalRead(VIB_MED_PIN) ? 1 : 0;

  // Calibración Sensor PIR
  Serial.println("⏳ Calibrando sensor PIR (30s)...");
  for(int i = 0; i < calibrationTime; i++){
    delay(1000);
  }
  Serial.println("¡PIR Activo!");

  // Inicializar tiempo base
  lastResetTime = millis();
  
  // Iniciar sensor Láser
  if (!lox.begin()) {
    Serial.println("¡Alerta! No se detecto el Sensor Láser VL53L0X. Revisa los cables SDA/SCL.");
  } else {
    lox.startRangeContinuous();
  }

  // Iniciar sensor MAX30105 (Ritmo Cardíaco)
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) {
    Serial.println("¡Alerta! No se detecto el Sensor MAX30105 (Huella/Pulso).");
  } else {
    particleSensor.setup();
    particleSensor.setPulseAmplitudeRed(0x3F); // Brillo alto para que se vea
    particleSensor.setPulseAmplitudeIR(0x3F);
  }

  // Iniciar sensor MPU6050 (Podómetro Bastón)
  if (!mpu.begin()) {
    Serial.println("¡Alerta! MPU6050 no detectado. Revisa SDA/SCL.");
    printLCD("ERR: MPU6050", "Revise cables");
  } else {
    mpu.setAccelerometerRange(MPU6050_RANGE_4_G);
    mpu.setFilterBandwidth(MPU6050_BAND_21_HZ); // Filtra ruidos rápidos para pasos suaves
  }
  
  delay(2000);
  printLCD("Monitoreando", "Actividad Abuelo");
}

void loop() {
  unsigned long currentMillis = millis();

  pollVibrationSensitive();

  // 1. LECTURA DEL BASTÓN (PODÓMETRO MPU6050)
  sensors_event_t a, g, temp;
  mpu.getEvent(&a, &g, &temp);
  
  // Calcular magnitud del vector de aceleración 3D: sqrt(x^2 + y^2 + z^2)
  float magnitudAceleracion = sqrt(pow(a.acceleration.x, 2) + pow(a.acceleration.y, 2) + pow(a.acceleration.z, 2));
  
  // Si la fuerza supera la gravedad + un impacto (umbral) y evitamos rebotes rápidos (timeout)
  if (magnitudAceleracion > umbralPaso && (currentMillis - ultimoPasoTime > 500)) {
    totalPasos++;
    ultimoPasoTime = currentMillis;
    pasosUltimoCambioMs = currentMillis;
    // Cada 2 pasos: envío regular al backend (consistente con la lógica del servidor)
    if (totalPasos % 2 == 0) {
      sendJsonEvent("mpu6050", String(totalPasos), "activity", "\"origen\":\"baston\",\"metrica\":\"pasos_acumulados\"");
      pasosUltimoEnviado = totalPasos;
    }
  }
  // Si el total quedó impar y deja de caminar ~4 s, sube el acumulado actual (evita perder el último paso suelto)
  if (totalPasos > pasosUltimoEnviado && (totalPasos % 2 == 1) &&
      (currentMillis - pasosUltimoCambioMs >= 4000)) {
    sendJsonEvent("mpu6050", String(totalPasos), "activity", "\"origen\":\"baston\",\"metrica\":\"pasos_acumulados\"");
    pasosUltimoEnviado = totalPasos;
  }

  // 1B. LECTURA DE RITMO CARDÍACO
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

  // =========================================================================
  // SISTEMA DE FEEDBACK: LECTURA DEL HC-05 (BLUETOOTH) — NO BLOQUEANTE
  // =========================================================================
  while (Serial1.available() > 0) {
    char c = (char)Serial1.read();
    if (c == '\n' || c == '\r') {
      if (btBuffer.length() > 0) {
        btBuffer.trim();
        btCommandReady = true;
      }
    } else {
      btBuffer += c;
    }
  }

  if (btCommandReady) {
    String msg = btBuffer;
    btBuffer = "";
    btCommandReady = false;
    msg.trim(); // Doble seguridad para limpiar el comando

    Serial.print("[BT CMD RECIBIDO]: ");
    Serial.println(msg); // Visible en Monitor Serie USB para depuración

    if (msg.indexOf("NOTIFY_MED") >= 0 || msg.indexOf("NOTIFY_ACT") >= 0) {
      isNotifying = true;
      blinkCount = 0;
      soundCount = 0;
      ledYellowState = true;
      lastBlinkTime = currentMillis;
      lastSoundTime = currentMillis;
      vibrationDuringNotify = false; // Resetear la validación de la vibración

      if (msg.indexOf("NOTIFY_MED") >= 0) {
        notifyType = "MED";
        medPhase = 1;
        phaseStartTime = currentMillis;
        phaseWaiting = false;
        phaseEventSent = false;
        updateTrafficLight(LOW, LOW, HIGH); // Verde inicialmente para Fase 1
        printLCD("Recordatorio MED", "Toca TOTEM");
        sendJsonEvent("medication_system", "in_range", "medication");
      } else {
        notifyType = "ACT";
        updateTrafficLight(LOW, HIGH, LOW); // Amarillo inicialmente
        printLCD("Recordatorio:", "Camina un poco!");
      }
    }
  }

  // =========================================================================
  // PROCESAMIENTO DE NOTIFICACIONES ACTIVAS (Blink & Sonido)
  // =========================================================================
  if (isNotifying) {
    if (notifyType == "MED") {
      // Manejo de Fases de Medicación
      if (!phaseWaiting) {
        // Ejecutando fase actual (15 segundos)
        if (currentMillis - phaseStartTime < 15000) {
          // Parpadeo de semáforo según fase
          if (currentMillis - lastBlinkTime >= 500) {
            ledYellowState = !ledYellowState;
            if (medPhase == 1) updateTrafficLight(LOW, LOW, ledYellowState);
            else if (medPhase == 2) updateTrafficLight(LOW, ledYellowState, LOW);
            else if (medPhase == 3) updateTrafficLight(ledYellowState, LOW, LOW);
            lastBlinkTime = currentMillis;
          }

          // Sonido: 1 pitido cada 1.5 segundos
          if (currentMillis - lastSoundTime >= 1500) {
            tone(BUZZER_PIN, 1200, 100);
            lastSoundTime = currentMillis;
          }

          // Mostrar mensaje de instrucción
          printLCD("Recordatorio MED", "Presiona TOTEM");
        } else {
          // Fin de los 15 segundos activos, pasar a pausa de 10s
          if (medPhase < 3) {
            phaseWaiting = true;
            phaseStartTime = currentMillis; 
            updateTrafficLight(LOW, LOW, LOW); // Apagar semáforo durante pausa
          } else {
            // Terminó la fase 3 (15s), ya no suena más.
            if (!phaseEventSent) {
              dailyScore -= 30; // Castigo por ignorar completamente
              sendJsonEvent("medication_system", "schedule_passed_urgent", "medication");
              phaseEventSent = true;
              isNotifying = false;
              vibrationDuringNotify = false;
              updateGlobalTrafficLight();
              printLCD("Monitoreando", "Actividad Abuelo");
            }
          }
        }
      } else {
        // Estamos en pausa de 10 segundos
        if (currentMillis - phaseStartTime < 10000) {
          printLCD("En pausa...", "Presiona TOTEM");
        } else {
          // Fin de la pausa, siguiente fase
          medPhase++;
          phaseWaiting = false;
          phaseStartTime = currentMillis;
          phaseEventSent = false;
          
          if (medPhase == 2) {
            sendJsonEvent("medication_system", "second_attempt", "medication");
          } 
        }
      }
      
      // Validación: Requiere presionar Touch
      bool currentTouchState = digitalRead(TOUCH_TOTEM_PIN);
      if (currentTouchState == HIGH && lastTouchState == LOW) {
        isNotifying = false;
        vibrationDuringNotify = false;
        
        if (medPhase == 1) dailyScore -= 0;
        else if (medPhase == 2) dailyScore -= 10;
        else if (medPhase == 3) dailyScore -= 20;

        updateGlobalTrafficLight();
        printLCD("Entendido!", "Medicina Tomada");
        
        tone(BUZZER_PIN, 1500, 150);
        delay(200);
        tone(BUZZER_PIN, 2000, 200);
        
        String attemptMsg = "taken_attempt_" + String(medPhase);
        sendJsonEvent("touch_totem", attemptMsg, "medication");
        
        delay(2000);
        printLCD("Monitoreando", "Actividad Abuelo");
      }
      lastTouchState = currentTouchState;

    } else if (notifyType == "ACT") {
      // Lógica original para Actividad
      if (currentMillis - lastBlinkTime >= 500) {
        ledYellowState = !ledYellowState;
        updateTrafficLight(LOW, ledYellowState, LOW);
        lastBlinkTime = currentMillis;
        blinkCount++;
        
        if (blinkCount >= 20) {
          isNotifying = false;
          updateGlobalTrafficLight(); 
          printLCD("Monitoreando", "Actividad Abuelo");
        }
      }
      
      if (soundCount == 0) {
        tone(BUZZER_PIN, 800, 600);
        soundCount++;
      }
      
      // Cancelar notificación de actividad solo con Touch
      bool currentTouchState = digitalRead(TOUCH_TOTEM_PIN);
      if (lastTouchState == LOW && currentTouchState == HIGH) {
        isNotifying = false;
        updateGlobalTrafficLight();
        printLCD("Entendido!", "Gracias Manuel");
        
        tone(BUZZER_PIN, 1500, 150);
        delay(200);
        tone(BUZZER_PIN, 2000, 200);
        
        sendJsonEvent("touch_totem", "reminder_acknowledged", "ritual");
        
        delay(2000);
        printLCD("Monitoreando", "Actividad Abuelo");
      }
      lastTouchState = currentTouchState;
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
    dailyScore = 100; // Resetear puntaje
    updateGlobalTrafficLight();
    printLCD("Nuevo Dia", "Rutina Reiniciada");
    delay(2000);
  }

  // =========================================================================
  // CASO 1 & 6: MEDICACIÓN (Vibración)
  // =========================================================================
  
  if (medVibrated) {
    if (isNotifying && notifyType == "MED") {
      vibrationDuringNotify = true;
      medVibrated = false;
    } else if (currentMillis - lastVibHandledMs < 2000) {
      medVibrated = false;
    } else {
      lastVibHandledMs = currentMillis;
      Serial.println("📳 [DEBUG] Vibración detectada, procesando...");
      delay(120);
      
      // Sin alerta por duplicación: cualquier vibración se toma como confirmación simple.
      isTaken = true;
      printLCD("Medicina OK", "Buen trabajo");
      tone(BUZZER_PIN, 600, 200); // Beep de confirmación positiva
      sendJsonEvent("vib_sensor", "confirmed_taken", "medication");
      delay(2000);
      printLCD("Monitoreando", "Actividad Abuelo");
      updateGlobalTrafficLight();
      medVibrated = false;
    }
  }

  // =========================================================================
  // CASO 2: SEDENTARISMO (Sillón / HC-SR04)
  // =========================================================================
  
  float distSofa = getDistance(TRIG_SOFA, ECHO_SOFA);
  if (distSofa > 0 && distSofa < DIST_SOFA_THRESHOLD) {
    if (!isSitting) {
      isSitting = true;
      sedentaryStartTime = currentMillis;
      sendJsonEvent("sofa_ultrasonic", "sesion_inicio", "activity", "\"lugar\":\"sofa\",\"fase\":\"sentado\"");
    } else if (!sedentaryAlertSent && (currentMillis - sedentaryStartTime >= ONE_HOUR_MS)) {
      // Alerta Sedentarismo 
      updateTrafficLight(LOW, HIGH, LOW); // Semáforo Amarillo
      tone(BUZZER_PIN, 440, 2000); // Zumbido tenue y prolongado para avisar
      printLCD("Sedentarismo!", "Ponte de pie");
      sendJsonEvent("sofa_ultrasonic", "sedentary_alert", "activity", "\"lugar\":\"sofa\",\"fase\":\"alerta_sedentarismo\"");
      sedentaryAlertSent = true;
    }
  } else if (distSofa >= DIST_SOFA_THRESHOLD) {
    if (isSitting) {
      unsigned long duracion = (currentMillis - sedentaryStartTime) / 1000;
      if (duracion >= 3) {
        sendJsonEvent(
          "sofa_ultrasonic",
          "sesion_fin",
          "activity",
          "\"lugar\":\"sofa\",\"fase\":\"levantado\",\"duracion_seg\":" + String(duracion));
      }
      updateGlobalTrafficLight(); // Vuelve al estado global
      printLCD("Monitoreando", "Actividad Abuelo");
    }
    isSitting = false;
    sedentaryAlertSent = false;
  }

  // =========================================================================
  // CASO 3: PRESENCIA ESTÁTICA (PIR Robusto)
  // =========================================================================
  
  if (digitalRead(PIR_PIN) == HIGH) {
    if (lockLow) {
      lockLow = false;
      pirActive = true;
      movementCheckFullfilled = true; // Acumular para Caso 7
      sendJsonEvent("pir_sensor", "motion_detected", "activity", "\"lugar\":\"sala\",\"fase\":\"movimiento\"");
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
    }
  }

  // =========================================================================
  // CASO 4: ALIMENTACIÓN (NEVERA LASER I2C)
  // =========================================================================
  
  if (lox.isRangeComplete()) {
    int distance_mm = lox.readRange();
    // Umbral reducido a 300mm para mayor sensibilidad
    if (distance_mm > 300) { 
      if (!isFridgeOpen) {
        printLCD("Nevera", "PUERTA ABIERTA");
        isFridgeOpen = true;
        fridgeOpenTime = currentMillis;
      }
    } else {
      if (isFridgeOpen) {
        unsigned long duracion = (currentMillis - fridgeOpenTime) / 1000; // Segundos abierta
        printLCD("Nevera Cerrada", "Duree: " + String(duracion) + "s");
        isFridgeOpen = false;
        fridgeCheckFullfilled = true; // Acumular para Caso 7
        sendJsonEvent("fridge_laser", "closed_duration_" + String(duracion) + "s", "activity",
                      "\"lugar\":\"cocina\",\"fase\":\"nevera_cerrada\"");
        delay(1500);
        printLCD("Monitoreando", "Actividad Abuelo");
      }
    }
  }

  // =========================================================================
  // CASO 5: TÓTEM (TOUCH) - FUERA DE NOTIFICACIONES
  // =========================================================================
  
  if (!isNotifying) {
    bool currentTouchState = digitalRead(TOUCH_TOTEM_PIN);
    if (lastTouchState == LOW && currentTouchState == HIGH) {
      // Abuelo puso su dedo en el Touch. 
      // Aquí podrías opcionalmente leer `analogRead(HEART_RATE_PIN)` para enviar su pulso cardíaco
      
      updateGlobalTrafficLight();
      tone(BUZZER_PIN, 800, 300); // Beep feliz de check-in
      printLCD("Todo Bien", "Buen dia Abuelo!");
      
      totemCheckFullfilled = true; // Acumular para Caso 7
      {
        String ritualEstado = "well_being_confirmed";
        if (beatAvg > 35 && beatAvg < 200) {
          ritualEstado = String("well_being_BPM_") + String(beatAvg);
        }
        sendJsonEvent("touch_totem", ritualEstado, "ritual", "\"metrica\":\"ritual_bienestar\",\"lugar\":\"totem\"");
      }
      
      Serial.print("❤️ [RITUAL] Ritmo Cardíaco: "); Serial.print(beatAvg); Serial.println(" BPM");
      
      delay(3000);
      printLCD("Monitoreando", "Actividad Abuelo");
    }
    lastTouchState = currentTouchState;
  }

  // =========================================================================
  // CASO 7: CERTEZA COMPLETA (MULTI-EVIDENCIA)
  // =========================================================================
  
  if (!routineNotifiedToday && movementCheckFullfilled && fridgeCheckFullfilled && totemCheckFullfilled) {
    sendJsonEvent("multi_evidence_system", "routine_completed_high_certainty", "activity");
    routineNotifiedToday = true;
  }

  // Telemetría de pulso para gráficas (sin depender solo del toque en tótem)
  if (beatAvg > 40 && beatAvg < 200 && (currentMillis - lastBpmTelemetryMs > 22000)) {
    sendJsonEvent("max30105", String("BPM_") + String(beatAvg), "ritual", "\"metrica\":\"pulso_bpm\",\"lugar\":\"totem\"");
    lastBpmTelemetryMs = currentMillis;
  }

  delay(25);
}

// -------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// -------------------------------------------------------------------------

/**
 * SW-420 típico: reposo LOW, vibración HIGH.
 * Menos sensible: HIGH estable varias lecturas + tiempo mínimo largo entre detecciones.
 */
void pollVibrationSensitive() {
  int v = digitalRead(VIB_MED_PIN);
  unsigned long t = millis();
  static uint8_t highStreak = 0;

  if (v == HIGH) {
    if (highStreak < 30) highStreak++;
  } else {
    highStreak = 0;
    lastVibPinLevel = 0;
    return;
  }

  // Menos sensible: exige ~14 lecturas HIGH seguidas (~350 ms) y mayor pausa entre detecciones.
  if (highStreak >= 14 && lastVibPinLevel == 0 && (t - lastVibEdgeMs >= 1200)) {
    medVibrated = true;
    lastVibEdgeMs = t;
    lastVibPinLevel = 1;
    highStreak = 0;
  }
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

// Genera JSON puro (dataExtras: pares JSON ya escapados, p.ej. "\"lugar\":\"sofa\",\"fase\":\"sentado\"")
void sendJsonEvent(String sensorId, String value, String module, String dataExtras) {
  String jsonPayload = "{";
  jsonPayload += "\"token\": \"CASA10\", "; // Inyectamos el Token de Manuel que conversamos
  jsonPayload += "\"modulo\": \"" + module + "\", ";
  
  jsonPayload += "\"data\": {";
  jsonPayload += "\"sensor_id\": \"" + sensorId + "\", ";
  jsonPayload += "\"estado\": \"" + value + "\"";
  if (dataExtras.length() > 0) {
    jsonPayload += ", ";
    jsonPayload += dataExtras;
  }
  jsonPayload += "}}";
  
  Serial.println(jsonPayload); // Para monitorearlo en el PC por cable USB
  Serial1.println(jsonPayload); // Para enviarlo inalámbricamente vía Bluetooth
}
