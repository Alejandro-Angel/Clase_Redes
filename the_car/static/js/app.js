const logBox = document.getElementById("log");
const estado = document.getElementById("estado");
const cmdActual = document.getElementById("cmdActual");
const dotMove = document.getElementById("dotMove");
const btnCheck = document.getElementById("btnCheck");
const btnClear = document.getElementById("btnClear");
const systemText = document.getElementById("systemText");
const movementVideo = document.getElementById("movementVideo");
const videoState = document.getElementById("videoState");

let holdInterval = null;
let activeCmd = "S";

const videos = {
  F: { file: "Delante.mp4", text: "Adelante" },
  B: { file: "reversa.mp4", text: "Reversa" },
  L: { file: "Izquierda.mp4", text: "Izquierda" },
  R: { file: "Derecha.mp4", text: "Derecha" },
  S: { file: "Frente.mp4", text: "Reposo" }
};

function log(msg){
  const time = new Date().toLocaleTimeString();
  logBox.textContent += `\n[${time}] ${msg}`;
  logBox.scrollTop = logBox.scrollHeight;
}

function setStatus(ok, text){
  estado.textContent = text;
  estado.classList.toggle("bad", !ok);
}

function cambiarVideo(cmd){
  if(!videos[cmd] || !movementVideo) return;

  const info = videos[cmd];

  movementVideo.src = `/multimedia/${info.file}`;
  movementVideo.load();
  movementVideo.play().catch(() => {});

  if(videoState){
    videoState.textContent = info.text;
  }
}

async function sendCommand(cmd, showLog = true){
  try{
    cmdActual.textContent = cmd;

    const res = await fetch("/car_cmd", {
      method:"POST",
      headers:{ "Content-Type":"application/json" },
      body:JSON.stringify({ cmd })
    });

    const data = await res.json();

    if(data.ok){
      setStatus(true, "Arduino OK");
      if(showLog){
        log(`OK → ${cmd} | ${data.accion || ""}`);
      }
    }else{
      setStatus(false, "Error");
      if(showLog){
        log(`ERROR → ${cmd} | ${data.error || data.resp || "Sin respuesta"}`);
      }
    }

  }catch(err){
    setStatus(false, "Sin conexión");
    if(showLog){
      log(`ERROR DE RED → ${err.message}`);
    }
  }
}

function startHold(cmd, btn){
  stopHold(false);

  activeCmd = cmd;
  btn.classList.add("active");
  dotMove?.classList.add("live-dot");

  cambiarVideo(cmd);
  sendCommand(cmd);

  holdInterval = setInterval(() => {
    sendCommand(activeCmd, false);
  }, 200);
}

function stopHold(sendStop = true){
  document.querySelectorAll(".move-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  dotMove?.classList.remove("live-dot");

  if(holdInterval){
    clearInterval(holdInterval);
    holdInterval = null;
  }

  activeCmd = "S";
  cambiarVideo("S");

  if(sendStop){
    sendCommand("S");
  }
}

document.querySelectorAll("[data-cmd]").forEach(btn => {
  const cmd = btn.dataset.cmd;

  if(btn.classList.contains("move-btn")){
    btn.addEventListener("mousedown", e => {
      e.preventDefault();
      startHold(cmd, btn);
    });

    btn.addEventListener("mouseup", e => {
      e.preventDefault();
      stopHold(true);
    });

    btn.addEventListener("touchstart", e => {
      e.preventDefault();
      startHold(cmd, btn);
    });

    btn.addEventListener("touchend", e => {
      e.preventDefault();
      stopHold(true);
    });

  }else{
    btn.addEventListener("click", () => {
      if(cmd === "S"){
        stopHold(true);
      }else{
        sendCommand(cmd);
      }
    });
  }
});

window.addEventListener("mouseup", () => {
  if(holdInterval){
    stopHold(true);
  }
});

window.addEventListener("keydown", e => {
  const map = {
    ArrowUp:"F",
    ArrowDown:"B",
    ArrowLeft:"L",
    ArrowRight:"R",
    " ":"S"
  };

  const cmd = map[e.key];
  if(!cmd) return;

  e.preventDefault();

  if(cmd === "S"){
    stopHold(true);
    return;
  }

  if(!holdInterval || activeCmd !== cmd){
    activeCmd = cmd;
    cambiarVideo(cmd);
    sendCommand(cmd);

    holdInterval = setInterval(() => {
      sendCommand(activeCmd, false);
    }, 200);
  }
});

window.addEventListener("keyup", e => {
  if(["ArrowUp","ArrowDown","ArrowLeft","ArrowRight"].includes(e.key)){
    stopHold(true);
  }
});

btnCheck?.addEventListener("click", async () => {
  try{
    const res = await fetch("/status");
    const data = await res.json();

    if(data.ok){
      setStatus(true, "Arduino OK");
      systemText.textContent = data.resp;
      log(`STATUS → ${data.resp}`);
    }else{
      setStatus(false, "Error Arduino");
      systemText.textContent = data.error || data.resp || "Error";
      log(`STATUS ERROR → ${systemText.textContent}`);
    }

  }catch(err){
    setStatus(false, "Sin conexión");
    systemText.textContent = err.message;
    log(`STATUS RED ERROR → ${err.message}`);
  }
});

btnClear?.addEventListener("click", () => {
  logBox.textContent = "Listo.";
});

cambiarVideo("S");
