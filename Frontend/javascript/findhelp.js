// ============================================
//   MINDCARE HUB — Find Help JS
// ============================================

let currentMap = null;
let currentMarkers = [];

// Filter tab → Google Places type mapping
const filterTypeMap = {
  all:     'doctor',
  online:  'health',
  campus:  'university',
  student: 'doctor'
};

const filterKeywordMap = {
  all:     'mental health free',
  online:  'online counselling therapy',
  campus:  'campus wellness student counselling',
  student: 'student therapist psychologist'
};

// ─── Auth check ─────────────────────────────
const currentUser = JSON.parse(localStorage.getItem('currentUser'));
if (!currentUser) {
  window.location.href = 'signin.html';
}

// ─── Clear all existing pins ─────────────────
function clearMarkers() {
  currentMarkers.forEach(m => m.setMap(null));
  currentMarkers = [];
}

// ─── Pan map to a place ──────────────────────
function panToPlace(lat, lng) {
  if (currentMap) {
    currentMap.panTo({ lat, lng });
    currentMap.setZoom(16);
  }
}

// ─── Start Chat button ───────────────────────
function startChat() {
  window.open('https://www.onlinecounselling.co.za', '_blank');
}

// ─── Call button ─────────────────────────────
function startCall() {
  window.location.href = 'tel:+27800567567';
}

// ─── Reverse geocode coords → human address ──
function setLocationDisplay(lat, lng) {
  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ location: { lat, lng } }, (results, status) => {
    if (status !== 'OK' || !results.length) return;

    // Search ALL results for a named establishment/POI
    const preferred = ['establishment', 'point_of_interest', 'premise', 'university', 'school'];
    let best = null;

    for (const type of preferred) {
      const match = results.find(r => r.types.includes(type));
      if (match) { best = match; break; }
    }

    // Use the place name from the matched result, or fall back to suburb/city
    let display = null;

    if (best) {
      display = best.address_components[0]?.long_name || best.formatted_address;
    } else {
      const fallbackTypes = ['neighborhood', 'sublocality_level_1', 'sublocality', 'locality'];
      const components = results[0].address_components;
      for (const type of fallbackTypes) {
        const match = components.find(c => c.types.includes(type));
        if (match) { display = match.long_name; break; }
      }
      display = display || results[0].formatted_address;
    }

    const locationText  = document.querySelector('.location-text');
    const locationValue = document.querySelector('.your-location-value');
    if (locationText)  locationText.textContent  = display;
    if (locationValue) locationValue.textContent = display;
  });
}

// ─── View Details modal ──────────────────────
function showDetails(placeId) {
  const service = new google.maps.places.PlacesService(currentMap);
  service.getDetails(
    { placeId, fields: ['name', 'formatted_address', 'formatted_phone_number', 'opening_hours', 'rating', 'website', 'types'] },
    (place, status) => {
      if (status !== google.maps.places.PlacesServiceStatus.OK) return;

      const hours  = place.opening_hours?.weekday_text?.join('<br/>') || 'Hours not available';
      const isFree = place.types?.includes('health') ? 'May be free — contact to confirm' : 'Contact for pricing';

      const existing = document.getElementById('detailsModal');
      if (existing) existing.remove();

      const modal = document.createElement('div');
      modal.id = 'detailsModal';
      modal.style.cssText = `
        position: fixed; top: 0; left: 0; width: 100%; height: 100%;
        background: rgba(0,0,0,0.5); z-index: 1000;
        display: flex; align-items: center; justify-content: center;
      `;
      modal.innerHTML = `
        <div style="background: white; border-radius: 18px; padding: 32px; max-width: 480px; width: 90%; position: relative;">
          <button onclick="document.getElementById('detailsModal').remove()"
                  style="position:absolute; top:16px; right:16px; background:none; border:none; font-size:20px; cursor:pointer; color:#7a7a9a;">✕</button>
          <h2 style="font-family:'Playfair Display',serif; font-size:22px; margin-bottom:8px;">${place.name}</h2>
          <p style="font-size:13px; color:#7a7a9a; margin-bottom:16px;">${place.formatted_address || ''}</p>

          <div style="display:flex; gap:8px; margin-bottom:16px; flex-wrap:wrap;">
            <span style="background:#eee9ff; color:#5b3ec8; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700;">ON-CAMPUS</span>
            <span style="background:#dcfce7; color:#16a34a; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700;">${isFree}</span>
            ${place.rating ? `<span style="background:#fff3e0; color:#d97706; padding:4px 12px; border-radius:20px; font-size:12px; font-weight:700;">${place.rating} / 5</span>` : ''}
          </div>

          <p style="font-size:12px; font-weight:700; color:#7a7a9a; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px;">Opening Hours</p>
          <p style="font-size:13px; color:#4a4a6a; margin-bottom:16px; line-height:1.8;">${hours}</p>

          ${place.formatted_phone_number ? `
            <p style="font-size:12px; font-weight:700; color:#7a7a9a; text-transform:uppercase; letter-spacing:0.1em; margin-bottom:6px;">Phone</p>
            <a href="tel:${place.formatted_phone_number}" style="font-size:14px; color:#5b3ec8; font-weight:700; text-decoration:none;">${place.formatted_phone_number}</a>
          ` : ''}

          <div style="display:flex; gap:10px; margin-top:24px;">
            ${place.website ? `<a href="${place.website}" target="_blank" style="flex:1; background:#5b3ec8; color:white; border-radius:10px; padding:12px; text-align:center; font-weight:700; font-size:13px; text-decoration:none;">Visit Website</a>` : ''}
            ${place.formatted_phone_number ? `<a href="tel:${place.formatted_phone_number}" style="flex:1; background:#f5f5fa; color:#1a1a2e; border-radius:10px; padding:12px; text-align:center; font-weight:700; font-size:13px; text-decoration:none; border:1.5px solid #e8e8f0;">Call Now</a>` : ''}
          </div>
        </div>
      `;
      document.body.appendChild(modal);
      modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
    }
  );
}

// ─── Update service cards from API results ───
// ─── Haversine distance (km) between two coords ────────────
function haversineDistance(lat1, lng1, lat2, lng2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLng = (lng2 - lng1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function formatDistance(km) {
  if (km < 1) return `${Math.round(km * 1000)} m away`;
  return `${km.toFixed(1)} km away`;
}

function updateServiceCards(places) {
  const col = document.querySelector('.services-col');
  col.innerHTML = '<h2 class="services-title">Nearest Services</h2>';

  const centre = currentMap ? currentMap.getCenter() : null;
  const userLat = centre ? centre.lat() : null;
  const userLng = centre ? centre.lng() : null;

  if (!places || places.length === 0) {
    col.innerHTML += '<p style="color:var(--text-light); padding:20px;">No services found in this area.</p>';
  } else {
    places.slice(0, 5).forEach(place => {
      const isOpen     = place.opening_hours?.open_now;
      const badge      = isOpen ? 'OPEN NOW' : 'CLOSED';
      const badgeClass = isOpen ? 'open-badge' : 'closing-badge';
      const cardClass  = isOpen ? 'open' : 'closing';
      const lat = typeof place.geometry.location.lat === 'function'
        ? place.geometry.location.lat()
        : place.geometry.location.lat;
      const lng = typeof place.geometry.location.lng === 'function'
        ? place.geometry.location.lng()
        : place.geometry.location.lng;

      const distanceLabel = (userLat !== null && userLng !== null)
        ? formatDistance(haversineDistance(userLat, userLng, lat, lng))
        : 'Nearby';

      col.innerHTML += `
        <div class="service-card ${cardClass}" data-category="campus" data-lat="${lat}" data-lng="${lng}">
          <div class="service-card-top">
            <span class="service-status ${badgeClass}">${badge}</span>
            <span class="service-distance">${distanceLabel}</span>
          </div>
          <h3 class="service-name">${place.name}</h3>
          <p class="service-desc">${place.vicinity}</p>
          <div class="service-actions">
            <button class="view-details-btn" onclick="showDetails('${place.place_id}')">View Details</button>
            <button class="nav-icon-btn purple-btn" onclick="panToPlace(${lat}, ${lng})">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2">
                <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
                <circle cx="12" cy="10" r="3" />
              </svg>
            </button>
          </div>
        </div>
      `;
    });
  }

  // Always add Online Counselling SA at the bottom
  col.innerHTML += `
    <div class="service-card online-card" data-category="online">
      <div class="service-card-top">
        <span class="service-status online-badge">ONLINE ONLY</span>
        <span class="service-distance">Instant Access</span>
      </div>
      <h3 class="service-name">Online Counselling SA</h3>
      <p class="service-desc">24/7 Digital therapy sessions with registered psychologists via secure video.</p>
      <div class="service-actions">
        <button class="start-chat-btn" onclick="startChat()">Start Chat</button>
        <button class="nav-icon-btn grey-btn" onclick="startCall()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a7a9a" stroke-width="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.82-.82a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.6 16z"/>
          </svg>
        </button>
      </div>
    </div>
  `;
}

// ─── Drop pins on the map ────────────────────
function dropPins(places) {
  clearMarkers();
  if (!places || places.length === 0) return;

  places.forEach(place => {
    const marker = new google.maps.Marker({
      position: place.geometry.location,
      map: currentMap,
      title: place.name
    });

    const infoWindow = new google.maps.InfoWindow({
      content: `
        <div style="font-family:'DM Sans',sans-serif; max-width:200px;">
          <strong style="font-size:14px;">${place.name}</strong><br/>
          <span style="font-size:12px; color:#555;">${place.vicinity}</span><br/>
          <span style="font-size:12px; color:#5b3ec8; font-weight:600;">Rating: ${place.rating ? place.rating + " / 5" : "Not rated"}</span>
        </div>
      `
    });

    marker.addListener('click', () => infoWindow.open(currentMap, marker));
    currentMarkers.push(marker);
  });
}

// ─── Filter keyword/type config ──────────────────────
const filterConfig = {
  all:     { keyword: 'mental health clinic counselling wellness psychologist psychiatrist', type: null },
  online:  { keyword: 'online counselling therapy telehealth mental health',                type: null },
  campus:  { keyword: 'campus wellness student counselling university mental health clinic', type: null },
  student: { keyword: 'student mental health psychologist therapist counsellor clinic',     type: null }
};

// ─── Always fetch 5 closest health centres via Places API ───
function fetchNearbyHealth(lat, lng, filter = 'all') {
  // Online filter: no map results, just show the online card
  if (filter === 'online') {
    dropPins([]);
    const col = document.querySelector('.services-col');
    col.innerHTML = '<h2 class="services-title">Nearest Services</h2>';
    col.innerHTML += `
      <div class="service-card online-card" data-category="online">
        <div class="service-card-top">
          <span class="service-status online-badge">ONLINE ONLY</span>
          <span class="service-distance">Instant Access</span>
        </div>
        <h3 class="service-name">Online Counselling SA</h3>
        <p class="service-desc">24/7 Digital therapy sessions with registered psychologists via secure video.</p>
        <div class="service-actions">
          <button class="start-chat-btn" onclick="startChat()">Start Chat</button>
          <button class="nav-icon-btn grey-btn" onclick="startCall()">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#7a7a9a" stroke-width="2">
              <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.4 2 2 0 0 1 3.6 1.21h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.78a16 16 0 0 0 6 6l.82-.82a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.6 16z"/>
            </svg>
          </button>
        </div>
      </div>
    `;
    return;
  }

  const config = filterConfig[filter] || filterConfig.all;
  const service = new google.maps.places.PlacesService(currentMap);

  const request = {
    location: { lat, lng },
    rankBy: google.maps.places.RankBy.DISTANCE,
    keyword: config.keyword
  };
  if (config.type) request.type = config.type;

  service.nearbySearch(request, (results, status) => {
    if (status === google.maps.places.PlacesServiceStatus.OK && results?.length) {
      dropPins(results.slice(0, 5));
      updateServiceCards(results.slice(0, 5));
    } else {
      // Broader fallback
      service.nearbySearch(
        { location: { lat, lng }, rankBy: google.maps.places.RankBy.DISTANCE, keyword: 'health clinic doctor mental health' },
        (fallbackResults, fallbackStatus) => {
          if (fallbackStatus === google.maps.places.PlacesServiceStatus.OK && fallbackResults?.length) {
            dropPins(fallbackResults.slice(0, 5));
            updateServiceCards(fallbackResults.slice(0, 5));
          }
        }
      );
    }
  });
}

// ─── Fetch filter-specific results from backend ────────
async function fetchNearby(lat, lng, filter = 'all') {
  const type    = filterTypeMap[filter]    || 'doctor';
  const keyword = filterKeywordMap[filter] || 'therapist';

  try {
    const res = await fetch(`http://localhost:2000/api/location/nearby-therapists?lat=${lat}&lng=${lng}&type=${type}&keyword=${encodeURIComponent(keyword)}`);
    const data = await res.json();
    if (data.results && data.results.length > 0) {
      dropPins(data.results);
      updateServiceCards(data.results);
    } else {
      fetchNearbyHealth(lat, lng, filter);
    }
  } catch (err) {
    console.warn('Backend unavailable — falling back to Places API');
    fetchNearbyHealth(lat, lng, filter);
  }
}

// ─── Load (or reload) the map ─────────────────
function loadMap(location, filter = 'all') {
  currentMap = new google.maps.Map(document.querySelector('.map-canvas'), {
    center: location,
    zoom: 14,
    styles: [
      { featureType: 'poi', elementType: 'labels', stylers: [{ visibility: 'off' }] }
    ]
  });

  // Blue dot for user location
  new google.maps.Marker({
    position: location,
    map: currentMap,
    title: 'Your Location',
    icon: 'http://maps.google.com/mapfiles/ms/icons/blue-dot.png'
  });

  // Always show 5 closest health centres immediately via Places API (filter-aware)
  fetchNearbyHealth(location.lat, location.lng, filter);

  // Also run the filter-specific backend fetch (will override if it returns results)
  fetchNearby(location.lat, location.lng, filter);
}

// ─── Get active filter ────────────────────────
function getActiveFilter() {
  const active = document.querySelector('.filter-tab.active');
  return active ? active.dataset.filter : 'all';
}

// ─── initMap — called by Google Maps ─────────
function initMap() {
  const defaultLocation = { lat: -26.1852, lng: 28.0000 };

  if (navigator.geolocation) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setLocationDisplay(lat, lng);
        loadMap({ lat, lng }, getActiveFilter());
      },
      () => {
        console.warn('Location denied — using UJ default');
        setLocationDisplay(defaultLocation.lat, defaultLocation.lng);
        loadMap(defaultLocation, getActiveFilter());
      }
    );
  } else {
    setLocationDisplay(defaultLocation.lat, defaultLocation.lng);
    loadMap(defaultLocation, getActiveFilter());
  }
}

// ─── Filter tab clicks ────────────────────────
document.querySelectorAll('.filter-tab[data-filter]').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-tab').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    if (currentMap) {
      const center = currentMap.getCenter();
      fetchNearbyHealth(center.lat(), center.lng(), btn.dataset.filter);
      fetchNearby(center.lat(), center.lng(), btn.dataset.filter);
    }
  });
});

// ─── Change Location input ────────────────────
document.getElementById('changeLocationBtn').addEventListener('click', () => {
  const input = document.getElementById('locationInput');
  const newLocation = input.value.trim();
  if (!newLocation) return;

  const geocoder = new google.maps.Geocoder();
  geocoder.geocode({ address: newLocation }, (results, status) => {
    if (status === 'OK') {
      const lat = results[0].geometry.location.lat();
      const lng = results[0].geometry.location.lng();
      const formattedAddress = results[0].formatted_address;

      const locationText  = document.querySelector('.location-text');
      const locationValue = document.querySelector('.your-location-value');
      if (locationText)  locationText.textContent  = formattedAddress;
      if (locationValue) locationValue.textContent = formattedAddress;

      input.value = '';
      loadMap({ lat, lng }, getActiveFilter());
    } else {
      alert('Location not found. Try being more specific, e.g. "Braamfontein, Johannesburg"');
    }
  });
});

document.getElementById('locationInput').addEventListener('keydown', (e) => {
  if (e.key === 'Enter') document.getElementById('changeLocationBtn').click();
});