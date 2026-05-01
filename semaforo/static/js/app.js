const log = document.getElementById("log");

const btnRight = document.getElementById("btnRight");
const btnLeft = document.getElementById("btnLeft");
const btnStop = document.getElementById("btnStop");
const btnReset = document.getElementById("btnReset");
const btnClearLog = document.getElementById("btnClearLog");

const estado = document.getElementById("estado");
const estadoDescripcion = document.getElementById("estadoDescripcion");
const motorStatePill = document.getElementById("motorStatePill");

const pulsos = document.getElementById("pulsos");
const vueltas = document.getElementById("vueltas");

const rpmReal = document.getElementById("rpmReal");
const rpmReferenciaInput = document.getElementById("rpmReferencia");
const rpmReferenciaVista = document.getElementById("rpmReferenciaVista");

const errorRPM = document.getElementById("errorRPM");
const errorDirection = document.getElementById("errorDirection");
const errorAbsolutoVista = document.getElementById("errorAbsolutoVista");
const errorPorcentajeVista = document.getElementById("errorPorcentajeVista");

const pwmActual = document.getElementById("pwmActual");

const semaforoCard = document.getElementById("semaforoCard");
const semaforoTexto = document.getElementById("semaforoTexto");
const semaforoDetalle = document.getElementById("semaforoDetalle");
const ledFisico = document.getElementById("ledFisico");

const luzRoja = document.getElementById("luzRoja");
const luzAmarilla = document.getElementById("luzAmarilla");
const luzVerde = document.getElementById("luzVerde");

const connectionBadge = document.getElementById("connectionBadge");
const lastUpdate = document.getElementById("lastUpdate");
const diagnostico = document.getElementById("diagnostico");

const rpmMeterFill = document.getElementById("rpmMeterFill");

const chart = document.getElementById("rpmChart");
const ctx = chart.getContext("2d");

let ultimaRPMReal = 0;
let referenciaTimer = null;
let ultimaReferenciaEnviada = null;
let cargandoStatus = false;

let chartData = [];
const maxPoints = 45;

const referenciaGuardada = localStorage.getItem("rpmReferencia");

if (referenciaGuardada !== null) {
  rpmReferenciaInput.value = referenciaGuardada;
  rpmReferenciaVista.textContent = referenciaGuardada;
}

function writeLog(msg) {
  const now = new Date().toLocaleTimeString();
  log.textContent = `[${now}] ${msg}\n` + log.textContent;
}

function setConnectionStatus(connected) {
  if (connected) {
    connectionBadge.classList.add("connected");
    connectionBadge.classList.remove("disconnected");
    connectionBadge.querySelector("p").textContent = "Conectado";
  } else {
    connectionBadge.classList.remove("connected");
    connectionBadge.classList.add("disconnected");
    connectionBadge.querySelector("p").textContent = "Sin conexión";
  }
}

function obtenerReferencia() {
  const valor = Number(rpmReferenciaInput.value);

  if (isNaN(valor) || valor < 0) {
    return 0;
  }

  return valor;
}

function actualizarEstadoMotor(estadoMotor) {
  estado.textContent = estadoMotor;
  motorStatePill.textContent = estadoMotor;

  motorStatePill.classList.remove("running", "stopped");

  if (estadoMotor === "DERECHA") {
    estadoDescripcion.textContent = "Motor girando hacia la derecha";
    motorStatePill.classList.add("running");
  } else if (estadoMotor === "IZQUIERDA") {
    estadoDescripcion.textContent = "Motor girando hacia la izquierda";
    motorStatePill.classList.add("running");
  } else {
    estadoDescripcion.textContent = "Motor detenido";
    motorStatePill.classList.add("stopped");
  }
}

function actualizarSemaforoVisual(datos) {
  const semaforo = String(datos.semaforo || "ROJO").toUpperCase();

  const error = Number(datos.error) || 0;
  const errorAbsoluto = Number(datos.errorabs) || Math.abs(error);
  const errorPorcentaje = Number(datos.errorpct) || 0;

  errorRPM.textContent = error.toFixed(1);
  errorAbsolutoVista.textContent = `${errorAbsoluto.toFixed(1)} RPM`;
  errorPorcentajeVista.textContent = `${errorPorcentaje.toFixed(1)}%`;

  if (error > 0) {
    errorDirection.textContent = "El motor está por debajo de la referencia";
  } else if (error < 0) {
    errorDirection.textContent = "El motor está por encima de la referencia";
  } else {
    errorDirection.textContent = "Sin diferencia";
  }

  semaforoCard.classList.remove("green-mode", "yellow-mode", "red-mode");

  luzRoja.classList.remove("active");
  luzAmarilla.classList.remove("active");
  luzVerde.classList.remove("active");

  if (semaforo === "VERDE") {
    semaforoTexto.textContent = "Verde";
    semaforoDetalle.textContent = "El motor está cerca de la referencia.";
    semaforoCard.classList.add("green-mode");
    luzVerde.classList.add("active");
    ledFisico.textContent = "LED verde encendido | Pin 8";
  }
  else if (semaforo === "AMARILLO") {
    semaforoTexto.textContent = "Amarillo";
    semaforoDetalle.textContent = "El motor está algo alejado de la referencia.";
    semaforoCard.classList.add("yellow-mode");
    luzAmarilla.classList.add("active");
    ledFisico.textContent = "LED amarillo encendido | Pin 9";
  }
  else {
    semaforoTexto.textContent = "Rojo";
    semaforoDetalle.textContent = "El motor está lejos de la referencia.";
    semaforoCard.classList.add("red-mode");
    luzRoja.classList.add("active");
    ledFisico.textContent = "LED rojo encendido | Pin 10";
  }

  actualizarDiagnostico(semaforo, errorAbsoluto, errorPorcentaje);
}

function actualizarDiagnostico(semaforo, errorAbsoluto, errorPorcentaje) {
  const referencia = obtenerReferencia();

  if (referencia <= 0 && ultimaRPMReal <= 0) {
    diagnostico.textContent =
      "No hay referencia activa. Escribe un valor de RPM para iniciar el control PID.";
    return;
  }

  if (semaforo === "VERDE") {
    diagnostico.textContent =
      `Sistema estable. El PID está manteniendo el motor cerca de la referencia. RPM actual: ${ultimaRPMReal.toFixed(1)}, error: ${errorAbsoluto.toFixed(1)} RPM (${errorPorcentaje.toFixed(1)}%).`;
  }
  else if (semaforo === "AMARILLO") {
    diagnostico.textContent =
      `El sistema está corrigiendo. El error todavía es medio. RPM actual: ${ultimaRPMReal.toFixed(1)}, error: ${errorAbsoluto.toFixed(1)} RPM (${errorPorcentaje.toFixed(1)}%).`;
  }
  else {
    diagnostico.textContent =
      `El sistema está lejos de la referencia. El PID debe aumentar o reducir el PWM. RPM actual: ${ultimaRPMReal.toFixed(1)}, error: ${errorAbsoluto.toFixed(1)} RPM (${errorPorcentaje.toFixed(1)}%).`;
  }
}

function actualizarMedidorRPM(rpm, referencia) {
  const base = Math.max(referencia, rpm, 1);
  const porcentaje = Math.min((rpm / base) * 100, 100);

  rpmMeterFill.style.width = `${porcentaje}%`;
}

function resizeCanvas() {
  const ratio = window.devicePixelRatio || 1;
  const rect = chart.getBoundingClientRect();

  chart.width = rect.width * ratio;
  chart.height = rect.height * ratio;

  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function addChartPoint(rpm, referencia) {
  chartData.push({
    rpm,
    referencia
  });

  if (chartData.length > maxPoints) {
    chartData.shift();
  }

  drawChart();
}

function drawChart() {
  const rect = chart.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  ctx.clearRect(0, 0, width, height);

  const padding = 34;
  const graphW = width - padding * 2;
  const graphH = height - padding * 2;

  const valores = chartData.flatMap(p => [p.rpm, p.referencia]);
  const maxValue = Math.max(10, ...valores) * 1.2;

  ctx.lineWidth = 1;
  ctx.strokeStyle = "rgba(255,255,255,0.08)";

  for (let i = 0; i <= 5; i++) {
    const y = padding + (graphH / 5) * i;

    ctx.beginPath();
    ctx.moveTo(padding, y);
    ctx.lineTo(width - padding, y);
    ctx.stroke();
  }

  ctx.fillStyle = "rgba(255,255,255,0.45)";
  ctx.font = "12px Arial";

  for (let i = 0; i <= 5; i++) {
    const value = maxValue - (maxValue / 5) * i;
    const y = padding + (graphH / 5) * i;

    ctx.fillText(value.toFixed(0), 8, y + 4);
  }

  drawLine("referencia", "#facc15", maxValue, padding, graphW, graphH);
  drawLine("rpm", "#2dd4bf", maxValue, padding, graphW, graphH);
}

function drawLine(key, color, maxValue, padding, graphW, graphH) {
  if (chartData.length < 2) {
    return;
  }

  ctx.beginPath();

  chartData.forEach((point, index) => {
    const x = padding + (graphW / (maxPoints - 1)) * index;
    const y = padding + graphH - (point[key] / maxValue) * graphH;

    if (index === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  });

  ctx.strokeStyle = color;
  ctx.lineWidth = 3;
  ctx.lineJoin = "round";
  ctx.lineCap = "round";
  ctx.stroke();

  const last = chartData[chartData.length - 1];
  const lastX = padding + (graphW / (maxPoints - 1)) * (chartData.length - 1);
  const lastY = padding + graphH - (last[key] / maxValue) * graphH;

  ctx.beginPath();
  ctx.arc(lastX, lastY, 5, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

async function enviarReferenciaArduino(referencia, mostrarLog = true) {
  if (
    ultimaReferenciaEnviada !== null &&
    Math.abs(ultimaReferenciaEnviada - referencia) < 0.01
  ) {
    return;
  }

  try {
    const r = await fetch("/set_reference", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        referencia
      })
    });

    const j = await r.json();

    if (j.ok) {
      ultimaReferenciaEnviada = referencia;

      if (mostrarLog) {
        writeLog(`SET_REF:${referencia.toFixed(1)} -> ${j.resp}`);
      }

      await loadStatus();
    } else {
      writeLog(`ERROR REF -> ${j.error || j.resp || "No se pudo enviar referencia"}`);
    }

  } catch (e) {
    setConnectionStatus(false);
    writeLog(`ERROR REF -> ${e.message}`);
  }
}

async function sendAction(action) {
  try {
    const r = await fetch("/motor_cmd", {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ action })
    });

    const j = await r.json();

    if (j.ok) {
      writeLog(`${j.cmd} -> ${j.resp}`);
      await loadStatus();
    } else {
      writeLog(`ERROR -> ${j.error || j.resp || "No se pudo ejecutar el comando"}`);
    }

  } catch (e) {
    setConnectionStatus(false);
    writeLog(`ERROR -> ${e.message}`);
  }
}

async function loadStatus() {
  if (cargandoStatus) {
    return;
  }

  cargandoStatus = true;

  try {
    const r = await fetch("/status");
    const j = await r.json();

    if (!j.ok) {
      setConnectionStatus(false);
      writeLog(`STATUS ERROR -> ${j.raw || j.error || "Sin respuesta"}`);
      cargandoStatus = false;
      return;
    }

    setConnectionStatus(true);

    const rpm = Number(j.rpm) || 0;
    const referencia = Number(j.referencia) || obtenerReferencia();
    const pwm = Number(j.pwm) || 0;

    ultimaRPMReal = rpm;

    actualizarEstadoMotor(j.estado || "PARO");

    pulsos.textContent = j.pulsos ?? "0";
    vueltas.textContent = j.vueltas ?? "0.00";

    rpmReal.textContent = rpm.toFixed(1);
    rpmReferenciaVista.textContent = referencia.toFixed(0);
    pwmActual.textContent = pwm.toFixed(0);

    actualizarSemaforoVisual({
      error: Number(j.error),
      errorabs: Number(j.errorabs),
      errorpct: Number(j.errorpct),
      semaforo: j.semaforo
    });

    actualizarMedidorRPM(rpm, referencia);
    addChartPoint(rpm, referencia);

    const now = new Date().toLocaleTimeString();
    lastUpdate.textContent = `Actualizado ${now}`;

  } catch (e) {
    setConnectionStatus(false);
    writeLog(`STATUS ERROR -> ${e.message}`);
  }

  cargandoStatus = false;
}

rpmReferenciaInput.addEventListener("input", () => {
  const referencia = obtenerReferencia();

  localStorage.setItem("rpmReferencia", referencia);
  rpmReferenciaVista.textContent = referencia.toFixed(0);

  clearTimeout(referenciaTimer);

  referenciaTimer = setTimeout(() => {
    enviarReferenciaArduino(referencia, true);
  }, 400);
});

btnRight.addEventListener("click", () => sendAction("RIGHT"));
btnLeft.addEventListener("click", () => sendAction("LEFT"));
btnStop.addEventListener("click", () => sendAction("STOP"));
btnReset.addEventListener("click", () => sendAction("RESET"));

btnClearLog.addEventListener("click", () => {
  log.textContent = "";
});

window.addEventListener("resize", () => {
  resizeCanvas();
  drawChart();
});

resizeCanvas();

const referenciaInicial = obtenerReferencia();
enviarReferenciaArduino(referenciaInicial, false);

loadStatus();
setInterval(loadStatus, 700);
