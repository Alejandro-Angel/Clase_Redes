const int sensorPin = A0;

// ===== L298N =====
const int ENA = 5;   // pin PWM
const int IN1 = 8;
const int IN2 = 9;

// ===== PWM AJUSTABLE =====
const int PWM_BAJO  = 150;
const int PWM_MEDIO = 200;
const int PWM_ALTO  = 255;

float temperatura = 0.0;
int pwmValue = 0;
String rango = "";
String estado = "";

void setup() {
  Serial.begin(9600);

  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);

  // dirección fija
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  analogWrite(ENA, 0);
}

void loop() {
  if (Serial.available() > 0) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();

    if (cmd == "GET_DATA") {
      int lectura = analogRead(sensorPin);
      float voltaje = lectura * (5.0 / 1023.0);
      temperatura = voltaje * 100.0;

      if (temperatura < 25.0) {
        pwmValue = PWM_BAJO;
        rango = "Rango 1";
        estado = "Motor lento";
      }
      else if (temperatura >= 25.0 && temperatura < 35.0) {
        pwmValue = PWM_MEDIO;
        rango = "Rango 2";
        estado = "Motor medio";
      }
      else {
        pwmValue = PWM_ALTO;
        rango = "Rango 3";
        estado = "Motor rapido";
      }

      analogWrite(ENA, pwmValue);

      Serial.print("TEMP:");
      Serial.print(temperatura, 2);
      Serial.print(",RANGO:");
      Serial.print(rango);
      Serial.print(",PWM:");
      Serial.print(pwmValue);
      Serial.print(",ESTADO:");
      Serial.println(estado);
    }
  }
}
