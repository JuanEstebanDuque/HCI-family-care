#include <ESP8266WiFi.h>
#include <ESP8266WiFiMulti.h>
#include <ESP8266HTTPClient.h>

ESP8266WiFiMulti wifiMulti;

// =========================================================================
// CONFIGURACIÓN DE RED Y SERVIDOR
// =========================================================================

// Esta es la ruta hacia tu computadora. Dejé la IP exacta que buscamos antes.
const String serverName = "http://192.168.1.96:3000/events/arduino";

// =========================================================================
// CÓDIGO PRINCIPAL DEL ESP8266 (ESP-01)
// =========================================================================

void setup() {
  // Inicializamos LOS MISMOS PINES de comunicación que usará contra el Arduino
  // La velocidad (115200) debe coincidir con el Serial.begin del arduino_device.ino
  Serial.begin(115200);

  // Registrar todas las redes posibles. Él escaneará y se conectará a la más fuerte.
  // ⚠️ TRUCO PARA ICESI: Usa los datos anclados de tu celular, las redes de Unv. tienen seguridad empresarial.
  wifiMulti.addAP("WIFI_DE_TU_CASA", "Contrasena_Casa");
  wifiMulti.addAP("WIFI_COMPARTIDO_CELULAR", "Contrasena_Celular");

  // Arrancar conexión silenciosa inteligente
  while (wifiMulti.run() != WL_CONNECTED) {
    delay(500);
  }
  // Enviar señal de éxito inicial al Arduino
  Serial.println("WIFI_ON");
}

void loop() {
  // Comprobar si hay internet activo (Soporta caídas e intentos automáticos)
  if (wifiMulti.run() == WL_CONNECTED) {
    
    // Comprueba silenciosamente si el Arduino le está mandando datos por el cable RX
    if (Serial.available() > 0) {
      
      // Lee todo el renglón de texto JSON
      String jsonPayload = Serial.readStringUntil('\n');
      jsonPayload.trim(); 
      
      // Si el texto parece un JSON válido, procedemos a mandarlo a Mongo Atlas
      if(jsonPayload.length() > 5 && jsonPayload.startsWith("{")) {
        
        // Configurar la llamada web
        WiFiClient client;
        HTTPClient http;
        http.begin(client, serverName); 
        http.addHeader("Content-Type", "application/json"); 
        
        // ¡Se dispara el evento a NestJS!
        int httpResponseCode = http.POST(jsonPayload);
        
        http.end(); // Liberamos la memoria del ESP8266
      }
    }
  } else {
    // Si la genta apaga el Wi-Fi, avisa al Arduino y entra en bucle de espera
    Serial.println("WIFI_OFF");
    delay(5000); // Darle tiempo antes de escanear de nuevo
    
    // Si el MultiWiFi logra volver a enganchar alguna red
    if (wifiMulti.run() == WL_CONNECTED) {
      Serial.println("WIFI_ON");
    }
  }
}
