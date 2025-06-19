class BalloonTracker {
    constructor() {
        this.map = null;
        this.sightings = [];
        this.pendingLocation = null;
        this.markers = [];
        
        this.init();
    }
    
    init() {
        this.initMap();
        this.loadSightings();
        this.bindEvents();
        this.updateStats();
    }
    
    initMap() {
        this.map = L.map('map').setView([51.505, -0.09], 13);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap contributors'
        }).addTo(this.map);
        
        this.map.on('click', (e) => {
            this.showSightingForm(e.latlng);
        });
        
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                this.map.setView([lat, lng], 15);
            });
        }
    }
    
    bindEvents() {
        document.getElementById('cancelBtn').addEventListener('click', () => {
            this.hideSightingForm();
        });
        
        document.getElementById('overlay').addEventListener('click', () => {
            this.hideSightingForm();
        });
        
        document.getElementById('reportForm').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addSighting();
        });
    }
    
    showSightingForm(latlng) {
        this.pendingLocation = latlng;
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('sightingForm').style.display = 'block';
        document.getElementById('notesInput').focus();
    }
    
    hideSightingForm() {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('sightingForm').style.display = 'none';
        document.getElementById('reportForm').reset();
        this.pendingLocation = null;
    }
    
    async addSighting() {
        if (!this.pendingLocation) return;
        
        const imageInput = document.getElementById('imageInput');
        const notesInput = document.getElementById('notesInput');
        
        let imageData = null;
        if (imageInput.files[0]) {
            imageData = await this.fileToBase64(imageInput.files[0]);
        }
        
        const sighting = {
            id: Date.now(),
            lat: this.pendingLocation.lat,
            lng: this.pendingLocation.lng,
            notes: notesInput.value,
            image: imageData,
            timestamp: new Date().toISOString(),
            address: 'Loading...'
        };
        
        this.sightings.push(sighting);
        this.saveSightings();
        this.addMarker(sighting);
        this.updateStats();
        this.hideSightingForm();
        
        this.reverseGeocode(sighting);
    }
    
    fileToBase64(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onload = () => resolve(reader.result);
            reader.onerror = error => reject(error);
        });
    }
    
    async reverseGeocode(sighting) {
        try {
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${sighting.lat}&lon=${sighting.lng}`);
            const data = await response.json();
            sighting.address = data.display_name || 'Unknown location';
            this.saveSightings();
        } catch (error) {
            console.error('Geocoding failed:', error);
        }
    }
    
    addMarker(sighting) {
        const marker = L.marker([sighting.lat, sighting.lng])
            .addTo(this.map);
        
        const popupContent = this.createPopupContent(sighting);
        marker.bindPopup(popupContent);
        
        this.markers.push(marker);
    }
    
    createPopupContent(sighting) {
        const date = new Date(sighting.timestamp).toLocaleDateString();
        const time = new Date(sighting.timestamp).toLocaleTimeString();
        
        let content = `
            <div style="min-width: 200px;">
                <h4>Balloon Canister Sighting</h4>
                <p><strong>Date:</strong> ${date}</p>
                <p><strong>Time:</strong> ${time}</p>
                <p><strong>Location:</strong> ${sighting.address}</p>
        `;
        
        if (sighting.notes) {
            content += `<p><strong>Notes:</strong> ${sighting.notes}</p>`;
        }
        
        if (sighting.image) {
            content += `<img src="${sighting.image}" style="max-width: 200px; max-height: 200px; margin-top: 10px;" alt="Sighting photo">`;
        }
        
        content += `
                <button onclick="app.deleteSighting(${sighting.id})" style="margin-top: 10px; padding: 5px 10px; background: #e74c3c; color: white; border: none; border-radius: 3px; cursor: pointer;">
                    Delete
                </button>
            </div>
        `;
        
        return content;
    }
    
    deleteSighting(id) {
        this.sightings = this.sightings.filter(s => s.id !== id);
        this.saveSightings();
        this.refreshMarkers();
        this.updateStats();
    }
    
    refreshMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
        
        this.sightings.forEach(sighting => {
            this.addMarker(sighting);
        });
    }
    
    saveSightings() {
        localStorage.setItem('balloonSightings', JSON.stringify(this.sightings));
    }
    
    loadSightings() {
        const saved = localStorage.getItem('balloonSightings');
        if (saved) {
            this.sightings = JSON.parse(saved);
            this.sightings.forEach(sighting => {
                this.addMarker(sighting);
            });
        }
    }
    
    updateStats() {
        document.getElementById('sightingCount').textContent = this.sightings.length;
    }
}

const app = new BalloonTracker();