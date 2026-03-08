const socket = io('http://20.6.33.91');

let humidityMin = null;
let humidityMax = null;
let temperatureMin = null;
let temperatureMax = null;

let currentDayKey = null;
let dailyTempHigh = null;
let dailyTempLow = null;
let dailyHumHigh = null;
let dailyHumLow = null;

const chartLabels = [];
const temperatureSeries = [];
const humiditySeries = [];
let temperatureChart = null;
const maxPoints = 300;

function getDayKey(dateObj) {
    return `${dateObj.getFullYear()}-${dateObj.getMonth() + 1}-${dateObj.getDate()}`;
}

function initializeChart() {
    if (typeof Chart === 'undefined') {
        return;
    }

    const canvas = document.getElementById('temperature-chart');
    if (!canvas) {
        return;
    }

    const ctx = canvas.getContext('2d');
    temperatureChart = new Chart(ctx, {
        type: 'line',
        data: {
            labels: chartLabels,
            datasets: [
                {
                    label: 'Temperature (°C)',
                    data: temperatureSeries,
                    borderColor: '#1a73e8',
                    backgroundColor: 'rgba(26, 115, 232, 0.12)',
                    fill: true,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    borderWidth: 2,
                    yAxisID: 'yTemp'
                },
                {
                    label: 'Humidity (%)',
                    data: humiditySeries,
                    borderColor: '#22c55e',
                    backgroundColor: 'rgba(34, 197, 94, 0.10)',
                    fill: false,
                    tension: 0.3,
                    pointRadius: 0,
                    pointHoverRadius: 3,
                    borderWidth: 2,
                    yAxisID: 'yHum'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    display: true,
                    labels: {
                        usePointStyle: true,
                        boxWidth: 8
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        maxTicksLimit: 8
                    },
                    grid: {
                        display: false
                    }
                },
                yTemp: {
                    position: 'left',
                    ticks: {
                        callback(value) {
                            return `${value}°C`;
                        }
                    }
                },
                yHum: {
                    position: 'right',
                    grid: {
                        drawOnChartArea: false
                    },
                    ticks: {
                        callback(value) {
                            return `${value}%`;
                        }
                    }
                }
            }
        }
    });
}

function resetDailyStats(now) {
    dailyTempHigh = null;
    dailyTempLow = null;
    dailyHumHigh = null;
    dailyHumLow = null;

    chartLabels.length = 0;
    temperatureSeries.length = 0;
    humiditySeries.length = 0;

    const dayLabelElement = document.getElementById('chart-day-label');
    if (dayLabelElement) {
        dayLabelElement.innerText = now.toLocaleDateString();
    }

    updateDailyStatsDisplay();

    if (temperatureChart) {
        temperatureChart.update();
    }
}

function ensureDailyState(now) {
    const dayKey = getDayKey(now);
    if (dayKey !== currentDayKey) {
        currentDayKey = dayKey;
        resetDailyStats(now);
    }
}

function updateDailyStatsDisplay() {
    const dailyTempHighElement = document.getElementById('daily-temp-high');
    const dailyTempLowElement = document.getElementById('daily-temp-low');
    const dailyHumHighElement = document.getElementById('daily-hum-high');
    const dailyHumLowElement = document.getElementById('daily-hum-low');

    if (dailyTempHighElement) dailyTempHighElement.innerText = dailyTempHigh === null ? '--' : `${dailyTempHigh}°C`;
    if (dailyTempLowElement) dailyTempLowElement.innerText = dailyTempLow === null ? '--' : `${dailyTempLow}°C`;
    if (dailyHumHighElement) dailyHumHighElement.innerText = dailyHumHigh === null ? '--' : `${dailyHumHigh}%`;
    if (dailyHumLowElement) dailyHumLowElement.innerText = dailyHumLow === null ? '--' : `${dailyHumLow}%`;
}

function updateDailyStats(type, value, timestamp) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return;
    }

    ensureDailyState(timestamp);

    if (type === 'temperature') {
        dailyTempHigh = dailyTempHigh === null ? value : Math.max(dailyTempHigh, value);
        dailyTempLow = dailyTempLow === null ? value : Math.min(dailyTempLow, value);
    }

    if (type === 'humidity') {
        dailyHumHigh = dailyHumHigh === null ? value : Math.max(dailyHumHigh, value);
        dailyHumLow = dailyHumLow === null ? value : Math.min(dailyHumLow, value);
    }

    updateDailyStatsDisplay();
}

function updateChartPoint(temperatureValue, humidityValue, timestamp) {
    if (temperatureValue === null && humidityValue === null) {
        return;
    }

    chartLabels.push(timestamp.toLocaleTimeString());
    temperatureSeries.push(temperatureValue);
    humiditySeries.push(humidityValue);

    if (chartLabels.length > maxPoints) {
        chartLabels.shift();
        temperatureSeries.shift();
        humiditySeries.shift();
    }

    if (temperatureChart) {
        temperatureChart.update();
    }
}

initializeChart();
ensureDailyState(new Date());

function updateMinMaxDisplay(type, value) {
    if (typeof value !== 'number' || Number.isNaN(value)) {
        return;
    }

    if (type === 'humidity') {
        humidityMin = humidityMin === null ? value : Math.min(humidityMin, value);
        humidityMax = humidityMax === null ? value : Math.max(humidityMax, value);

        const minElement = document.getElementById('humidity-min');
        const maxElement = document.getElementById('humidity-max');
        if (minElement) minElement.innerText = humidityMin;
        if (maxElement) maxElement.innerText = humidityMax;
    }

    if (type === 'temperature') {
        temperatureMin = temperatureMin === null ? value : Math.min(temperatureMin, value);
        temperatureMax = temperatureMax === null ? value : Math.max(temperatureMax, value);

        const minElement = document.getElementById('temperature-min');
        const maxElement = document.getElementById('temperature-max');
        if (minElement) minElement.innerText = temperatureMin;
        if (maxElement) maxElement.innerText = temperatureMax;
    }
}

socket.on('mqtt-data', (data) => {
    console.log("Menerima update dari Wonosobo:", data);

    // Filter topik sesuai yang dikirim ESP32
    if (data.topic === 'greenhouse/sensors') {
        try {
            // Parsing data JSON dari ESP32
            const payload = JSON.parse(data.message);
            const now = new Date();
            ensureDailyState(now);
            let latestHumidityValue = null;
            let latestTemperatureValue = null;

            // Update Humidity 
            const humidityElement = document.getElementById('humidity-value');
            if (humidityElement && payload.hum !== undefined) {
                humidityElement.innerText = payload.hum;
                const humValue = Number(payload.hum);
                latestHumidityValue = Number.isNaN(humValue) ? null : humValue;
                updateMinMaxDisplay('humidity', humValue);
                updateDailyStats('humidity', humValue, now);
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
                const tempValue = Number(payload.temp);
                latestTemperatureValue = Number.isNaN(tempValue) ? null : tempValue;
                updateMinMaxDisplay('temperature', tempValue);
                updateDailyStats('temperature', tempValue, now);
            }

            updateChartPoint(latestTemperatureValue, latestHumidityValue, now);

            // Update Last Active Time
            const lastActiveElement = document.getElementById('last-active');
            if (lastActiveElement) {
                lastActiveElement.innerText = `Last Active : ${now.toLocaleTimeString()}`;
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

function downloadPdfReport() {
    window.open('/api/download-pdf', '_blank');
}