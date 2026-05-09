const logEl = document.getElementById("log");
const btnClear = document.getElementById("btnClear");
const estado = document.getElementById("estado");
const cmdActual = document.getElementById("cmdActual");
const dotMove = document.getElementById("dotMove");
const btnCheck = document.getElementById("btnCheck");
const systemText = document.getElementById("systemText");

const solidVideo = document.getElementById("solidVideo");
const simEstado = document.getElementById("simEstado");

let timer = null;

function writeLog(msg) {
  const t = new Date().toLocaleTimeString();
  logEl.textContent = `[${t}] ${msg}\n` + logEl.textContent;
}

function setMoving(isMoving, cmd = "S") {
  cmdActual.textContent = cmd;

  if (!dotMove) return;

  if (isMoving) {
    dotMove.style.background = "rgba(122,168,255,.95)";
    dotMove.style.boxShadow = "0 0 0 4px rgba(122,168,255,.18)";
  } else {
    dotMove.style.background = "rgba(255,255,255,.18)";
    dotMove.style.boxShadow = "0 0 0 4px rgba(255,255,255,.05)";
  }
}

function cambiarVideoSolid(cmd) {
  if (!solidVideo) return;

  const videos = {
    F: {
      src: "/multimedia/adelante.mp4",
      texto: "Adelante"
    },
    B: {
      src: "/multimedia/atras.mp4",
      texto: "Atrás"
    },
    L: {
      src: "/multimedia/izquierda.mp4",
      texto: "Izquierda"
    },
    R: {
      src: "/multimedia/derecha.mp4",
      texto: "Derecha"
    },
    S: {
      src: "/multimedia/reposo.mp4",
      texto: "Reposo"
    }
  };

  const seleccionado = videos[cmd] || videos.S;
  const source = solidVideo.querySelector("source");

  if (source.getAttribute("src") !== seleccionado.src) {
    source.setAttribute("src", seleccionado.src);
    solidVideo.load();
  }

  solidVideo.play().catch(() => {});

  if (simEstado) {
    simEstado.textContent = seleccionado.texto;
  }
}

async function sendCarCmd(cmd) {
  try {
    const r = await fetch("/car_cmd", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ cmd })
    });

    const j = await r.json();

    if (j.ok) {
      writeLog(`${j.accion} -> ${j.resp}`);
      return true;
    } else {
      writeLog(`ERROR -> ${j.error || j.resp}`);
      return false;
    }

  } catch (e) {
    writeLog("ERROR -> sin conexión con Flask o servidor TCP");
    return false;
  }
}

function startMove(cmd) {
  stopMove(false);

  setMoving(cmd !== "S", cmd);
  cambiarVideoSolid(cmd);
  sendCarCmd(cmd);

  timer = setInterval(() => {
    sendCarCmd(cmd);
  }, 300);
}

function stopMove(sendStop = true) {
  if (timer) {
    clearInterval(timer);
    timer = null;
  }

  document.querySelectorAll(".move-btn, .stop-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  setMoving(false, "S");
  cambiarVideoSolid("S");

  if (sendStop) {
    sendCarCmd("S");
  }
}

// Botones de movimiento
document.querySelectorAll(".move-btn").forEach(btn => {
  const cmd = btn.dataset.cmd;

  btn.addEventListener("pointerdown", () => {
    btn.classList.add("active");
    startMove(cmd);
  });

  btn.addEventListener("pointerup", () => {
    stopMove(true);
  });

  btn.addEventListener("pointerleave", () => {
    stopMove(true);
  });

  btn.addEventListener("touchend", () => {
    stopMove(true);
  });
});

// Botón STOP
document.querySelectorAll(".stop-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    stopMove(false);
    setMoving(false, "S");
    cambiarVideoSolid("S");
    sendCarCmd("S");
  });
});

// Botones de servo y modos
document.querySelectorAll(".cmd-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    const cmd = btn.dataset.cmd;

    setMoving(cmd !== "S", cmd);

    if (cmd === "F" || cmd === "B" || cmd === "L" || cmd === "R" || cmd === "S") {
      cambiarVideoSolid(cmd);
    }

    sendCarCmd(cmd);
  });
});

// Control con teclado
document.addEventListener("keydown", e => {
  if (e.repeat) return;

  const key = e.key.toLowerCase();

  if (key === "w" || key === "arrowup") startMove("F");
  if (key === "s" || key === "arrowdown") startMove("B");
  if (key === "a" || key === "arrowleft") startMove("L");
  if (key === "d" || key === "arrowright") startMove("R");

  if (key === " ") {
    stopMove(false);
    setMoving(false, "S");
    cambiarVideoSolid("S");
    sendCarCmd("S");
  }
});

document.addEventListener("keyup", e => {
  const key = e.key.toLowerCase();

  if (
    key === "w" ||
    key === "a" ||
    key === "s" ||
    key === "d" ||
    key === "arrowup" ||
    key === "arrowdown" ||
    key === "arrowleft" ||
    key === "arrowright"
  ) {
    stopMove(true);
  }
});

// Estado de conexión con servidor TCP
async function checkStatus() {
  try {
    const r = await fetch("/status");
    const j = await r.json();

    if (j.ok) {
      estado.textContent = "Arduino OK";
      estado.className = "status ok";
      systemText.textContent = j.resp;
      writeLog(`Estado -> ${j.resp}`);
    } else {
      estado.textContent = "Arduino ERROR";
      estado.className = "status bad";
      systemText.textContent = j.error || j.resp || "Error";
      writeLog(`ERROR estado -> ${j.error || j.resp}`);
    }

  } catch (e) {
    estado.textContent = "Sin conexión";
    estado.className = "status bad";
    systemText.textContent = "No se pudo revisar el estado.";
    writeLog("ERROR -> no se pudo revisar estado");
  }
}

if (btnCheck) {
  btnCheck.addEventListener("click", checkStatus);
}

if (btnClear) {
  btnClear.addEventListener("click", () => {
    logEl.textContent = "Listo.\n";
  });
}

cambiarVideoSolid("S");
checkStatus();
