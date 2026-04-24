void setup() {
  // 1. Iniciar la comunicación con la PC por USB
  Serial.begin(9600);
  
  // Esperar a que el puerto serial del PC esté listo (recomendado en el R4)
  while (!Serial) {
    ; 
  }
  
  // 2. Iniciar la comunicación de hardware con el HC-05 en pines 0 y 1
  // La velocidad por defecto de comunicación del HC-05 es 9600 baudios
  Serial1.begin(9600); 

  Serial.println("Puente Serial iniciado.");
  Serial.println("Abre una App de terminal Bluetooth en tu celular, conéctate y envía un mensaje.");
}

void loop() {
  // Si entra un dato por Bluetooth (HC-05), envíalo a la consola del PC
  if (Serial1.available()) {
    char datoBluetooth = Serial1.read();
    Serial.write(datoBluetooth);
  }

  // Si escribes algo en la consola del PC, envíalo por Bluetooth al celular
  if (Serial.available()) {
    char datoPC = Serial.read();
    Serial1.write(datoPC);
  }
}