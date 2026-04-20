#include <Wire.h>
#include <LiquidCrystal_I2C.h>
#include "Adafruit_VL53L0X.h"
#include "MAX30105.h"  // Librería SparkFun para el sensor
#include "heartRate.h" // Librería de SparkFun para el algoritmo de pulsaciones

// Pines Digitales
const int TOUCH_TOTEM_PIN  = 2;
const int PIR_PIN          = 3;
const int VIB_MED_PIN      = 4;
const int TRIG_SOFA        = 6;
const int ECHO_SOFA        = 7;
const int LED_RED_TRAFFIC  = 11;
const int LED_YEL_TRAFFIC  = 12;
const int LED_GRN_TRAFFIC  = 13;

// Pines Analógicos
const int POT_PIN          = A1; // Potenciómetro
const int BUZZER_PIN       = A2; // Zumbador

// Instancias I2C
LiquidCrystal_I2C lcd(0x27, 16, 2); 
Adafruit_VL53L0X lox = Adafruit_VL53L0X();
MAX30105 particleSensor;

// Variable para el sensor de vibración (capturado muy rápido)
volatile bool vibraDetectada = false;

// Variables de ritmo cardíaco
const byte RATE_SIZE = 4; // Promedio de latidos
byte rates[RATE_SIZE];
byte rateSpot = 0;
long lastBeat = 0; // Tiempo en el que ocurrió el último latido
int beatsPerMinute = 0;
int beatAvg = 0;

// Temporizador para evitar usar el venenoso delay()
unsigned long ultimoPrint = 0;

void setupVibracion() {
  vibraDetectada = true;
}

void setup() {
  Serial.begin(115200);
  while(!Serial); // Espera a que abras el monitor serie
  
  Serial.println("===============================================");
  Serial.println("   INICIANDO DIAGNÓSTICO MAESTRO DE HARDWARE     ");
  Serial.println("===============================================");
  
  // 1. PINES BÁSICOS
  pinMode(TOUCH_TOTEM_PIN, INPUT);
  pinMode(PIR_PIN, INPUT);
  pinMode(VIB_MED_PIN, INPUT);
  pinMode(TRIG_SOFA, OUTPUT);
  pinMode(ECHO_SOFA, INPUT);
  
  pinMode(LED_RED_TRAFFIC, OUTPUT);
  pinMode(LED_YEL_TRAFFIC, OUTPUT);
  pinMode(LED_GRN_TRAFFIC, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  
  attachInterrupt(digitalPinToInterrupt(VIB_MED_PIN), setupVibracion, RISING);

  // 2. PRUEBA VISUAL / SONORA
  Serial.println("Probando Zumbador y Semáforo...");
  digitalWrite(LED_RED_TRAFFIC, HIGH);   tone(BUZZER_PIN, 500, 200); delay(300);
  digitalWrite(LED_YEL_TRAFFIC, HIGH);   tone(BUZZER_PIN, 800, 200); delay(300);
  digitalWrite(LED_GRN_TRAFFIC, HIGH);   tone(BUZZER_PIN, 1200, 200); delay(300);
  digitalWrite(LED_RED_TRAFFIC, LOW); digitalWrite(LED_YEL_TRAFFIC, LOW); digitalWrite(LED_GRN_TRAFFIC, LOW);

  // 3. PRUEBA BUS I2C (Escáner de direcciones)
  Serial.println("Escaneando Bus I2C transversal...");
  Wire.begin();
  byte error, address;
  int nDevices = 0;
  for(address = 1; address < 127; address++ ) {
    Wire.beginTransmission(address);
    error = Wire.endTransmission();
    if (error == 0) {
      Serial.print(" -> Dispositivo I2C ENCONTRADO en la dirección 0x");
      if (address < 16) Serial.print("0");
      Serial.println(address, HEX);
      nDevices++;
    }
  }
  if (nDevices == 0) Serial.println(" -> ERROR: ¡Ningún dispositivo I2C! Revisa cables SDA/SCL.");
  else Serial.println(" -> Escaneo I2C Finalizado con Éxito.");
  
  // 4. INICIAR PANTALLA LCD
  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("TEST DE HARDWARE");
  lcd.setCursor(0, 1);
  lcd.print("Mirar Monitor PC");

  // 5. INICIAR LASER VL53L0X
  Serial.println("Probando Láser de Nevera...");
  if (!lox.begin()) {
    Serial.println(" -> FALLO: No se pudó inicializar el VL53L0X.");
  } else {
    Serial.println(" -> ÉXITO: Láser VL53L0X arrancado.");
    lox.startRangeContinuous();
  }
  
  // 6. INICIAR SENSOR CARDÍACO
  Serial.println("Probando Oximetro...");
  if (!particleSensor.begin(Wire, I2C_SPEED_FAST)) { // Intenta a 400kHz
    Serial.println(" -> FALLO: Oximetro MAX30102 no encontrado.");
  } else {
    Serial.println(" -> ÉXITO: Oximetro MAX30102 encendido.");
    particleSensor.setup(); // Configura settings por defecto
    particleSensor.setPulseAmplitudeRed(0x0A); // Enciende Led Rojo bajo para indicar que funciona
  }

  Serial.println("===============================================");
  Serial.println(" INICIANDO LECTURA EN VIVO (Mueve los sensores)");
  Serial.println("===============================================");
  delay(2000);
}

void loop() {
  // LECTURA ULTRA RÁPIDA (Sin bloqueos)
  long irValue = particleSensor.getIR();
  
  // Algoritmo matemático para reconocer un latido
  if (checkForBeat(irValue) == true) {
    long delta = millis() - lastBeat;
    lastBeat = millis();

    beatsPerMinute = 60 / (delta / 1000.0);
    if (beatsPerMinute < 255 && beatsPerMinute > 20) {
      rates[rateSpot++] = (byte)beatsPerMinute;
      rateSpot %= RATE_SIZE;
      // Promediar
      beatAvg = 0;
      for (byte x = 0; x < RATE_SIZE; x++) beatAvg += rates[x];
      beatAvg /= RATE_SIZE;
    }
  }

  // 1. HC-SR04 Sofá
  digitalWrite(TRIG_SOFA, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_SOFA, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_SOFA, LOW);
  long duracion = pulseIn(ECHO_SOFA, HIGH, 15000); 
  float distancia_sofa = (duracion == 0) ? -1.0 : (duracion * 0.0343) / 2.0;

  // Solo imprimir resultados cada 1 segundo usando millis
  if (millis() - ultimoPrint > 1000) {
    ultimoPrint = millis();

    // 2. Láser I2C Nevera
    int distancia_laser = -1;
    if (lox.isRangeComplete()) distancia_laser = lox.readRange();

    bool touchState = digitalRead(TOUCH_TOTEM_PIN);
    bool pirState   = digitalRead(PIR_PIN);
    int potValue    = analogRead(POT_PIN);

    // Armar impresión estructurada 
    Serial.println("================ ESTADO EN VIVO ================");
    Serial.print("👉 [Touch/Botón]   : "); Serial.println(touchState ? "¡TOCADO!" : "Suelto");
    Serial.print("🏃 [PIR Motion]    : "); Serial.println(pirState ? "¡MOVIMIENTO!" : "Tranquilo");
    
    if (vibraDetectada) {
      Serial.println("💊 [Pastillero]    : ¡VIBRACIÓN DETECTADA!");
      vibraDetectada = false; 
    } else {
      Serial.println("💊 [Pastillero]    : Quieto");
    }

    Serial.print("🛋️ [Sofá Ultra]    : "); Serial.print(distancia_sofa); Serial.println(" cm");
    Serial.print("❄️ [Nevera Láser]  : "); Serial.print(distancia_laser); Serial.println(" mm");
    Serial.print("⏱️ [Potenciómetro] : "); Serial.println(potValue);
    
    // Status del Corazón
    if (irValue < 50000) {
      Serial.println("❤️ [Oximetro I2C]  : Pon tu dedo sobre el lente");
    } else {
      Serial.print("❤️ [Oximetro I2C]  : MIDIENDO... Promedio: ");
      Serial.print(beatAvg);
      Serial.println(" BPM");
    }
    Serial.println("------------------------------------------------\n");
    
    // Feedback Pantalla
    lcd.setCursor(0, 1);
    lcd.print("Ritmo: " + String(beatAvg) + " BPM   ");
  }
}
