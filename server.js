const express = require('express');
const mqtt = require('mqtt');
const path = require('path');
const app = express();
const PORT = 3000;

// 1. Serve your dashboard files from the "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// 2. Connect to your internal MQTT broker
// We use the container name 'mqtt-broker' defined in your docker-compose.yml
const client = mqtt.connect('mqtt://mqtt-broker:1883');

client.on('connect', () => {
    console.log('✅ Connected to MQTT Broker inside Docker!');
    client.subscribe('greenhouse/#', (err) => {
        if (!err) console.log('📡 Subscribed to Greenhouse topics');
    });
});

client.on('message', (topic, message) => {
    // This will show up in your 'docker compose logs -f web'
    console.log(`📩 New Data [${topic}]: ${message.toString()}`);
});

// 3. Start the Web Server on all interfaces
app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Kopi Lerem Dashboard live at http://20.6.33.91`);
});