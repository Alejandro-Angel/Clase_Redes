#include "esp_camera.h"
#include <WiFi.h>

// =====================================================
// REDES WIFI
// Primero intenta REDES2GHZ.
// Si falla, intenta Nose.
// Si ambas fallan, crea su propia red ESP32-CAM.
// =====================================================

const char* ssid1 = "REDES2GHZ";
const char* pass1 = "28035541";

const char* ssid2 = "Nose";
const char* pass2 = "hamburguesas25";

// =====================================================
// IP FIJA PARA LA ESP32-CAM
// =====================================================

IPAddress local_IP(192, 168, 10, 67);
IPAddress gateway(192, 168, 10, 1);
IPAddress subnet(255, 255, 255, 0);
IPAddress primaryDNS(8, 8, 8, 8);
IPAddress secondaryDNS(1, 1, 1, 1);

// =====================================================
// PINES SERIAL2
// =====================================================

#define RXD2 15
#define TXD2 13

// =====================================================
// MODELO ESP32-CAM AI THINKER
// =====================================================

#define PWDN_GPIO_NUM 32
#define RESET_GPIO_NUM -1
#define XCLK_GPIO_NUM 0
#define SIOD_GPIO_NUM 26
#define SIOC_GPIO_NUM 27

#define Y9_GPIO_NUM 35
#define Y8_GPIO_NUM 34
#define Y7_GPIO_NUM 39
#define Y6_GPIO_NUM 36
#define Y5_GPIO_NUM 21
#define Y4_GPIO_NUM 19
#define Y3_GPIO_NUM 18
#define Y2_GPIO_NUM 5

#define VSYNC_GPIO_NUM 25
#define HREF_GPIO_NUM 23
#define PCLK_GPIO_NUM 22

// =====================================================
// LEDS
// =====================================================

int ledVal = 10;
int LED1 = 33;
int flsh_lamp = 4;

void startCameraServer();

// =====================================================
// FUNCION PARA CONECTARSE AL WIFI
// =====================================================

bool conectarWiFi(const char* ssid, const char* password, int tiempoMaximoMs) {
  WiFi.mode(WIFI_STA);
  WiFi.disconnect(true);
  delay(500);

  if (!WiFi.config(local_IP, gateway, subnet, primaryDNS, secondaryDNS)) {
    Serial.println("Error configurando IP fija");
  }

  WiFi.begin(ssid, password);

  Serial.print("Intentando conectar a: ");
  Serial.println(ssid);

  unsigned long inicio = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - inicio < tiempoMaximoMs) {
    delay(500);
    Serial.print(".");
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Conectado a: ");
    Serial.println(ssid);
    Serial.print("IP fija del ESP32-CAM: ");
    Serial.println(WiFi.localIP());
    return true;
  }

  Serial.print("No se pudo conectar a: ");
  Serial.println(ssid);

  WiFi.disconnect(true);
  delay(1000);

  return false;
}

void setup() {
  Serial.begin(115200);
  Serial2.begin(115200, SERIAL_8N1, RXD2, TXD2);

  Serial.setDebugOutput(true);
  Serial.println();
  Serial.println("*ESP32 Camera Remote Control - L298N Motor Driver*");
  Serial.println("-------------------------------------------------------");

  pinMode(flsh_lamp, OUTPUT);
  pinMode(LED1, OUTPUT);

  digitalWrite(flsh_lamp, LOW);
  digitalWrite(LED1, HIGH);

  ledcSetup(7, 5000, 8);
  ledcAttachPin(flsh_lamp, 7);
  ledcWrite(7, 0);

  camera_config_t config;

  config.ledc_channel = LEDC_CHANNEL_0;
  config.ledc_timer = LEDC_TIMER_0;

  config.pin_d0 = Y2_GPIO_NUM;
  config.pin_d1 = Y3_GPIO_NUM;
  config.pin_d2 = Y4_GPIO_NUM;
  config.pin_d3 = Y5_GPIO_NUM;
  config.pin_d4 = Y6_GPIO_NUM;
  config.pin_d5 = Y7_GPIO_NUM;
  config.pin_d6 = Y8_GPIO_NUM;
  config.pin_d7 = Y9_GPIO_NUM;

  config.pin_xclk = XCLK_GPIO_NUM;
  config.pin_pclk = PCLK_GPIO_NUM;
  config.pin_vsync = VSYNC_GPIO_NUM;
  config.pin_href = HREF_GPIO_NUM;

  config.pin_sscb_sda = SIOD_GPIO_NUM;
  config.pin_sscb_scl = SIOC_GPIO_NUM;

  config.pin_pwdn = PWDN_GPIO_NUM;
  config.pin_reset = RESET_GPIO_NUM;

  config.xclk_freq_hz = 10000000;
  config.pixel_format = PIXFORMAT_JPEG;

  if (psramFound()) {
    config.frame_size = FRAMESIZE_QVGA;
    config.jpeg_quality = 15;
    config.fb_count = 1;
  } else {
    config.frame_size = FRAMESIZE_SVGA;
    config.jpeg_quality = 12;
    config.fb_count = 1;
  }

  esp_err_t err = esp_camera_init(&config);

  if (err != ESP_OK) {
    Serial.printf("Camera init failed with error 0x%x\n", err);
    return;
  }

  sensor_t* s = esp_camera_sensor_get();

  s->set_framesize(s, FRAMESIZE_CIF);
  s->set_vflip(s, 1);

  IPAddress myIP;

  if (conectarWiFi(ssid1, pass1, 15000)) {
    myIP = WiFi.localIP();
  } 
  else if (conectarWiFi(ssid2, pass2, 15000)) {
    myIP = WiFi.localIP();
  } 
  else {
    char chip_id[15];
    snprintf(chip_id, 15, "%04X", (uint16_t)(ESP.getEfuseMac() >> 32));

    String hostname = "esp32cam-" + String(chip_id);

    WiFi.mode(WIFI_AP);
    WiFi.softAP(hostname.c_str());

    myIP = WiFi.softAPIP();

    Serial.println("No se pudo conectar a ninguna red.");
    Serial.println("Se activo modo AP.");
    Serial.print("Nombre de red: ");
    Serial.println(hostname);
    Serial.print("IP AP: ");
    Serial.println(myIP);
  }

  delay(2000);

  startCameraServer();

  Serial.print("Camera Ready! Use 'http://");
  Serial.print(myIP);
  Serial.println("' to connect");

  digitalWrite(LED1, LOW);
}

void loop() {
}