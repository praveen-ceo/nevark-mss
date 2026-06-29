const fs = require('fs');
const { Controller, Tag } = require('ethernet-ip');
const path = require('path');
const express = require('express');
const cors = require('cors');
const http = require('http');
const WebSocket = require('ws');

const CONFIG_FILE = path.join(__dirname, 'settings.json');
const OUTPUT_FILE = path.join(__dirname, 'sensor_data.json');
const WELD_COUNT_FILE = path.join(__dirname, 'weld_counts.json');
const HISTORY_FILE = path.join(__dirname, 'gun_history.json');
const MAX_HISTORY_DAYS = 30;
const API_PORT = 7575;
const API_KEY = 'FlameApp123$byNevark'; // Change this to a secure random key
const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

let CONFIG = {};
try {
  CONFIG = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
} catch (err) {
  console.error("❌ Failed to read config.json:", err.message || err);
  process.exit(1);
}

const PLC_IP = CONFIG.IpAddress; // CompactLogix L33ER IP
const POLL_INTERVAL = 2500; // 2.5 seconds
const PLC = new Controller();

PLC.on('error', (err) => {
  console.error("❌ PLC controller error:", err.message || err);
});

// Safety net for any other unexpected unhandled exceptions — keeps the server
// alive and logging instead of crashing silently.
process.on('uncaughtException', (err) => {
  console.error("❌ Uncaught exception:", err.message || err);
});

// =============================================================================
// GUN NAME MAP
// Guns 1–18: original guns (Sensor_Temp_Flow[1-6] + Wago_Module[1-12])
// Guns 19–66: new guns from tag_list.xlsx
// =============================================================================
const GUN_NAME_MAP = {
  // --- Original guns (old server, unchanged) ---
  1:  "VA110190",
  2:  "VA110187",
  3:  "VA110171",
  4:  "VA110185",
  5:  "VA110186",
  6:  "VA110178",
  7:  "VA110174",
  8:  "VA110170",
  9:  "VA110172",
  10: "VA110184",
  11: "VA110183",
  12: "VA110182",
  13: "VA110189",
  14: "VA110192",
  15: "VA110161",
  16: "VA110164",
  17: "VA110166",
  18: "VA110167",
  // --- New guns from tag_list.xlsx (Sensor_Temp_Flow group) ---
  19: "VA110161_W",   // Sensor_Temp_Flow[11]
  20: "VA110164_W",   // Sensor_Temp_Flow[12]
  21: "VA110166_W",   // Sensor_Temp_Flow[13]
  22: "VA110167_W",   // Sensor_Temp_Flow[14]
  23: "VA110160_W",   // Sensor_Temp_Flow[15]
  24: "VA110157_W",   // Sensor_Temp_Flow[16]
  25: "VA110156_W",   // Sensor_Temp_Flow[17]
  26: "VA110151_W",   // Sensor_Temp_Flow[18]
  27: "VA110145_W",   // Sensor_Temp_Flow[21]
  28: "VA110148_W",   // Sensor_Temp_Flow[22]
  29: "VA110149_W",   // Sensor_Temp_Flow[23]
  30: "VA110130_W",   // Sensor_Temp_Flow[24]
  31: "VA110128_W",   // Sensor_Temp_Flow[25]
  32: "VA110127_W",   // Sensor_Temp_Flow[26]
  33: "VA110126_W",   // Sensor_Temp_Flow[27]
  34: "VA110122_W",   // Sensor_Temp_Flow[28]
  35: "VA110155_W",   // Sensor_Temp_Flow[31]
  36: "VA110158_W",   // Sensor_Temp_Flow[32]
  37: "VA110159_W",   // Sensor_Temp_Flow[33]
  38: "VA110162_W",   // Sensor_Temp_Flow[34]
  39: "VA110163_W",   // Sensor_Temp_Flow[35]
  40: "VA110165_W",   // Sensor_Temp_Flow[36]
  41: "VA110168_W",   // Sensor_Temp_Flow[37]
  42: "VA110169_W",   // Sensor_Temp_Flow[38]
  43: "VA110121_W",   // Sensor_Temp_Flow[41]
  44: "VA110147_W",   // Sensor_Temp_Flow[42]
  45: "VA110152_W",   // Sensor_Temp_Flow[43]
  46: "VA110153_W",   // Sensor_Temp_Flow[44]
  47: "VA110001_W",   // Sensor_Temp_Flow[45]
  48: "VA110003_W",   // Sensor_Temp_Flow[46]
  49: "VA110xxx_W47", // Sensor_Temp_Flow[47]
  50: "VA110xxx_W48", // Sensor_Temp_Flow[48]
  51: "VA110191_W",   // Sensor_Temp_Flow[51]
  52: "VA110202_W",   // Sensor_Temp_Flow[52]
  53: "VA110200_W",   // Sensor_Temp_Flow[53]
  54: "VA110195_W",   // Sensor_Temp_Flow[54]
  55: "VA110196_W",   // Sensor_Temp_Flow[55]
  56: "VA110xxx_W56", // Sensor_Temp_Flow[56]
  57: "VA110xxx_W57", // Sensor_Temp_Flow[57]
  58: "VA110xxx_W58", // Sensor_Temp_Flow[58]
  // --- New guns from tag_list.xlsx (Wago_Module group) ---
  59: "VA110194_W",   // Wago_Module[11]
  60: "VA110193_W",   // Wago_Module[12]
  61: "VA110331_W",   // Wago_Module[13]
  62: "VA110197_W14", // Wago_Module[14]
  63: "VA110201_W",   // Wago_Module[15]
  64: "VA110197_W16", // Wago_Module[16]
  65: "VA110188_W",   // Wago_Module[17]
  66: "VA110xxx_W18", // Wago_Module[18]
};

function getGunName(index) {
  return GUN_NAME_MAP[index] || `Gun ${index}`;
}

// =============================================================================
// TAG LIST BUILDER
//
// Original guns 1–18 (from old server logic, preserved exactly):
//   • Sensor_Temp_Flow[1..6]  → gun indices 1–6
//   • Wago_Module[1..12]      → gun indices 7–18
//   GunCount in settings.json must remain 18 for this block.
//
// New guns 19–66 (from tag_list.xlsx, explicit non-contiguous indices):
//   • Sensor_Temp_Flow[11-18, 21-28, 31-38, 41-48, 51-58] → gun indices 19–58
//   • Wago_Module[11-18]                                   → gun indices 59–66
// =============================================================================
const TAGS = [];
const OLD_GUN_COUNT = 18; // original guns — do NOT change this

// Block 1 — original Sensor_Temp_Flow[1..6] → guns 1–6
const sensorLimit = Math.min(OLD_GUN_COUNT, 7); // = 7, so loop runs i=1..6
for (let i = 1; i < sensorLimit; i++) {
  TAGS.push({ name: `Sensor_Temp_Flow[${i}].Flow_Out`, label: `Weld Gun ${i} - Flow`, index: i });
  TAGS.push({ name: `Sensor_Temp_Flow[${i}].Temp_Out`, label: `Weld Gun ${i} - Temp`, index: i });
}

// Block 2 — original Wago_Module[1..12] → guns 7–18
for (let i = 1; i <= OLD_GUN_COUNT - 6; i++) { // i=1..12
  const index = i + 6; // gun 7..18
  TAGS.push({ name: `Wago_Module[${i}].Flow_Out`, label: `Weld Gun ${index} - Flow`, index });
  TAGS.push({ name: `Wago_Module[${i}].Temp_Out`, label: `Weld Gun ${index} - Temp`, index });
}

// Block 3 — new guns from tag_list.xlsx
// Sensor_Temp_Flow with non-contiguous PLC indices, gun indices continue from 19
const NEW_SENSOR_TAGS = [
  // PLC index → gun index
  [11, 19], [12, 20], [13, 21], [14, 22], [15, 23], [16, 24], [17, 25], [18, 26],
  [21, 27], [22, 28], [23, 29], [24, 30], [25, 31], [26, 32], [27, 33], [28, 34],
  [31, 35], [32, 36], [33, 37], [34, 38], [35, 39], [36, 40], [37, 41], [38, 42],
  [41, 43], [42, 44], [43, 45], [44, 46], [45, 47], [46, 48], [47, 49], [48, 50],
  [51, 51], [52, 52], [53, 53], [54, 54], [55, 55], [56, 56], [57, 57], [58, 58],
];
for (const [plcIdx, gunIdx] of NEW_SENSOR_TAGS) {
  TAGS.push({ name: `Sensor_Temp_Flow[${plcIdx}].Flow_Out`, label: `Weld Gun ${gunIdx} - Flow`, index: gunIdx });
  TAGS.push({ name: `Sensor_Temp_Flow[${plcIdx}].Temp_Out`, label: `Weld Gun ${gunIdx} - Temp`, index: gunIdx });
}

// Block 4 — new Wago_Module with non-contiguous PLC indices, gun indices 59–66
const NEW_WAGO_TAGS = [
  [11, 59], [12, 60], [13, 61], [14, 62], [15, 63], [16, 64], [17, 65], [18, 66],
];
for (const [plcIdx, gunIdx] of NEW_WAGO_TAGS) {
  TAGS.push({ name: `Wago_Module[${plcIdx}].Flow_Out`, label: `Weld Gun ${gunIdx} - Flow`, index: gunIdx });
  TAGS.push({ name: `Wago_Module[${plcIdx}].Temp_Out`, label: `Weld Gun ${gunIdx} - Temp`, index: gunIdx });
}

const TOTAL_SENSORS = TAGS.length / 2; // each gun has 2 tags (flow + temp)

// =============================================================================

let gunHistory = {};
try {
  if (fs.existsSync(HISTORY_FILE)) {
    gunHistory = JSON.parse(fs.readFileSync(HISTORY_FILE, 'utf8'));
  }
} catch (e) {
  console.error("Failed to load history file:", e);
}

// Helper function to get IST timestamp
function getISTTimestamp() {
  const date = new Date();
  const utc = date.getTime() + (date.getTimezoneOffset() * 60000);
  const istOffset = 5.5 * 60 * 60000;
  const istDate = new Date(utc + istOffset);

  const YYYY = istDate.getFullYear();
  const MM = String(istDate.getMonth() + 1).padStart(2, '0');
  const DD = String(istDate.getDate()).padStart(2, '0');
  const hh = String(istDate.getHours()).padStart(2, '0');
  const mm = String(istDate.getMinutes()).padStart(2, '0');
  const ss = String(istDate.getSeconds()).padStart(2, '0');

  return `${YYYY}-${MM}-${DD} ${hh}:${mm}:${ss} +05:30`;
}

// Thread-safe data storage with mutex-like behavior
let latestSensorData = [];
let latestWeldCountData = { last_update: '', counts: {} };
let isWritingData = false;
let connectedClients = new Set();


async function generatePLCData() {
  try {
    await PLC.connect(PLC_IP, 0);
    console.log(`✅ Connected to PLC at ${PLC_IP}`);

    setInterval(async () => {
      try {
        const newSensorData = [];

        for (let i = 0; i < TAGS.length; i += 2) {
          const flowTag = new Tag(TAGS[i].name);
          const tempTag = new Tag(TAGS[i + 1].name);

          try {
            await PLC.readTag(flowTag);
            await PLC.readTag(tempTag);

            const flow = parseFloat(flowTag.value).toFixed(1);
            const temp = parseFloat(tempTag.value).toFixed(1);
            const index = TAGS[i].index;

            newSensorData.push({
              gunIndex: index,
              gunName: getGunName(index),
              timestamp: getISTTimestamp(),
              flowRate: parseFloat(flow),
              temperature: parseFloat(temp)
            });

          } catch (err) {
            console.error(`❌ Failed to read ${TAGS[i].label} or ${TAGS[i + 1].label}:`, err.message || err);
          }
        }
        console.log(newSensorData);

        await updateSensorDataSafely(newSensorData);

      } catch (err) {
        console.error("❌ Error during data generation cycle:", err.message || err);
      }

    }, POLL_INTERVAL);

  } catch (err) {
    console.error("❌ Failed to start PLC data generation:", err.message || err);
    setTimeout(generatePLCData, 10000); // Retry in 10 seconds
  }
}

function storeHistoricalData(data) {
  const now = Date.now();
  const cutoff = now - (MAX_HISTORY_DAYS * 24 * 60 * 60 * 1000);

  data.forEach(gun => {
    const gunName = gun.gunName || `Gun ${gun.gunIndex}`;

    if (!gunHistory[gunName]) {
      gunHistory[gunName] = [];
    }

    gunHistory[gunName].push({
      timestamp: now,
      flowRate: gun.flowRate,
      temperature: gun.temperature
    });

    gunHistory[gunName] = gunHistory[gunName].filter(p => p.timestamp >= cutoff);
  });

  const tempPath = HISTORY_FILE + '.tmp';
  fs.writeFile(tempPath, JSON.stringify(gunHistory, null, 2), (err) => {
    if (err) {
      console.error("❌ Failed to write history data:", err.message || err);
    } else {
      fs.rename(tempPath, HISTORY_FILE, (renameErr) => {
        if (renameErr) console.error("❌ Failed to rename history file:", renameErr.message || renameErr);
      });
    }
  });
}

// Thread-safe data access
function getSensorDataSafely() {
  return JSON.parse(JSON.stringify(latestSensorData));
}

// Thread-safe data update
async function updateSensorDataSafely(newData) {
  while (isWritingData) {
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  isWritingData = true;
  try {
    latestSensorData = [...newData];
    await saveDataToFileAsync(latestSensorData);
    storeHistoricalData(latestSensorData);
    broadcastToClients(latestSensorData);
  } finally {
    isWritingData = false;
  }
}

function broadcastToClients(data) {
  const message = JSON.stringify({
    type: 'sensor_update',
    timestamp: getISTTimestamp(),
    data: data
  });

  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error broadcasting to client:', error);
        connectedClients.delete(client);
      }
    }
  });
}

function broadcastWeldCountToClients(data) {
  const weldArray = Object.keys(data.counts || {}).map((gunName, index) => ({
    gunIndex: index + 1,
    gunName: gunName,
    weldCount: data.counts[gunName],
    lastUpdated: data.last_update
  }));

  const message = JSON.stringify({
    type: 'weld_count_update',
    timestamp: data.last_update || getISTTimestamp(),
    data: weldArray
  });

  connectedClients.forEach(client => {
    if (client.readyState === WebSocket.OPEN) {
      try {
        client.send(message);
      } catch (error) {
        console.error('Error broadcasting weld count to client:', error);
        connectedClients.delete(client);
      }
    }
  });
}

function saveDataToFileAsync(data) {
  return new Promise((resolve, reject) => {
    const tempPath = OUTPUT_FILE + '.tmp';
    fs.writeFile(tempPath, JSON.stringify(data, null, 2), (err) => {
      if (err) {
        console.error("❌ Failed to write sensor data to file:", err.message || err);
        reject(err);
      } else {
        fs.rename(tempPath, OUTPUT_FILE, (renameErr) => {
          if (renameErr) reject(renameErr);
          else resolve();
        });
      }
    });
  });
}

function startWeldCountFileWatcher() {
  loadWeldCountFromFile();

  fs.watch(WELD_COUNT_FILE, (eventType) => {
    if (eventType === 'rename' || eventType === 'change') {
      loadWeldCountFromFile();
    }
  });
}

function loadWeldCountFromFile() {
  try {
    if (fs.existsSync(WELD_COUNT_FILE)) {
      const raw = fs.readFileSync(WELD_COUNT_FILE, 'utf8');
      const parsed = JSON.parse(raw);
      latestWeldCountData = { ...parsed };
      broadcastWeldCountToClients(latestWeldCountData);
    }
  } catch (err) {
    console.error("❌ Failed to read weld count file:", err.message || err);
  }
}

function getWeldCountDataSafely() {
  return JSON.parse(JSON.stringify(latestWeldCountData));
}

function authenticateAPI(req, res, next) {
  const apiKey = req.headers['x-api-key'] || req.query.apiKey;

  if (!apiKey || apiKey !== API_KEY) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Valid API key required'
    });
  }

  next();
}

app.get('/api/history', authenticateAPI, (req, res) => {
  const gunName = req.query.gunName;
  const range = (req.query.range || "24h").toLowerCase();

  const rangeMap = {
    "1h": 3600000,
    "6h": 21600000,
    "12h": 43200000,
    "24h": 86400000,
    "7d": 604800000,
    "30d": 2592000000
  };
  const isAllRange = range === "all";

  const cutoff = isAllRange ? 0 : Date.now() - (rangeMap[range] || rangeMap["24h"]);

  const data = (gunHistory[gunName] || []).filter(
    p => p.timestamp >= cutoff
  );

  res.json({
    success: true,
    gunName,
    points: data.length,
    data
  });
});

app.get('/', (req, res) => {
  res.status(403).send(`
    <h1>403 - Forbidden</h1>
    <p>Access to this resource is restricted.</p>
  `);
});

app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  allowedHeaders: ['Content-Type', 'x-api-key']
}));

app.use(express.json());

app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: getISTTimestamp(),
    totalGuns: TOTAL_SENSORS,
    connectedClients: connectedClients.size,
    mode: 'LIVE_DATA'
  });
});

app.get('/api/guns', authenticateAPI, (req, res) => {
  const safeData = getSensorDataSafely();
  res.json({
    success: true,
    timestamp: getISTTimestamp(),
    totalGuns: TOTAL_SENSORS,
    data: safeData
  });
});

app.get('/api/guns/:gunIndex', authenticateAPI, (req, res) => {
  const gunIndex = parseInt(req.params.gunIndex);
  const safeData = getSensorDataSafely();
  const gunData = safeData.find(gun => gun.gunIndex === gunIndex);

  if (!gunData) {
    return res.status(404).json({
      success: false,
      error: 'Gun not found',
      gunIndex: gunIndex
    });
  }

  res.json({
    success: true,
    timestamp: getISTTimestamp(),
    data: gunData
  });
});

app.get('/api/alerts', authenticateAPI, (req, res) => {
  const safeData = getSensorDataSafely();
  const alerts = safeData.filter(gun => {
    const highTemp = gun.temperature > 45.0;
    const lowFlow = gun.flowRate < 8.0;
    return highTemp || lowFlow;
  });

  res.json({
    success: true,
    timestamp: getISTTimestamp(),
    alertCount: alerts.length,
    alerts: alerts.map(gun => ({
      ...gun,
      alertType: gun.temperature > 45.0 ? 'HIGH_TEMPERATURE' : 'LOW_FLOW',
      severity: gun.temperature > 50.0 || gun.flowRate < 5.0 ? 'CRITICAL' : 'WARNING'
    }))
  });
});

app.get('/api/weld-counts', authenticateAPI, (req, res) => {
  const safeData = getWeldCountDataSafely();

  const weldArray = Object.keys(safeData.counts || {}).map((gunName, index) => ({
    gunIndex: index + 1,
    gunName: gunName,
    weldCount: safeData.counts[gunName],
    lastUpdated: safeData.last_update
  }));

  res.json({
    success: true,
    timestamp: safeData.last_update || getISTTimestamp(),
    totalGuns: Object.keys(safeData.counts || {}).length,
    data: weldArray
  });
});

app.get('/api/weld-counts/:gunName', authenticateAPI, (req, res) => {
  const gunName = req.params.gunName;
  const safeData = getWeldCountDataSafely();

  if (!safeData.counts || !(gunName in safeData.counts)) {
    return res.status(404).json({
      success: false,
      error: 'Gun not found',
      gunName: gunName
    });
  }

  res.json({
    success: true,
    timestamp: safeData.last_update || getISTTimestamp(),
    data: {
      gunName: gunName,
      weldCount: safeData.counts[gunName],
      lastUpdated: safeData.last_update
    }
  });
});

wss.on('connection', (ws, req) => {
  console.log('📱 New WebSocket client connected');
  connectedClients.add(ws);

  const safeData = getSensorDataSafely();
  ws.send(JSON.stringify({
    type: 'initial_data',
    timestamp: getISTTimestamp(),
    data: safeData
  }));

  const safeWeldData = getWeldCountDataSafely();
  if (safeWeldData.counts && Object.keys(safeWeldData.counts).length > 0) {
    const weldArray = Object.keys(safeWeldData.counts).map((gunName, index) => ({
      gunIndex: index + 1,
      gunName: gunName,
      weldCount: safeWeldData.counts[gunName],
      lastUpdated: safeWeldData.last_update
    }));

    ws.send(JSON.stringify({
      type: 'weld_count_update',
      timestamp: safeWeldData.last_update || getISTTimestamp(),
      data: weldArray
    }));
  }

  ws.on('close', () => {
    console.log('📱 WebSocket client disconnected');
    connectedClients.delete(ws);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    connectedClients.delete(ws);
  });
});

server.listen(API_PORT, '0.0.0.0', () => {
  console.log(`🚀 FLAME API Server running on port ${API_PORT}`);
  console.log(`📡 WebSocket endpoint: ws://localhost:${API_PORT}`);
  console.log(`🔑 API Key: ${API_KEY}`);
  console.log(`📊 Monitoring ${TOTAL_SENSORS} guns`);
  console.log(`🎲 Generating data every ${POLL_INTERVAL}ms`);
  console.log(`🔧 Monitoring weld count data every 5000ms`);
});

generatePLCData();
startWeldCountFileWatcher();