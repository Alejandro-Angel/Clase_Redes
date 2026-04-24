#include <avr/interrupt.h>

const int ENA = 3;
const int IN1 = 4;
const int IN2 = 2;
const int ENC = 6;

volatile long pulsos = 0;
volatile byte ultimoEstado = 0;

long pulsosAnteriores = 0;
unsigned long tiempoAnterior = 0;

const float PULSOS_POR_VUELTA = 519.0;
const float DIAMETRO_RUEDA_M = 0.065;
const int VELOCIDAD = 180;

String estadoMotor = "PARO";

ISR(PCINT2_vect) {
  byte estadoActual = (PIND & (1 << PD6)) ? 1 : 0;
  if (estadoActual == 1 && ultimoEstado == 0) {
    pulsos++;
  }
  ultimoEstado = estadoActual;
}

void derecha() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  analogWrite(ENA, VELOCIDAD);
  estadoMotor = "DERECHA";
}

void izquierda() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);
  analogWrite(ENA, VELOCIDAD);
  estadoMotor = "IZQUIERDA";
}

void paro() {
  analogWrite(ENA, 0);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);
  estadoMotor = "PARO";
}

void resetConteo() {
  noInterrupts();
  pulsos = 0;
  interrupts();
  pulsosAnteriores = 0;
  tiempoAnterior = millis();
}

void enviarEstado() {
  noInterrupts();
  long p = pulsos;
  interrupts();

  unsigned long ahora = millis();
  float dt = (ahora - tiempoAnterior) / 1000.0;
  long dp = p - pulsosAnteriores;

  float vueltas = p / PULSOS_POR_VUELTA;

  float rps = 0;
  if (dt > 0) {
    rps = (dp / PULSOS_POR_VUELTA) / dt;
  }

  float velocidad = rps * 3.1416 * DIAMETRO_RUEDA_M;

  pulsosAnteriores = p;
  tiempoAnterior = ahora;

  Serial.print("OK:STATUS");
  Serial.print("|estado=");
  Serial.print(estadoMotor);
  Serial.print("|pulsos=");
  Serial.print(p);
  Serial.print("|vueltas=");
  Serial.print(vueltas, 2);
  Serial.print("|ms=");
  Serial.println(velocidad, 3);
}

void setup() {
  Serial.begin(115200);

  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENC, INPUT_PULLUP);

  paro();

  ultimoEstado = digitalRead(ENC);

  PCICR |= (1 << PCIE2);
  PCMSK2 |= (1 << PCINT22);

  tiempoAnterior = millis();

  Serial.println("OK:READY");
}

void loop() {
  if (Serial.available()) {
    String cmd = Serial.readStringUntil('\n');
    cmd.trim();
    cmd.toUpperCase();

    if (cmd == "RIGHT" || cmd == "D") {
      derecha();
      Serial.println("OK:RIGHT");
    }
    else if (cmd == "LEFT" || cmd == "I") {
      izquierda();
      Serial.println("OK:LEFT");
    }
    else if (cmd == "STOP" || cmd == "S") {
      paro();
      Serial.println("OK:STOP");
    }
    else if (cmd == "RESET" || cmd == "R") {
      resetConteo();
      Serial.println("OK:RESET");
    }
    else if (cmd == "GET_STATUS") {
      enviarEstado();
    }
    else {
      Serial.println("ERR:CMD");
    }
  }
}
