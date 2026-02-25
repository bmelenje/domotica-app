/**
 * ============================================================
 * 1. CONFIGURACIÓN Y CONSTANTES
 * ============================================================
 */
let ESP32_IP = localStorage.getItem("esp32_ip_saved") || "";
const CONTRASENA = "1234";

/**
 * ============================================================
 * 2. REFERENCIAS AL DOM (BOTONES Y ELEMENTOS)
 * ============================================================
 */

const lblIpActual = document.getElementById("lblIpActual");
const inputIp = document.getElementById("inputIp");
const btnGuardarIp = document.getElementById("btnGuardarIp");

// Luces
const btnLed1 = document.getElementById("btnLed1");
const btnLed2 = document.getElementById("btnLed2");
const btnLed3 = document.getElementById("btnLed3");

// Control de Modos
const btnManual = document.getElementById("btnManual");
const btnAuto = document.getElementById("btnAuto");

// Sensores y Clima
const btnActualizar = document.getElementById("btnActualizar");
const btnFan = document.getElementById("btnFan");
const displayTemp = document.getElementById("temp");
const displayHum = document.getElementById("hum");

// Puerta
const btnAbrirPuerta = document.getElementById("btnAbrirPuerta");
const inputPass = document.getElementById("inputPass");

// Otros
const toastElement = document.getElementById("toast");

/**
 * ============================================================
 * 3. ESCUCHA DE EVENTOS (LISTENERS)
 * ============================================================
 */

document.addEventListener("DOMContentLoaded", () => {
    if (ESP32_IP) {
        lblIpActual.textContent = ESP32_IP;
        // Poner en el input la IP limpia (sin http://) para facilitar edición
        inputIp.value = ESP32_IP.replace("http://", "");
    } else {
        lblIpActual.textContent = "Sin configurar";
        showToast("⚠️ Configure la IP primero");
    }
});

btnGuardarIp.addEventListener("click", () => {
    let rawIp = inputIp.value.trim();

    if (!rawIp) {
        showToast("Escriba una IP válida");
        return;
    }

    // Auto-completar http:// si el usuario lo olvidó
    if (!rawIp.startsWith("http://")) {
        rawIp = "http://" + rawIp;
    }

    // 1. Actualizar variable en memoria RAM
    ESP32_IP = rawIp;
    // 2. Guardar en disco (LocalStorage) para el futuro
    localStorage.setItem("esp32_ip_saved", ESP32_IP);
    
    // 3. Actualizar interfaz visual
    lblIpActual.textContent = ESP32_IP;
    showToast("IP Guardada Correctamente ✅");
});

// Eventos de Luces
btnLed1.addEventListener("click", () => toggleLight(btnLed1, 1));
btnLed2.addEventListener("click", () => toggleLight(btnLed2, 2));
btnLed3.addEventListener("click", () => toggleLight(btnLed3, 3));

// Eventos de Modo
btnManual.addEventListener("click", () => setMode("manual"));
btnAuto.addEventListener("click", () => setMode("auto"));

// Eventos de Sensores y Ventilador
btnActualizar.addEventListener("click", obtenerDatosSensores);
btnFan.addEventListener("click", controlarVentilador);

// Evento de Puerta
btnAbrirPuerta.addEventListener("click", manejarAperturaPuerta);

/**
 * ============================================================
 * 4. FUNCIONES DE LÓGICA PRINCIPAL
 * ============================================================
 */

// --- Control de Luces ---
function toggleLight(button, numLed) {
    const isOn = button.classList.toggle("active");
    const action = isOn ? "on" : "off";

    fetch(`${ESP32_IP}/led/${numLed}/${action}`)
        .then(res => res.text())
        .then(data => {
            console.log(`ESP32 LED ${numLed}:`, data);
            showToast(`Luz ${numLed} ${isOn ? "encendida" : "apagada"}`);
        })
        .catch(err => {
            console.error("Error LED:", err);
            button.classList.toggle("active");
            showToast("Error de conexión");
        });
}

// --- Gestión de Sensores ---
function obtenerDatosSensores() {
    fetch(`${ESP32_IP}/sensor`)
        .then(res => res.json())
        .then(data => {
            displayTemp.textContent = data.temperature;
            displayHum.textContent = data.humidity;
            showToast("Datos actualizados");
        })
        .catch(err => {
            console.error("Error Sensor:", err);
            showToast("No se pudo leer el sensor");
        });
}

// --- Control de Ventilador ---
function controlarVentilador() {
    const isOn = btnFan.classList.toggle("active");
    const action = isOn ? "on" : "off";

    fetch(`${ESP32_IP}/fan/${action}`)
        .then(res => res.text())
        .then(() => showToast(`Ventilador ${isOn ? "encendido" : "apagado"}`))
        .catch(err => {
            btnFan.classList.toggle("active");
            showToast("Error ventilador");
        });
}

// --- Control de Puerta ---
function manejarAperturaPuerta() {
    const passIngresada = inputPass.value.trim();

    if (passIngresada === "") {
        showToast("Ingrese una contraseña");
        return;
    }

    if (passIngresada !== CONTRASENA) {
        showToast("Contraseña incorrecta");
        fetch(`${ESP32_IP}/buzzer/error`).catch(e => console.log("Buzzer local error"));
        return;
    }

    fetch(`${ESP32_IP}/puerta/abrir`)
        .then(res => res.text())
        .then(() => {
            showToast("Puerta abierta");
            inputPass.value = "";
        })
        .catch(err => showToast("Error al abrir puerta"));
}

// --- Cambio de Modo (Auto/Manual) ---
function setMode(mode) {
    fetch(`${ESP32_IP}/config/${mode}`)
        .then(response => {
            if (response.ok) {
                const isManual = (mode === "manual");
                btnManual.classList.toggle("mode-active", isManual);
                btnAuto.classList.toggle("mode-active", !isManual);
                
                habilitarControlesManuales(isManual);
                showToast(`Modo ${mode.toUpperCase()} activado`);
            }
        })
        .catch(err => showToast("Error al cambiar modo"));
}

/**
 * ============================================================
 * 5. FUNCIONES DE UTILIDAD Y SOPORTE
 * ============================================================
 */

function habilitarControlesManuales(habilitar) {
    const controles = [btnLed1, btnLed2, btnLed3, btnFan, btnAbrirPuerta, inputPass];
    
    controles.forEach(control => {
        control.disabled = !habilitar;
        if (habilitar) {
            control.classList.remove("disabled-style");
        } else {
            control.classList.add("disabled-style");
        }
    });
}

function showToast(message) {
    toastElement.textContent = message;
    toastElement.classList.add("show");

    setTimeout(() => {
        toastElement.classList.remove("show");
    }, 2000);
}