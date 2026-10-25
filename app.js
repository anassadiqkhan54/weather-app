const GEO_URL = "https://geocoding-api.open-meteo.com/v1/search";
const WEATHER_URL = "https://api.open-meteo.com/v1/forecast";

const input = document.getElementById("cityInput");
const searchBtn = document.getElementById("searchBtn");
const message = document.getElementById("message");
const result = document.getElementById("result");

// Weather code -> text (Open-Meteo ke codes)
const CODES = {
  0: "Clear sky", 1: "Mostly clear", 2: "Partly cloudy", 3: "Overcast",
  45: "Fog", 48: "Freezing fog",
  51: "Light drizzle", 53: "Drizzle", 55: "Heavy drizzle",
  61: "Light rain", 63: "Rain", 65: "Heavy rain",
  71: "Light snow", 73: "Snow", 75: "Heavy snow",
  80: "Rain showers", 81: "Rain showers", 82: "Violent showers",
  95: "Thunderstorm", 96: "Thunderstorm with hail", 99: "Thunderstorm with hail"
};
const describe = (code) => CODES[code] || "Unknown";

function showMessage(text, isError = false) {
  message.textContent = text;
  message.className = isError ? "message error" : "message";
}

// Step 1: city ka naam -> latitude/longitude
async function findPlace(query) {
  // "Paris, France" ho to city aur country alag kar do
  const parts = query.split(",").map(p => p.trim());
  const city = parts[0];
  const country = parts[1] ? parts[1].toLowerCase() : "";

  const res = await fetch(`${GEO_URL}?name=${encodeURIComponent(city)}&count=10&language=en`);
  if (!res.ok) throw new Error("Could not reach the location service.");
  const data = await res.json();
  if (!data.results) return null;

  if (country) {
    const match = data.results.find(r =>
      (r.country || "").toLowerCase().includes(country) ||
      (r.country_code || "").toLowerCase() === country
    );
    return match || null;
  }
  return data.results[0];
}

// Step 2: lat/lon -> weather
async function getWeather(lat, lon) {
  const params = new URLSearchParams({
    latitude: lat,
    longitude: lon,
    current: "temperature_2m,relative_humidity_2m,apparent_temperature,wind_speed_10m,weather_code,is_day",
    daily: "weather_code,temperature_2m_max,temperature_2m_min",
    timezone: "auto"
  });
  const res = await fetch(`${WEATHER_URL}?${params}`);
  if (!res.ok) throw new Error("Could not load the weather.");
  return res.json();
}

function render(place, w) {
  const c = w.current;
  const placeName = [place.name, place.admin1, place.country].filter(Boolean).join(", ");

  document.getElementById("place").textContent = placeName;
  document.getElementById("condition").textContent = describe(c.weather_code);
  document.getElementById("temp").textContent = Math.round(c.temperature_2m);
  document.getElementById("feels").textContent = Math.round(c.apparent_temperature) + "°C";
  document.getElementById("humidity").textContent = c.relative_humidity_2m + "%";
  document.getElementById("wind").textContent = Math.round(c.wind_speed_10m) + " km/h";

  document.body.classList.toggle("night", c.is_day === 0);

  // Agle 5 din (index 0 aaj hai)
  const list = document.getElementById("forecast");
  list.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const day = new Date(w.daily.time[i]).toLocaleDateString("en-US", { weekday: "short" });
    const li = document.createElement("li");
    li.innerHTML = `<span>${day}</span>
      <span>${describe(w.daily.weather_code[i])}</span>
      <strong>${Math.round(w.daily.temperature_2m_max[i])}° / ${Math.round(w.daily.temperature_2m_min[i])}°</strong>`;
    list.appendChild(li);
  }
  result.classList.remove("hidden");
}

async function search() {
  const query = input.value.trim();
  if (!query) {
    showMessage("Enter a city name to search.", true);
    return;
  }
  showMessage("Loading...");
  result.classList.add("hidden");

  try {
    const place = await findPlace(query);
    if (!place) {
      showMessage(`No place found for "${query}". Check the spelling and try again.`, true);
      return;
    }
    const weather = await getWeather(place.latitude, place.longitude);
    render(place, weather);
    showMessage("");
  } catch (err) {
    showMessage(err.message + " Check your internet connection.", true);
  }
}

searchBtn.addEventListener("click", search);
input.addEventListener("keydown", (e) => { if (e.key === "Enter") search(); });