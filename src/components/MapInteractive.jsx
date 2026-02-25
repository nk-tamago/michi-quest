import React, { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet default icon fix
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Component to update map center when props change
function MapUpdater({ center, zoom }) {
    const map = useMap();
    useEffect(() => {
        if (center) {
            map.setView(center, zoom);
        }
    }, [center, zoom, map]);
    return null;
}

export default function MapInteractive({ center = [35.681236, 139.767125], zoom = 13, missionArea, userLocation, markers = [] }) {
    return (
        <div className="h-full w-full relative z-0">
            <MapContainer center={center} zoom={zoom} scrollWheelZoom={true} className="h-full w-full" style={{ minHeight: '300px' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater center={center} zoom={zoom} />

                {/* Mission Area (Circle) */}
                {missionArea && (
                    <Circle
                        center={[missionArea.lat, missionArea.lng]}
                        radius={missionArea.r}
                        pathOptions={{ color: 'red', fillColor: 'red', fillOpacity: 0.2 }}
                    >
                        <Popup>
                            <div className="text-center">
                                <p className="font-bold mb-1">ミッションエリア (半径{missionArea.r}m)</p>
                                <a
                                    href={`https://www.google.com/maps/search/?api=1&query=${missionArea.lat},${missionArea.lng}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 underline text-sm"
                                >
                                    Google Mapsで開く
                                </a>
                            </div>
                        </Popup>
                    </Circle>
                )}

                {/* User Location */}
                {userLocation && (
                    <Marker position={userLocation} icon={new L.Icon({
                        iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
                        shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/0.7.7/images/marker-shadow.png',
                        iconSize: [25, 41],
                        iconAnchor: [12, 41],
                        popupAnchor: [1, -34],
                        shadowSize: [41, 41]
                    })}>
                        <Popup>現在地</Popup>
                    </Marker>
                )}

                {/* Other Markers */}
                {markers.map((marker, idx) => (
                    <Marker key={idx} position={marker.position}>
                        <Popup>{marker.popupText}</Popup>
                    </Marker>
                ))}
            </MapContainer>
        </div>
    );
}
