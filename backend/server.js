// backend/server.js - Backend intermediario para acceso remoto al ESP32
const express = require("express");
const cors = require("cors");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

let esp32Url = process.env.ESP32_LOCAL_URL || "http://192.168.1.100";
let esp32Authenticated = false;

const verifyAuth = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token || token !== process.env.API_TOKEN) {
    return res.status(401).json({ error: "No autorizado" });
  }
  next();
};

async function proxyToESP32(esp32Path, options = {}) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 5000);
  try {
    const res = await fetch(`${esp32Url}${esp32Path}`, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return res;
  } catch (err) {
    clearTimeout(id);
    throw err;
  }
}

// Health check
app.get("/health", (req, res) => {
  res.json({ status: "ok", esp32Connected: esp32Authenticated });
});

// Configurar URL del ESP32
app.post("/config/esp32-url", verifyAuth, async (req, res) => {
  const { url } = req.body;
  esp32Url = url;
  try {
    const response = await proxyToESP32("/health");
    esp32Authenticated = response.ok;
    res.json({
      success: true,
      connected: esp32Authenticated,
      message: esp32Authenticated ? "ESP32 conectado" : "ESP32 no responde",
    });
  } catch {
    esp32Authenticated = false;
    res.status(400).json({ success: false, error: "No se pudo conectar al ESP32" });
  }
});

// ── SENSORES ──
app.get("/api/sensors", verifyAuth, async (req, res) => {
  try {
    const response = await proxyToESP32("/api/sensors");
    res.json(await response.json());
  } catch {
    res.status(500).json({ error: "Error obteniendo datos del ESP32" });
  }
});

app.post("/api/sensors/:sensor", verifyAuth, async (req, res) => {
  try {
    const response = await proxyToESP32(`/api/sensors/${req.params.sensor}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch {
    res.status(500).json({ error: "Error actualizando sensor" });
  }
});

// ── ACTUADORES ──
app.get("/api/actuators", verifyAuth, async (req, res) => {
  try {
    const response = await proxyToESP32("/api/actuators");
    res.json(await response.json());
  } catch {
    res.status(500).json({ error: "Error obteniendo estado de actuadores" });
  }
});

app.post("/api/actuators/:actuator", verifyAuth, async (req, res) => {
  const { actuator } = req.params;
  if (!["lights", "extractor", "pump"].includes(actuator)) {
    return res.status(400).json({ error: "Actuador inválido" });
  }
  try {
    const response = await proxyToESP32(`/api/actuators/${actuator}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(req.body),
    });
    res.json(await response.json());
  } catch {
    res.status(500).json({ error: "Error controlando actuador" });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Servidor Raíz Digital corriendo en puerto ${PORT}`);
  console.log(`ESP32 URL: ${esp32Url}`);
});
