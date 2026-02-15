const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server); 
const PORT = 3000;

// --- VARIABEL INGATAN STATUS (Supaya gak spam log) ---
let lastRelayStatus = "UNKNOWN"; 

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

            // Cek apakah status Relay BERUBAH dari sebelumnya?
            // (Kita baca field 'target_hum' yang isinya "ON"/"OFF")
            if (data.target_hum && data.target_hum !== lastRelayStatus) {
                console.log("\n========================================");
                console.log(`⚠️  PERUBAHAN STATUS DETECTED!`);
                console.log(`🕒  Waktu: ${new Date().toLocaleTimeString()}`);
                console.log(`🔌  Status: [ ${lastRelayStatus} ]  --->  [ ${data.target_hum} ]`);
                console.log(`💧  Kondisi: Hum ${data.hum}% / Temp ${data.temp}°C`);
                console.log("========================================\n");
                
                // Update ingatan server
                lastRelayStatus = data.target_hum;
            }
            
            // Note: Kalau mau lihat data mentah tiap detik, uncomment baris bawah ini:
            // console.log(`New Data [${topic}]: ${payloadStr}`);

        } catch (e) {
            // Kalau bukan JSON (data sampah/error), print aja biar tau
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
        console.log("🛠️  USER MENGUBAH PARAMETER (Web -> MQTT)");
        console.log(`🎯  Target Humidity : ${data.target}%`);
        console.log(`↔️  Hysteresis      : ${data.hysteresis}%`);
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

// Jalankan Server
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kopi Lerem Dashboard live at http://20.6.33.91`);
});