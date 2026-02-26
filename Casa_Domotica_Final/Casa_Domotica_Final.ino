#include <WiFi.h>
#include <WebServer.h>
#include <SPI.h>
#include <MFRC522.h>
#include <LiquidCrystal_I2C.h>
#include "DHT.h"
#include <ESP32Servo.h>

// --- ELIMINADAS LAS IPS ESTÁTICAS ---

// 1. CONFIGURACIÓN
const char* ssid = "Redmi 14C";
const char* password = "vale1234";

#define PIN_LDR      34
#define PIN_LED1     13
#define PIN_LED2     14
#define PIN_LED3     27
#define PIN_FAN      32
#define PIN_BUZZER   33
#define PIN_SERVO    25
#define PIN_DHT      26
#define PIN_RFID_SS  5
#define PIN_RFID_RST 16

// 2. INSTANCIAS
WebServer server(80);
DHT dht(PIN_DHT, DHT11);
Servo puertaServo;
MFRC522 rfid(PIN_RFID_SS, PIN_RFID_RST);
LiquidCrystal_I2C lcd(0x27, 16, 2);

bool isAutoMode = true; 
byte authorizedUID[4] = {0xEA, 0x66, 0xCC, 0x01};

// 3. FUNCIONES AUXILIARES
void sendCORS(int code, String payload, const char* type = "text/plain") {
  server.sendHeader("Access-Control-Allow-Origin", "*");
  server.send(code, type, payload);
}

void abrirPuertaAction() {
  puertaServo.attach(PIN_SERVO);
  puertaServo.write(110);
  delay(2000);
  puertaServo.write(0);
  delay(500);
  puertaServo.detach();
}

void activarBuzzerDenegado() {
  digitalWrite(PIN_BUZZER, HIGH);
  delay(1000);
  digitalWrite(PIN_BUZZER, LOW);
}

void updateLCD(float t, float h) {
  lcd.setCursor(0, 0);
  lcd.print("Temp: " + String(t, 1) + "C  ");
  lcd.setCursor(0, 1);
  lcd.print("Hum:  " + String(h, 1) + "%  ");
}

void initHardware() {
  pinMode(PIN_LED1, OUTPUT); pinMode(PIN_LED2, OUTPUT); pinMode(PIN_LED3, OUTPUT);
  pinMode(PIN_FAN, OUTPUT); pinMode(PIN_BUZZER, OUTPUT);
  pinMode(PIN_LDR, INPUT);
  SPI.begin();
  rfid.PCD_Init();
  dht.begin();
}

// NUEVA FUNCIÓN DE RED (DINÁMICA)
void initNetwork() {
  WiFi.begin(ssid, password);
  
  Serial.print("Conectando a ");
  Serial.println(ssid);
  
  int counter = 0;
  while (WiFi.status() != WL_CONNECTED) { 
    delay(500); 
    Serial.print("."); 
    // Mostrar progreso en LCD
    lcd.setCursor(counter % 16, 1);
    lcd.print(".");
    counter++;
  }
  
  // Al conectar, mostramos la IP asignada por DHCP
  String ipActual = WiFi.localIP().toString();
  Serial.println("\nConectado con éxito!");
  Serial.println("IP Asignada: " + ipActual);
  
  lcd.clear();
  lcd.setCursor(0, 0);
  lcd.print("IP Asignada:");
  lcd.setCursor(0, 1);
  lcd.print(ipActual); // Esto te permite ver la IP sin el PC
  delay(3000);
}

// 4. LÓGICA AUTOMÁTICA
void handleRfidAuto() {
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  Serial.print(">> [RFID]: Tarjeta detectada. UID:");
  for (byte i = 0; i < rfid.uid.size; i++) {
    Serial.print(rfid.uid.uidByte[i] < 0x10 ? " 0" : " ");
    Serial.print(rfid.uid.uidByte[i], HEX);
  }
  Serial.println();

  bool isAuthorized = true;
  for (byte i = 0; i < 4; i++) {
    if (rfid.uid.uidByte[i] != authorizedUID[i]) {
      isAuthorized = false; 
      break;
    }
  }

  if (isAuthorized) {
    Serial.println(">> [RFID]: Acceso Concedido.");
    abrirPuertaAction();
  } else {
    Serial.println(">> [RFID]: Acceso Denegado.");
    activarBuzzerDenegado();
  }

  rfid.PICC_HaltA();
  rfid.PCD_StopCrypto1();
}

void handleLuzAuto() {
  int valorLuz = analogRead(PIN_LDR);
  if (valorLuz > 1500) {
    digitalWrite(PIN_LED1, HIGH);
  } else {
    digitalWrite(PIN_LED1, LOW);
  }
}

void handleClimaAuto() {
  static unsigned long lastUpdate = 0;
  if (millis() - lastUpdate < 2000) return; 
  lastUpdate = millis();
  float t = dht.readTemperature();
  float h = dht.readHumidity();
  if (!isnan(t)) {
    updateLCD(t, h);
    digitalWrite(PIN_FAN, t < 25.0 ? HIGH : LOW);
  }
}

void runAutomaticLogic() {
  handleRfidAuto();
  handleLuzAuto();
  handleClimaAuto();
}

// 5. RUTAS DEL SERVIDOR
void setupRoutes() {
  server.on("/config/auto", []() { 
    isAutoMode = true; 
    sendCORS(200, "MODO AUTOMATICO ACTIVADO"); 
  });
  
  server.on("/config/manual", []() { 
    isAutoMode = false; 
    sendCORS(200, "MODO MANUAL ACTIVADO"); 
  });

  server.on("/led/1/on", []() { 
    if(!isAutoMode) { digitalWrite(PIN_LED1, HIGH); sendCORS(200, "LED 1 ON"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });
  
  server.on("/led/1/off", []() { 
    if(!isAutoMode) { digitalWrite(PIN_LED1, LOW); sendCORS(200, "LED 1 OFF"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });

  server.on("/led/2/on", []() { 
    if(!isAutoMode) { digitalWrite(PIN_LED2, HIGH); sendCORS(200, "LED 2 ON"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });

  server.on("/led/2/off", []() { 
    if(!isAutoMode) { digitalWrite(PIN_LED2, LOW); sendCORS(200, "LED 2 OFF"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });

  server.on("/led/3/on", []() { 
    if(!isAutoMode) { digitalWrite(PIN_LED3, HIGH); sendCORS(200, "LED 3 ON"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });

  server.on("/led/3/off", []() { 
    if(!isAutoMode) { digitalWrite(PIN_LED3, LOW); sendCORS(200, "LED 3 OFF"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });

  server.on("/fan/on", []() { 
    if(!isAutoMode) { digitalWrite(PIN_FAN, LOW); sendCORS(200, "FAN ON"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });

  server.on("/fan/off", []() { 
    if(!isAutoMode) { digitalWrite(PIN_FAN, HIGH); sendCORS(200, "FAN OFF"); }
    else sendCORS(403, "Error: Modo Auto Activo");
  });

  server.on("/puerta/abrir", []() { 
    abrirPuertaAction(); 
    sendCORS(200, "PUERTA ABIERTA"); 
  });

  server.on("/buzzer/error", []() { 
    activarBuzzerDenegado(); 
    sendCORS(200, "BUZZER ERROR"); 
  });

  server.on("/sensor", []() {
    String json = "{\"temperature\":" + String(dht.readTemperature(),1) + 
                  ",\"humidity\":" + String(dht.readHumidity(),1) + "}";
    sendCORS(200, json, "application/json");
  });
}

// 6. SETUP & LOOP PRINCIPAL
void setup() {
  Serial.begin(115200);
  delay(1000);

  lcd.init();
  lcd.backlight();
  lcd.setCursor(0, 0);
  lcd.print("Iniciando...");

  initHardware();
  
  lcd.clear();
  lcd.print("WiFi: " + String(ssid));
  initNetwork(); // Aquí se asignará la IP dinámica

  setupRoutes();
  server.begin();

  lcd.clear();
  lcd.print("Sistema Listo");
  lcd.setCursor(0, 1);
  lcd.print(WiFi.localIP().toString());
  delay(2000);
}

void loop() {
  server.handleClient();

  static bool lastMode = isAutoMode;

  if (isAutoMode != lastMode) {
    if (isAutoMode) {
      Serial.println("MODO AUTOMÁTICO");
      // Mejora recomendada: resetear sensores al volver a modo auto
      SPI.begin();
      rfid.PCD_Init();
    } else {
      Serial.println("MODO MANUAL");
    }
    lastMode = isAutoMode;
  }

  if (isAutoMode) {
    runAutomaticLogic();
  }
}