// Inisialisasi koneksi socket
const socket = io();

// PASTIKAN: Nama event harus sama dengan io.emit di server.js ('mqtt-data')
socket.on('mqtt-data', (data) => {
    console.log("Menerima update dari Wonosobo:", data);

    // 1. Update Kelembapan
    if (data.topic === 'greenhouse/humi') {
        const humidityElement = document.getElementById('humidity-value');
        if (humidityElement) {
            humidityElement.innerText = data.message; // Pakai .message sesuai server.js
        }
    } 
    
    // 2. Update Temperatur
    if (data.topic === 'greenhouse/temp') {
        const tempElement = document.getElementById('temperature-value');
        if (tempElement) {
            tempElement.innerText = data.message; // Pakai .message sesuai server.js
        }
    }
});