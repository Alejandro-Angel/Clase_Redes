document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const usernameInput = document.getElementById("username");
  const passwordInput = document.getElementById("password");
  const errorMessage = document.getElementById("errorMessage");

  const loginContainer = document.getElementById("loginContainer");
  const mainContainer = document.getElementById("mainContainer");
  const logoutBtn = document.getElementById("logoutBtn");

  const humiditySlider = document.getElementById("humiditySlider");
  const humidityValue = document.getElementById("humidityValue");
  const humidityLed = document.getElementById("humidityLed");
  const humidityStatus = document.getElementById("humidityStatus");
  const humidityDetail = document.getElementById("humidityDetail");

  const tempSlider = document.getElementById("tempSlider");
  const tempValue = document.getElementById("tempValue");
  const tempLed = document.getElementById("tempLed");
  const tempStatus = document.getElementById("tempStatus");
  const tempDetail = document.getElementById("tempDetail");

  const generalLed = document.getElementById("generalLed");
  const generalStatus = document.getElementById("generalStatus");
  const generalMessage = document.getElementById("generalMessage");

  const validUser = "Alejandro";
  const validPassword = "226454angel25";

  // LOGIN
  loginForm.addEventListener("submit", function (e) {
    e.preventDefault();

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (username === validUser && password === validPassword) {
      loginContainer.classList.add("hidden");
      mainContainer.classList.remove("hidden");
      errorMessage.textContent = "";
      updateHumidity();
      updateTemperature();
      updateGeneralStatus();
    } else {
      errorMessage.textContent = "Usuario o contraseña incorrectos.";
    }
  });

  // CERRAR SESIÓN
  logoutBtn.addEventListener("click", function () {
    mainContainer.classList.add("hidden");
    loginContainer.classList.remove("hidden");
    usernameInput.value = "";
    passwordInput.value = "";
  });

  // HUMEDAD
  humiditySlider.addEventListener("input", function () {
    updateHumidity();
    updateGeneralStatus();
  });

  function updateHumidity() {
    const value = parseInt(humiditySlider.value);
    humidityValue.textContent = value;

    if (value < 30) {
      humidityLed.className = "led red";
      humidityStatus.textContent = "Bajo";
      humidityDetail.textContent = "La humedad está por debajo del nivel ideal.";
    } else {
      humidityLed.className = "led green";
      humidityStatus.textContent = "Adecuado";
      humidityDetail.textContent = "La humedad se encuentra en un nivel aceptable.";
    }
  }

  // TEMPERATURA
  tempSlider.addEventListener("input", function () {
    updateTemperature();
    updateGeneralStatus();
  });

  function updateTemperature() {
    const value = parseInt(tempSlider.value);
    tempValue.textContent = value;

    if (value < 15) {
      tempLed.className = "led yellow";
      tempStatus.textContent = "Baja";
      tempDetail.textContent = "La temperatura está por debajo del rango normal.";
    } else if (value <= 35) {
      tempLed.className = "led green";
      tempStatus.textContent = "Normal";
      tempDetail.textContent = "La temperatura se encuentra dentro del rango aceptable.";
    } else {
      tempLed.className = "led red";
      tempStatus.textContent = "Alta";
      tempDetail.textContent = "La temperatura supera el límite recomendado.";
    }
  }

  // ESTADO GENERAL
  function updateGeneralStatus() {
    const humidity = parseInt(humiditySlider.value);
    const temperature = parseInt(tempSlider.value);

    if (humidity < 30 || temperature > 35) {
      generalLed.className = "big-led red";
      generalStatus.textContent = "Sistema en alerta";
      generalMessage.textContent = "Uno o más sensores presentan valores fuera del rango recomendado.";
    } else if (temperature < 15) {
      generalLed.className = "big-led yellow";
      generalStatus.textContent = "Sistema en observación";
      generalMessage.textContent = "Se detecta temperatura baja, pero el sistema sigue funcionando.";
    } else {
      generalLed.className = "big-led green";
      generalStatus.textContent = "Sistema estable";
      generalMessage.textContent = "Todos los sensores se encuentran operando dentro de parámetros normales.";
    }
  }
});
