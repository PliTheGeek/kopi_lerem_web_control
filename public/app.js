socket.on('mqtt-data', (data) => {
    console.log("Menerima update dari Wonosobo:", data);

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

        } catch (e) {
            console.error("Format data rusak atau bukan JSON:", e);
        }
    }
});