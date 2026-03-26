async function fetchData() {
  try {
    const response = await fetch("/api/data", {
      method: "GET",
      headers: {
        "Content-Type": "application/json"
      }
    });

    if (!response.ok) {
      throw new Error("No se pudo obtener la información");
    }

    const data = await response.json();

    const temperaturaEl = document.getElementById("temperatura");
    const rangoEl = document.getElementById("rango");
    const pwmEl = document.getElementById("pwm");
    const estadoEl = document.getElementById("estado");
    const conexionPill = document.getElementById("conexion-pill");
    const barTemp = document.getElementById("bar-temp");

    const temp = parseFloat(data.temperatura);

    if (temperaturaEl) {
      temperaturaEl.style.opacity = "0.4";
      setTimeout(() => {
        temperaturaEl.textContent = `${data.temperatura} °C`;
        temperaturaEl.style.opacity = "1";
      }, 120);
    }

    if (rangoEl) {
      rangoEl.style.opacity = "0.4";
      setTimeout(() => {
        rangoEl.textContent = data.rango;
        rangoEl.style.opacity = "1";
      }, 120);
    }

    if (pwmEl) {
      pwmEl.style.opacity = "0.4";
      setTimeout(() => {
        pwmEl.textContent = data.pwm;
        pwmEl.style.opacity = "1";
      }, 120);
    }

    if (estadoEl) {
      estadoEl.style.opacity = "0.4";
      setTimeout(() => {
        estadoEl.textContent = data.estado;
        estadoEl.style.opacity = "1";
      }, 120);
    }

    if (conexionPill) {
      conexionPill.textContent = data.ok
        ? "Estado de conexión: estable"
        : "Estado de conexión: sin comunicación";
    }

    if (!isNaN(temp) && barTemp) {
      const porcentaje = Math.min((temp / 50) * 100, 100);
      barTemp.style.width = `${porcentaje}%`;

      if (temp >= 35) {
        temperaturaEl.style.color = "#ff5d7a";
      } else if (temp >= 25) {
        temperaturaEl.style.color = "#ffaa00";
      } else {
        temperaturaEl.style.color = "#8b5cf6";
      }
    }

  } catch (error) {
    console.error("Error:", error);

    const conexionPill = document.getElementById("conexion-pill");
    if (conexionPill) {
      conexionPill.textContent = "Estado de conexión: error";
    }
  }
}

fetchData();
setInterval(fetchData, 1000);
