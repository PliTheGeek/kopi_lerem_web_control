const socket = io('http://20.6.33.91');
socket.on('mqtt-data', (data) => {
    console.log("Menerima update dari Wonosobo:", data);

    // Filter topik sesuai yang dikirim ESP32
    if (data.topic === 'greenhouse/sensors') {
        try {
            // Parsing data JSON dari ESP32
            const payload = JSON.parse(data.message);

            // Update Humidity 
            const humidityElement = document.getElementById('humidity-value');
            if (humidityElement && payload.hum !== undefined) {
                humidityElement.innerText = payload.hum;
            }

            // Update Misting Status

            const mistingElement = document.getElementById('misting-status');
            if (mistingElement && payload.misting !== undefined) {
                mistingElement.innerText = payload.misting;
                
                // Opsional: Beri warna (Hijau jika ON, Merah jika OFF)
                mistingElement.style.color = (payload.misting === "ON") ? "#2ecc71" : "#e74c3c";
            }

            // Update Temperature 
            const tempElement = document.getElementById('temperature-value');
            if (tempElement && payload.temp !== undefined) {
                tempElement.innerText = payload.temp;
            }

            // Update Last Active Time
            const lastActiveElement = document.getElementById('last-active');
            if (lastActiveElement) {
                lastActiveElement.innerText = `Last Active : ${new Date().toLocaleTimeString()}`;
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