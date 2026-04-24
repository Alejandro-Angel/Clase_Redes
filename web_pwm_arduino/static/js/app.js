const log = document.getElementById("log");

const btnRight = document.getElementById("btnRight");
const btnLeft = document.getElementById("btnLeft");
const btnStop = document.getElementById("btnStop");
const btnReset = document.getElementById("btnReset");

const estado = document.getElementById("estado");
const pulsos = document.getElementById("pulsos");
const vueltas = document.getElementById("vueltas");
const velocidad = document.getElementById("velocidad");

function writeLog(msg) {
  const now = new Date().toLocaleTimeString();
  log.textContent = `[${now}] ${msg}\n` + log.textContent;
}

async function sendAction(action) {
  try {
    const r = await fetch("/motor_cmd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action })
    });

    const j = await r.json();

    if (j.ok) {
      writeLog(`${j.cmd} -> ${j.resp}`);
      await loadStatus();
    } else {
      writeLog(`ERROR -> ${j.error || j.resp}`);
    }
  } catch (e) {
    writeLog(`ERROR -> ${e.message}`);
  }
}

async function loadStatus() {
  try {
    const r = await fetch("/status");
    const j = await r.json();

    if (!j.ok) {
      writeLog(`STATUS ERROR -> ${j.raw || j.error || "Sin respuesta"}`);
      return;
    }

    estado.textContent = j.estado;
    pulsos.textContent = j.pulsos;
    vueltas.textContent = j.vueltas;
    velocidad.textContent = j.ms;
  } catch (e) {
    writeLog(`STATUS ERROR -> ${e.message}`);
  }
}

btnRight.addEventListener("click", () => sendAction("RIGHT"));
btnLeft.addEventListener("click", () => sendAction("LEFT"));
btnStop.addEventListener("click", () => sendAction("STOP"));
btnReset.addEventListener("click", () => sendAction("RESET"));

loadStatus();
setInterval(loadStatus, 700);
