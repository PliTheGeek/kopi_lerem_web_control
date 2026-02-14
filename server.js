const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const http = require('http'); 
const { Server } = require('socket.io'); 

const app = express();
const server = http.createServer(app); 
const io = new Server(server); 
const PORT = 3000;

app.use(express.static(path.join(__dirname, 'public')));

// Koneksi ke MQTT Broker (Mosquitto)
const client = mqtt.connect('mqtt://mqtt-broker:1883');

client.on('connect', () => {
    console.log('Connected to MQTT Broker inside Docker!');
    client.subscribe('greenhouse/#', (err) => {
        if (!err) console.log('Subscribed to Greenhouse topics');
    });
});

client.on('message', (topic, message) => {
    const payload = message.toString();
    
    // 1. Muncul di log docker 
    console.log(`New Data [${topic}]: ${payload}`);

    // 2. KIRIM KE WEB DASHBOARD 
    
    io.emit('mqtt-data', {
        topic: topic,
        message: payload,
        time: new Date().toLocaleTimeString()
    });
});

// Ganti app.listen menjadi server.listen
server.listen(PORT, '0.0.0.0', () => {
    console.log(`Kopi Lerem Dashboard live at http://20.6.33.91`);
});