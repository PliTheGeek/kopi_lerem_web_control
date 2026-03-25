const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const fs = require('fs');
const http = require('http'); 
const { Server } = require('socket.io'); 
const PDFDocument = require('pdfkit');

const app = express();
const server = http.createServer(app); 
const io = new Server(server); 
const PORT = 3000;
const DATA_DIR = path.join(__dirname, 'data');
const SENSOR_LOG_FILE = path.join(DATA_DIR, 'sensor-history.json');
const MAX_RECORDS = 5000;

// --- VARIABEL INGATAN STATUS  ---
let lastRelayStatus = "UNKNOWN"; 
let sensorHistory = [];
let saveTimeout = null;

function ensureStorageReady() {
    if (!fs.existsSync(DATA_DIR)) {
        fs.mkdirSync(DATA_DIR, { recursive: true });
    }

    if (!fs.existsSync(SENSOR_LOG_FILE)) {
        fs.writeFileSync(
            SENSOR_LOG_FILE,
            JSON.stringify({ updatedAt: new Date().toISOString(), records: [] }, null, 2)
        );
    }

    try {
        const raw = fs.readFileSync(SENSOR_LOG_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        sensorHistory = Array.isArray(parsed.records) ? parsed.records : [];
    } catch (error) {
        sensorHistory = [];
        fs.writeFileSync(
            SENSOR_LOG_FILE,
            JSON.stringify({ updatedAt: new Date().toISOString(), records: [] }, null, 2)
        );
    }
}

function persistSensorHistory() {
    if (saveTimeout) {
        clearTimeout(saveTimeout);
    }

    saveTimeout = setTimeout(() => {
        const payload = {
            updatedAt: new Date().toISOString(),
            records: sensorHistory
        };

        fs.writeFile(
            SENSOR_LOG_FILE,
            JSON.stringify(payload, null, 2),
            (error) => {
                if (error) {
                    console.error('Gagal menyimpan sensor-history.json:', error.message);
                }
            }
        );
    }, 400);
}

function addSensorRecord(data) {
    const record = {
        timestamp: new Date().toISOString(),
        hum: typeof data.hum === 'number' ? data.hum : Number(data.hum),
        temp: typeof data.temp === 'number' ? data.temp : Number(data.temp),
        misting: data.misting || 'UNKNOWN',
        target_hum: data.target_hum || null
    };

    sensorHistory.push(record);
    if (sensorHistory.length > MAX_RECORDS) {
        sensorHistory = sensorHistory.slice(sensorHistory.length - MAX_RECORDS);
    }

    persistSensorHistory();
}

ensureStorageReady();

app.use(express.static(path.join(__dirname, 'public')));

// Koneksi ke MQTT Broker (Mosquitto)
const client = mqtt.connect('mqtt://mqtt-broker:1883');

client.on('connect', () => {
    console.log('Connected to MQTT Broker inside Docker!');
    client.subscribe('greenhouse/#', (err) => {
        if (!err) console.log('Subscribed to Greenhouse topics');
    });
});

// --- MENERIMA DATA DARI ESP32 (MQTT) ---
client.on('message', (topic, message) => {
    const payloadStr = message.toString();
    
    // 1. Coba Parse JSON untuk Logika "Smart Log"
    if (topic === 'greenhouse/sensors') {
        try {
            const data = JSON.parse(payloadStr);

            
            // Log Perubahan Status Sensor 
            if (data.target_hum && data.target_hum !== lastRelayStatus) {
                console.log("\n========================================");
                console.log(` PERUBAHAN STATUS DETECTED!`);
                console.log(` Waktu: ${new Date().toLocaleTimeString()}`);
                console.log(` Status: [ ${lastRelayStatus} ]  --->  [ ${data.target_hum} ]`);
                console.log(` Kondisi: Hum ${data.hum}% / Temp ${data.temp}°C`);
                console.log("========================================\n");
                
                // Update ingatan server
                lastRelayStatus = data.target_hum;
            }
            
            // Note: Melihat Data Log Sensor Setiap Update:
            console.log(`New Data [${topic}]: ${payloadStr}`);
            addSensorRecord(data);

        } catch (e) {
            // Note : Log Data Mentah Jika Parsing Gagal
            console.log(`Raw Data [${topic}]: ${payloadStr}`);
        }
    }

    // 2. KIRIM KE WEB DASHBOARD (Wajib tetap jalan)
    io.emit('mqtt-data', {
        topic: topic,
        message: payloadStr,
        time: new Date().toLocaleTimeString()
    });
});

// --- MENERIMA PERINTAH DARI WEB (Socket.IO) ---
io.on('connection', (socket) => {
    
    // Listener saat Web Dashboard mengirim perintah update
    socket.on('update_settings', (data) => {
        
        // Log Cantik saat User Mengubah Setting
        console.log("\n----------------------------------------");
        console.log(" USER MENGUBAH PARAMETER (Web -> MQTT)");
        console.log(` Target Humidity : ${data.target}%`);
        console.log(` Hysteresis      : ${data.hysteresis}%`);
        console.log("----------------------------------------\n");

        // 1. Publish Target Humidity ke ESP32
        if (data.target) {
            client.publish('kopilerem/set_hum_target', String(data.target));
        }

        // 2. Publish Histeresis ke ESP32
        if (data.hysteresis) {
            client.publish('kopilerem/set_hum_hyst', String(data.hysteresis));
        }
    });
});

app.get('/api/download-pdf', (req, res) => {
    const doc = new PDFDocument({ margin: 40, size: 'A4' });
    const fileName = `kopi-lerem-report-${new Date().toISOString().slice(0, 10)}.pdf`;

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);

    doc.pipe(res);

    doc.fontSize(18).text('Kopi Lerem Sensor Report', { align: 'left' });
    doc.moveDown(0.3);
    doc.fontSize(10).fillColor('#555').text(`Generated: ${new Date().toLocaleString()}`);
    doc.moveDown(0.8);

    if (!sensorHistory.length) {
        doc.fontSize(12).fillColor('#000').text('No sensor data available in JSON storage.');
        doc.end();
        return;
    }

    const tempValues = sensorHistory.map((item) => item.temp).filter((value) => Number.isFinite(value));
    const humValues = sensorHistory.map((item) => item.hum).filter((value) => Number.isFinite(value));

    const summary = [
        `Records: ${sensorHistory.length}`,
        `Temp Max/Min: ${tempValues.length ? Math.max(...tempValues) : '-'} / ${tempValues.length ? Math.min(...tempValues) : '-'} °C`,
        `Hum Max/Min: ${humValues.length ? Math.max(...humValues) : '-'} / ${humValues.length ? Math.min(...humValues) : '-'} %`
    ];

    summary.forEach((line) => {
        doc.fontSize(11).fillColor('#111').text(line);
    });

    doc.moveDown(1);
    doc.fontSize(11).fillColor('#000').text('Latest Sensor Records', { underline: true });
    doc.moveDown(0.4);

    const lastRecords = sensorHistory.slice(-120).reverse();
    lastRecords.forEach((item, index) => {
        if (doc.y > 760) {
            doc.addPage();
        }

        const line = `${index + 1}. ${new Date(item.timestamp).toLocaleString()} | Temp: ${item.temp}°C | Hum: ${item.hum}% | Misting: ${item.misting}`;
        doc.fontSize(9).fillColor('#222').text(line, { lineGap: 1 });
    });

    doc.end();
});

// Jalankan Server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kopi Lerem Dashboard live at http://20.6.33.91`);
});