// -------------------- BOTONES --------------------

const btnLed1 = document.getElementById("btnLed1");
const btnLed2 = document.getElementById("btnLed2");
const btnLed3 = document.getElementById("btnLed3");
const btnActualizar = document.getElementById("btnActualizar");
const btnManual = document.getElementById("btnManual");
const btnAuto = document.getElementById("btnAuto");

btnActualizar.addEventListener("click", () => {
  fetch(`${ESP32_IP}/sensor`)
    .then(response => response.json())
    .then(data => {
      document.getElementById("temp").textContent = data.temperature;
      document.getElementById("hum").textContent = data.humidity;

      console.log(`Temp: ${data.temperature} °C`);
      console.log(`Humedad: ${data.humidity} %`);
      showToast("Sensor actualizado");
    })
    .catch(error => {
      console.error("Error leyendo sensor", error);
      showToast("Error al leer sensor");
    });
});

const btnAbrirPuerta = document.getElementById("btnAbrirPuerta");
const inputPass = document.getElementById("inputPass");

// -------------------- CONFIGURACIÓN --------------------

const CONTRASENA = "1234";
const ESP32_IP = "http://192.168.0.18";

// -------------------- TOAST --------------------

function showToast(message) {
  const toast = document.getElementById("toast");
  toast.textContent = message;
  toast.classList.add("show");

  setTimeout(() => {
    toast.classList.remove("show");
  }, 2000);
}

// -------------------- LÓGICA DE LUCES --------------------

btnLed1.addEventListener("click", () => toggleLight(btnLed1, 1));
btnLed2.addEventListener("click", () => toggleLight(btnLed2, 2));
btnLed3.addEventListener("click", () => toggleLight(btnLed3, 3));

function toggleLight(button, numLed) {
  const isOn = button.classList.toggle("active");
  const action = isOn ? "on" : "off";

  console.log(`LED ${numLed} -> ${action.toUpperCase()}`);

  fetch(`${ESP32_IP}/led/${numLed}/${action}`)
    .then(response => response.text())
    .then(data => {
      console.log("ESP32:", data);
      showToast(`Luz ${numLed} ${isOn ? "encendida" : "apagada"}`);
    })
    .catch(err => {
      console.error("Error al conectar con ESP32", err);
      showToast("Error de conexión con ESP32");
      button.classList.toggle("active");
    });
}


// -------------------- MODO MANUAL / AUTOMÁTICO --------------------

btnManual.addEventListener("click", () => setMode("manual"));
btnAuto.addEventListener("click", () => setMode("auto"));

function setMode(mode) {
    fetch(`${ESP32_IP}/config/${mode}`)
        .then(response => {
            if (response.ok) {
                if (mode === "manual") {
                    btnManual.classList.add("mode-active");
                    btnAuto.classList.remove("mode-active");
                    habilitarControlesManuales(true);
                } else {
                    btnAuto.classList.add("mode-active");
                    btnManual.classList.remove("mode-active");
                    habilitarControlesManuales(false);
                }
                showToast(`Modo ${mode} activado`);
            }
        });
}
// -------------------- SENSORES (SIMULACIÓN) --------------------

/* btnActualizar.addEventListener("click", () => {
  const temp = (20 + Math.random() * 5).toFixed(1);
  const hum = (40 + Math.random() * 10).toFixed(1);

  document.getElementById("temp").textContent = temp;
  document.getElementById("hum").textContent = hum;

  console.log(`Sensor actualizado → Temp: ${temp}°C, Humedad: ${hum}%`);
}); */

// -------------------- CONTROL DE PUERTA --------------------

btnAbrirPuerta.addEventListener("click", () => {
  const passIngresada = inputPass.value.trim();

  if (passIngresada === "") {
    showToast("Ingrese una contraseña");
    return;
  }

    if (passIngresada !== CONTRASENA) {
    showToast("Contraseña incorrecta");
    console.log("Acceso denegado");

    fetch(`${ESP32_IP}/buzzer/error`)
      .then(res => res.text())
      .then(data => console.log(data))
      .catch(err => console.error("Error buzzer", err));

    return;
  }


  fetch(`${ESP32_IP}/puerta/abrir`)
    .then(res => res.text())
    .then(data => {
      console.log(data);
      showToast("Puerta abierta");
    })
    .catch(err => {
      console.error("Error al abrir la puerta", err);
      showToast("Error al abrir la puerta");
    });
});

const btnFan = document.getElementById("btnFan");

btnFan.addEventListener("click", () => {
  const isOn = btnFan.classList.toggle("active");
  const action = isOn ? "on" : "off";

  fetch(`${ESP32_IP}/fan/${action}`)
    .then(r => r.text())
    .then(() => showToast(`Ventilador ${isOn ? "encendido" : "apagado"}`))
    .catch(() => {
      showToast("Error controlando ventilador");
      btnFan.classList.toggle("active");
    });
});

function habilitarControlesManuales(habilitar) {
    const controles = [
        btnLed1, 
        btnLed2, 
        btnLed3, 
        btnFan, 
        btnAbrirPuerta, 
        inputPass
    ];

    controles.forEach(control => {
        if (habilitar) {
            control.disabled = false;
            control.classList.remove("disabled-style");
        } else {
            control.disabled = true;
            control.classList.add("disabled-style");
        }
    });
}



