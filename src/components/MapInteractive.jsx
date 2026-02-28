import React, { useEffect, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, Circle, useMap } from 'react-leaflet';
import { LocateFixed } from 'lucide-react';
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

function LocateControl({ onUpdateLocation }) {
    const map = useMap();
    const [isLoading, setIsLoading] = useState(false);

    const handleLocate = () => {
        if (!navigator.geolocation) {
            alert("お使いのブラウザは位置情報取得に対応していません。");
            return;
        }
        setIsLoading(true);
        navigator.geolocation.getCurrentPosition(
            (pos) => {
                const { latitude, longitude } = pos.coords;
                const newLoc = [latitude, longitude];
                if (onUpdateLocation) onUpdateLocation(newLoc);
                map.flyTo(newLoc, 15, { animate: true, duration: 1 });
                setIsLoading(false);
            },
            (err) => {
                console.error(err);
                alert("現在地の取得に失敗しました。スマホの設定で位置情報が許可されているか確認してください。");
                setIsLoading(false);
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    };

    return (
        <div className="absolute bottom-20 md:bottom-10 right-4" style={{ zIndex: 1000 }}>
            <button
                onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleLocate();
                }}
                disabled={isLoading}
                className="w-14 h-14 bg-white rounded-full shadow-[0_3px_8px_rgba(0,0,0,0.24)] flex items-center justify-center hover:bg-gray-50 focus:outline-none transition-transform active:scale-95 text-gray-700"
                title="現在地へ移動"
            >
                <LocateFixed size={28} className={isLoading ? 'animate-pulse text-blue-500' : 'text-gray-700'} />
            </button>
        </div>
    );
}

export default function MapInteractive({ center = [35.681236, 139.767125], zoom = 13, missionArea, userLocation, onUpdateLocation, markers = [] }) {
    // 座標が不正（undefined, NaNなど）か判定するヘルパー
    const isValidCoordinate = (coord) => {
        return Array.isArray(coord) && coord.length === 2 &&
            typeof coord[0] === 'number' && !isNaN(coord[0]) &&
            typeof coord[1] === 'number' && !isNaN(coord[1]);
    };

    const safeCenter = isValidCoordinate(center) ? center : [35.681236, 139.767125];

    return (
        <div className="h-full w-full relative z-0">
            <MapContainer center={safeCenter} zoom={zoom} scrollWheelZoom={true} className="h-full w-full" style={{ minHeight: '300px' }}>
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />

                <MapUpdater center={safeCenter} zoom={zoom} />

                <LocateControl onUpdateLocation={onUpdateLocation} />

                {/* Mission Area (Circle) */}
                {missionArea && typeof missionArea.lat === 'number' && typeof missionArea.lng === 'number' && !isNaN(missionArea.lat) && !isNaN(missionArea.lng) && (
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
                {userLocation && isValidCoordinate(userLocation) && (
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
                {markers.map((marker, idx) => {
                    if (!marker.position || !isValidCoordinate(marker.position)) return null;

                    let customIcon = DefaultIcon;

                    if (marker.image) {
                        const html = `<div style="width: 48px; height: 48px; border-radius: 50%; border: 3px solid white; box-shadow: 0 4px 6px rgba(0,0,0,0.3); overflow: hidden; background-image: url('${marker.image}'); background-size: cover; background-position: center; pointer-events: none;"></div>`;
                        customIcon = L.divIcon({
                            html: html,
                            className: '', // Tailwind or Leaflet default classes will just wrap this
                            iconSize: [48, 48],
                            iconAnchor: [24, 24],
                            popupAnchor: [0, -24]
                        });
                    }

                    return (
                        <Marker key={idx} position={marker.position} icon={customIcon}>
                            <Popup>
                                <div className="text-center max-w-[200px]">
                                    {marker.image && (
                                        <img src={marker.image} alt="ユーザー報告写真" className="w-full h-auto rounded-lg mb-2 shadow-sm object-cover" />
                                    )}
                                    <p className="font-bold text-sm text-earth-800">{marker.popupText}</p>
                                </div>
                            </Popup>
                        </Marker>
                    );
                })}
            </MapContainer>
        </div>
    );
}
