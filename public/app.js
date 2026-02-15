const socket = io('http://20.6.33.91');
socket.on('mqtt-data', (data) => {
    // console.log("Menerima update dari Wonosobo:", data);

    // Filter topik sesuai yang dikirim ESP32
    if (data.topic === 'greenhouse/sensors') {
        try {
            // Membongkar bungkusan JSON dari string menjadi object
            const payload = JSON.parse(data.message);

            // Update Humidity ke <span id="humidity-value">
            const humidityElement = document.getElementById('humidity-value');
            if (humidityElement && payload.hum !== undefined) {
                humidityElement.innerText = payload.hum;
            }

            // Update Temperature ke <span id="temperature-value">
            const tempElement = document.getElementById('temperature-value');
            if (tempElement && payload.temp !== undefined) {
                tempElement.innerText = payload.temp;
            }

            const targetInfoElement = document.getElementById('target-info');
            if (targetInfoElement && payload.target_hum !== undefined) {
                 targetInfoElement.innerText = payload.target_hum;
            }

        } catch (e) {
            console.error("Format data rusak atau bukan JSON:", e);
        }
    }
});

// Function Mengirim Data Ke Server  Ke EsP32

function updateSettings() {
    // 1. Ambil nilai dari input HTML (Pastikan ID di index.html sesuai)
    const targetHum = document.getElementById('targetHumInput').value;
    const hyst = document.getElementById('hystInput').value;

    // 2. Validasi sederhana
    if (!targetHum || !hyst) {
        alert("Mohon isi Target dan Histeresis!");
        return;
    }

    // 3. Kirim data ke server.js menggunakan Socket.io
    socket.emit('update_settings', {
        target: targetHum,
        hysteresis: hyst
    });

    alert("Rule Baru Ditambahkan Ke IoT");
}