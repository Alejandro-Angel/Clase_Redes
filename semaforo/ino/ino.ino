#include <avr/interrupt.h>

// ================= PINES PUENTE H =================
const int ENA = 3;
const int IN1 = 4;
const int IN2 = 2;

// ================= ENCODER =================
const int ENC = 6;

// ================= LEDS FÍSICOS =================
const int LED_VERDE = 8;
const int LED_AMARILLO = 9;
const int LED_ROJO = 10;

// ================= VARIABLES ENCODER =================
volatile long pulsos = 0;
volatile byte ultimoEstado = 0;

const float PULSOS_POR_VUELTA = 519.0;

// ================= ESTADO MOTOR =================
String estadoMotor = "PARO";

// ================= RPM Y REFERENCIA =================
float referenciaRPM = 100.0;
float rpmActual = 0.0;
float rpmFiltrada = 0.0;

// ================= PID =================
float errorRPM = 0.0;
float errorAnterior = 0.0;
float integral = 0.0;
float derivada = 0.0;

// Ajusta estos valores si el motor responde raro
float KP = 0.10;
float KI = 0.04;
float KD = 0.002;

// ================= PWM =================
float pwmControl = 0.0;
int pwmAplicado = 0;

const int PWM_MIN = 0;
const int PWM_MAX = 255;
const int PWM_ARRANQUE = 150;
const int PWM_MIN_MOVIMIENTO = 70;

// ================= TIEMPO PID =================
unsigned long tiempoAnteriorPID = 0;
long pulsosAnterioresPID = 0;

const unsigned long INTERVALO_PID = 100;

// ================= SEMÁFORO =================
float errorAbsoluto = 0.0;
float errorPorcentaje = 0.0;
String semaforoActual = "ROJO";

// ================= INTERRUPCIÓN ENCODER =================
ISR(PCINT2_vect) {
  byte estadoActual = (PIND & (1 << PD6)) ? 1 : 0;

  if (estadoActual == 1 && ultimoEstado == 0) {
    pulsos++;
  }

  ultimoEstado = estadoActual;
}

// ================= FUNCIONES AUXILIARES =================
float absoluto(float valor) {
  if (valor < 0) {
    return -valor;
  }

  return valor;
}

void apagarLeds() {
  digitalWrite(LED_VERDE, LOW);
  digitalWrite(LED_AMARILLO, LOW);
  digitalWrite(LED_ROJO, LOW);
}

void actualizarLedsFisicos() {
  apagarLeds();

  if (semaforoActual == "VERDE") {
    digitalWrite(LED_VERDE, HIGH);
  }
  else if (semaforoActual == "AMARILLO") {
    digitalWrite(LED_AMARILLO, HIGH);
  }
  else {
    digitalWrite(LED_ROJO, HIGH);
  }
}

void actualizarSemaforo(float rpm) {
  errorRPM = referenciaRPM - rpm;
  errorAbsoluto = absoluto(errorRPM);

  if (referenciaRPM > 0) {
    errorPorcentaje = (errorAbsoluto / referenciaRPM) * 100.0;
  } else {
    if (rpm == 0) {
      errorPorcentaje = 0.0;
    } else {
      errorPorcentaje = 100.0;
    }
  }

  if (errorPorcentaje <= 5.0) {
    semaforoActual = "VERDE";
  }
  else if (errorPorcentaje <= 15.0) {
    semaforoActual = "AMARILLO";
  }
  else {
    semaforoActual = "ROJO";
  }

  actualizarLedsFisicos();
}

void aplicarPWM() {
  if (estadoMotor == "PARO" || referenciaRPM <= 0) {
    pwmAplicado = 0;
    analogWrite(ENA, 0);
    return;
  }

  if (pwmControl > 0 && pwmControl < PWM_MIN_MOVIMIENTO) {
    pwmControl = PWM_MIN_MOVIMIENTO;
  }

  pwmControl = constrain(pwmControl, PWM_MIN, PWM_MAX);
  pwmAplicado = (int)pwmControl;

  analogWrite(ENA, pwmAplicado);
}

void reiniciarPID() {
  noInterrupts();
  pulsosAnterioresPID = pulsos;
  interrupts();

  tiempoAnteriorPID = millis();

  rpmActual = 0.0;
  rpmFiltrada = 0.0;

  errorRPM = 0.0;
  errorAnterior = 0.0;
  integral = 0.0;
  derivada = 0.0;

  if (referenciaRPM > 0) {
    pwmControl = PWM_ARRANQUE;
  } else {
    pwmControl = 0;
  }

  aplicarPWM();
}

void actualizarPID() {
  unsigned long ahora = millis();

  if (ahora - tiempoAnteriorPID < INTERVALO_PID) {
    return;
  }

  float dt = (ahora - tiempoAnteriorPID) / 1000.0;

  noInterrupts();
  long pulsosActuales = pulsos;
  interrupts();

  long dp = pulsosActuales - pulsosAnterioresPID;

  pulsosAnterioresPID = pulsosActuales;
  tiempoAnteriorPID = ahora;

  float rpmInstantanea = 0.0;

  if (dt > 0) {
    rpmInstantanea = (dp / PULSOS_POR_VUELTA) * (60.0 / dt);
  }

  if (estadoMotor == "PARO" || referenciaRPM <= 0) {
    rpmActual = 0.0;
    rpmFiltrada = 0.0;
    pwmControl = 0;
    pwmAplicado = 0;
    integral = 0.0;
    errorAnterior = 0.0;

    analogWrite(ENA, 0);
    actualizarSemaforo(0.0);
    return;
  }

  rpmFiltrada = (0.65 * rpmFiltrada) + (0.35 * rpmInstantanea);
  rpmActual = rpmFiltrada;

  errorRPM = referenciaRPM - rpmActual;

  integral += errorRPM * dt;
  integral = constrain(integral, -600.0, 600.0);

  derivada = (errorRPM - errorAnterior) / dt;

  float salidaPID = (KP * errorRPM) + (KI * integral) + (KD * derivada);

  pwmControl += salidaPID;
  pwmControl = constrain(pwmControl, PWM_MIN, PWM_MAX);

  errorAnterior = errorRPM;

  aplicarPWM();
  actualizarSemaforo(rpmActual);
}

// ================= CONTROL MOTOR =================
void derecha() {
  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);

  estadoMotor = "DERECHA";

  reiniciarPID();
}

void izquierda() {
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, HIGH);

  estadoMotor = "IZQUIERDA";

  reiniciarPID();
}

void paro() {
  analogWrite(ENA, 0);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);

  estadoMotor = "PARO";

  rpmActual = 0.0;
  rpmFiltrada = 0.0;

  pwmControl = 0;
  pwmAplicado = 0;

  integral = 0.0;
  errorAnterior = 0.0;

  actualizarSemaforo(0.0);
}

void resetConteo() {
  noInterrupts();
  pulsos = 0;
  interrupts();

  pulsosAnterioresPID = 0;
  tiempoAnteriorPID = millis();

  rpmActual = 0.0;
  rpmFiltrada = 0.0;

  integral = 0.0;
  errorAnterior = 0.0;
}

// ================= COMUNICACIÓN =================
void enviarEstado() {
  noInterrupts();
  long p = pulsos;
  interrupts();

  float vueltas = p / PULSOS_POR_VUELTA;

  actualizarSemaforo(rpmActual);

  Serial.print("OK:STATUS");

  Serial.print("|estado=");
  Serial.print(estadoMotor);

  Serial.print("|pulsos=");
  Serial.print(p);

  Serial.print("|vueltas=");
  Serial.print(vueltas, 2);

  Serial.print("|rpm=");
  Serial.print(rpmActual, 1);

  Serial.print("|referencia=");
  Serial.print(referenciaRPM, 1);

  Serial.print("|error=");
  Serial.print(errorRPM, 1);

  Serial.print("|errorabs=");
  Serial.print(errorAbsoluto, 1);

  Serial.print("|errorpct=");
  Serial.print(errorPorcentaje, 1);

  Serial.print("|pwm=");
  Serial.print(pwmAplicado);

  Serial.print("|semaforo=");
  Serial.println(semaforoActual);
}

void cambiarReferencia(String cmd) {
  int separador = cmd.indexOf(':');

  if (separador < 0) {
    separador = cmd.indexOf('=');
  }

  if (separador < 0) {
    Serial.println("ERR:REF");
    return;
  }

  String valorTexto = cmd.substring(separador + 1);
  valorTexto.trim();

  float nuevaReferencia = valorTexto.toFloat();

  if (nuevaReferencia < 0) {
    nuevaReferencia = 0;
  }

  referenciaRPM = nuevaReferencia;

  integral = 0.0;
  errorAnterior = 0.0;

  if (estadoMotor != "PARO" && referenciaRPM > 0 && pwmControl < PWM_MIN_MOVIMIENTO) {
    pwmControl = PWM_ARRANQUE;
  }

  actualizarSemaforo(rpmActual);

  Serial.print("OK:REF");
  Serial.print("|referencia=");
  Serial.print(referenciaRPM, 1);
  Serial.print("|semaforo=");
  Serial.println(semaforoActual);
}

// ================= SETUP =================
void setup() {
  Serial.begin(115200);
  Serial.setTimeout(30);

  pinMode(ENA, OUTPUT);
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(ENC, INPUT_PULLUP);

  pinMode(LED_VERDE, OUTPUT);
  pinMode(LED_AMARILLO, OUTPUT);
  pinMode(LED_ROJO, OUTPUT);

  paro();

  ultimoEstado = digitalRead(ENC);

  PCICR |= (1 << PCIE2);
  PCMSK2 |= (1 << PCINT22);

  tiempoAnteriorPID = millis();

  Serial.println("OK:READY");
}

// ================= LOOP =================
void loop() {
  actualizarPID();

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
    else if (cmd.startsWith("SET_REF")) {
      cambiarReferencia(cmd);
    }
    else {
      Serial.println("ERR:CMD");
    }
  }
}
