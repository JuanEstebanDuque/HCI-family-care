#include <Arduino.h>

// =========================================================================
// DEFINICIÓN DE PINES (Adaptar según el cableado físico)
// =========================================================================

// Entrada
const int TILT_MED_PIN   = 2;  // Interrupt 0 (Frasco de pastillas)
const int PIR_PIN        = 3;  // Sensor de movimiento (Sala/Cocina)
const int TRIG_SOFA      = 4;  // HC-SR04 Trigger (Sofá)
const int ECHO_SOFA      = 5;  // HC-SR04 Echo (Sofá)
const int TRIG_VASO      = 6;  // HC-SR04 Trigger (Vaso de agua)
const int ECHO_VASO      = 7;  // HC-SR04 Echo (Vaso de agua)
const int LDR_FRIDGE_PIN = A0; // Fotorresistencia (Nevera - Entrada analógica)
const int BTN_TOTEM_PIN  = 10; // Botón físico del Tótem

// Salida
const int BUZZER_PIN     = 8;  // Passive Buzzer
const int LED_RED_MED    = 9;  // LED Rojo (Advertencia medicación)
const int LED_RGB_R      = 11; // LED RGB Tótem (Rojo)
const int LED_RGB_G      = 12; // LED RGB Tótem (Verde)
const int LED_RGB_B      = 13; // LED RGB Tótem (Azul)

// =========================================================================
// CONSTANTES Y UMBRALES
// =========================================================================

const unsigned long ONE_HOUR_MS = 3600000UL;
const unsigned long TWO_MIN_MS  = 120000UL;
const unsigned long RESET_TIME_MS = 86400000UL;

const float DIST_SOFA_THRESHOLD = 50.0; // cm para considerar sentado
const float DIST_VASO_THRESHOLD = 10.0; // cm para considerar vaso levantado
const int   LDR_UMBRAL          = 500;  // Umbral de luz (Ajustar según luz interna de nevra)

// =========================================================================
// VARIABLES DE ESTADO Y TEMPORIZADORES
// =========================================================================

// Tiempos globales
unsigned long currentMillis = 0;
unsigned long lastResetTime = 0;

// Caso 1 & 6: Medicación y Duplicación
volatile bool tiltTriggered = false;
bool isTaken = false;
unsigned long tiltTime = 0;
bool pendingGlassCheck = false;

// Caso 2: Sedentarismo
unsigned long sedentaryStartTime = 0;
bool isSitting = false;
bool sedentaryAlertSent = false;

// Caso 3: Presencia (Heartbeat)
unsigned long lastSeenTime = 0;
bool pirActive = false;
bool movementCheckFullfilled = false; // Para Caso 7

// Caso 4: Nevera
bool isFridgeOpen = false;
unsigned long fridgeOpenTime = 0;
bool fridgeCheckFullfilled = false; // Para Caso 7

// Caso 5: Tótem
bool lastBtnState = HIGH;
bool totemCheckFullfilled = false; // Para Caso 7

// Caso 7: Multi-evidencia (Routine Tracker)
bool routineNotifiedToday = false;

// Prototipos
void handleTiltInterrupt();
float getDistance(int trigPin, int echoPin);
void sendJsonEvent(String sensorId, String value, String module);
void setRGBColor(int r, int g, int b);

void setup() {
  Serial.begin(115200);

  // Configuración de Entradas
  pinMode(TILT_MED_PIN, INPUT_PULLUP);
  pinMode(PIR_PIN, INPUT);
  pinMode(LDR_FRIDGE_PIN, INPUT);
  pinMode(BTN_TOTEM_PIN, INPUT_PULLUP);
  
  pinMode(TRIG_SOFA, OUTPUT);
  pinMode(ECHO_SOFA, INPUT);
  pinMode(TRIG_VASO, OUTPUT);
  pinMode(ECHO_VASO, INPUT);

  // Configuración de Salidas
  pinMode(BUZZER_PIN, OUTPUT);
  pinMode(LED_RED_MED, OUTPUT);
  pinMode(LED_RGB_R, OUTPUT);
  pinMode(LED_RGB_G, OUTPUT);
  pinMode(LED_RGB_B, OUTPUT);

  // Interrupción del Tilt (Hardware)
  attachInterrupt(digitalPinToInterrupt(TILT_MED_PIN), handleTiltInterrupt, FALLING);

  // Inicializar tiempo base
  lastResetTime = millis();
}

void loop() {
  currentMillis = millis();

  // Reset diario de variables (Para nueva rutina diaria)
  if (currentMillis - lastResetTime >= RESET_TIME_MS) {
    isTaken = false;
    routineNotifiedToday = false;
    movementCheckFullfilled = false;
    fridgeCheckFullfilled = false;
    totemCheckFullfilled = false;
    lastResetTime = currentMillis;
  }

  // =========================================================================
  // CASO 1 & 6: MEDICACIÓN, DUPLICACIÓN Y DOBLE VALIDACIÓN
  // =========================================================================
  
  if (tiltTriggered) {
    delay(150); // Debounce
    
    if (isTaken) {
      // Caso 6: Riesgo de Duplicación
      digitalWrite(LED_RED_MED, HIGH);
      tone(BUZZER_PIN, 1000, 1000); 
      delay(1000);
      digitalWrite(LED_RED_MED, LOW);
      sendJsonEvent("tilt_switch", "duplication_warning", "medication");
    } else {
      // Caso 1: Inicio de rutina de medicación
      tiltTime = currentMillis;
      pendingGlassCheck = true;
      sendJsonEvent("tilt_switch", "bottle_moved_wait_glass", "medication");
    }
    tiltTriggered = false;
  }

  // Comprobar vaso de agua dentro de los 2 minutos (Caso 1)
  if (pendingGlassCheck) {
    float distVaso = getDistance(TRIG_VASO, ECHO_VASO);
    
    if (distVaso > DIST_VASO_THRESHOLD && distVaso > 0) {
      // El vaso fue levantado con éxito
      isTaken = true;
      pendingGlassCheck = false;
      sendJsonEvent("water_glass", "confirmed_taken", "medication");
    } else if (currentMillis - tiltTime > TWO_MIN_MS) {
      // Pasaron 2 minutos y no levantó el vaso
      pendingGlassCheck = false;
      sendJsonEvent("water_glass", "incomplete_confirmation", "medication");
    }
  }

  // =========================================================================
  // CASO 2: SEDENTARISMO
  // =========================================================================
  
  float distSofa = getDistance(TRIG_SOFA, ECHO_SOFA);
  if (distSofa > 0 && distSofa < DIST_SOFA_THRESHOLD) {
    if (!isSitting) {
      isSitting = true;
      sedentaryStartTime = currentMillis;
    } else if (!sedentaryAlertSent && (currentMillis - sedentaryStartTime >= ONE_HOUR_MS)) {
      // Alerta suave (Buzzer 440 Hz)
      tone(BUZZER_PIN, 440, 2000);
      sendJsonEvent("sofa_ultrasonic", "sedentary_alert", "activity");
      sedentaryAlertSent = true;
    }
  } else if (distSofa >= DIST_SOFA_THRESHOLD) {
    if (isSitting) {
      sendJsonEvent("sofa_ultrasonic", "activity_resumed", "activity");
    }
    isSitting = false;
    sedentaryAlertSent = false;
  }

  // =========================================================================
  // CASO 3: FALTA DE RESPUESTA Y PRESENCIA (PIR)
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
  // CASO 4: ALIMENTACIÓN (NEVERA LDR)
  // =========================================================================
  
  int ldrValue = analogRead(LDR_FRIDGE_PIN);
  if (ldrValue > LDR_UMBRAL) { // Asumiendo más luz = puerta abierta
    if (!isFridgeOpen) {
      isFridgeOpen = true;
      fridgeOpenTime = currentMillis;
    }
  } else {
    if (isFridgeOpen) {
      unsigned long duracion = (currentMillis - fridgeOpenTime) / 1000; // En segundos
      isFridgeOpen = false;
      fridgeCheckFullfilled = true; // Acumular para Caso 7
      
      // Enviar duración de la apertura
      sendJsonEvent("fridge_sensor", "closed_duration_" + String(duracion) + "s", "activity");
    }
  }

  // =========================================================================
  // CASO 5: EL TÓTEM DEL RITUAL
  // =========================================================================
  
  bool currentBtnState = digitalRead(BTN_TOTEM_PIN);
  if (lastBtnState == HIGH && currentBtnState == LOW) {
    // Botón presionado. Feedback cálido naranja (aprox rgb 255,100,0)
    setRGBColor(255, 100, 0);
    delay(3000);
    setRGBColor(0, 0, 0); // Apagar
    
    totemCheckFullfilled = true; // Acumular para Caso 7
    sendJsonEvent("totem_button", "well_being_confirmed", "ritual");
  }
  lastBtnState = currentBtnState;

  // =========================================================================
  // CASO 7: CERTEZA COMPLETA (MULTI-EVIDENCIA)
  // =========================================================================
  
  if (!routineNotifiedToday && movementCheckFullfilled && fridgeCheckFullfilled && totemCheckFullfilled) {
    // Manuel se ha movido, comió algo y confirmó su estado. Nivel de certeza general comprobado.
    sendJsonEvent("multi_evidence_system", "routine_completed_high_certainty", "activity");
    routineNotifiedToday = true;
  }

  delay(100); // Estabilidad del bucle principal
}

// -------------------------------------------------------------------------
// FUNCIONES AUXILIARES
// -------------------------------------------------------------------------

void handleTiltInterrupt() {
  tiltTriggered = true; // ISR ligero
}

float getDistance(int trigPin, int echoPin) {
  digitalWrite(trigPin, LOW);
  delayMicroseconds(2);
  digitalWrite(trigPin, HIGH);
  delayMicroseconds(10);
  digitalWrite(trigPin, LOW);
  
  long duration = pulseIn(echoPin, HIGH, 25000); // 25ms timeout (~4m max)
  if (duration == 0) return -1.0;
  
  return (duration * 0.0343) / 2.0;
}

void setRGBColor(int r, int g, int b) {
  // Comportamiento de escritura para LEDs Ánodo o Cátodo 
  // (Asumiendo Cátodo Comun = HIGH enciende)
  analogWrite(LED_RGB_R, r);
  analogWrite(LED_RGB_G, g);
  analogWrite(LED_RGB_B, b);
}

// Genera el payload JSON que será leído vía Serial por el ESP32 / Backend NestJS
void sendJsonEvent(String sensorId, String value, String module) {
  String jsonPayload = "{";
  jsonPayload += "\"sensor_id\": \"" + sensorId + "\", ";
  jsonPayload += "\"value\": \"" + value + "\", ";
  jsonPayload += "\"module\": \"" + module + "\"";
  jsonPayload += "}";
  
  Serial.println(jsonPayload);
}
