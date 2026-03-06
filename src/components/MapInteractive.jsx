import React, { useEffect, useState } from 'react';
import { APIProvider, Map, AdvancedMarker, Pin, InfoWindow, useMap } from '@vis.gl/react-google-maps';
import { LocateFixed } from 'lucide-react';



// MapCircle : MapインスタンスにCircleを描画するためのコンポーネント
const MapCircle = ({ center, radius }) => {
    const map = useMap(); // contextからmapインスタンスを安全に取得

    useEffect(() => {
        if (!map || !window.google) return;

        const validRadius = typeof radius === 'number' && radius > 0 ? radius : 2000;

        const circle = new window.google.maps.Circle({
            strokeColor: '#FF0000',
            strokeOpacity: 0.8,
            strokeWeight: 2,
            fillColor: '#FF0000',
            fillOpacity: 0.2,
            map,
            center,
            radius: validRadius,
        });

        const infoWindow = new window.google.maps.InfoWindow({
            content: `
                <div style="text-align: center; font-family: sans-serif; padding: 4px;">
                    <p style="margin: 0 0 8px 0; font-weight: bold; font-size: 14px;">調査エリア (半径${validRadius}m)</p>
                    <a href="https://www.google.com/maps/search/?api=1&query=${center.lat},${center.lng}" 
                       target="_blank" rel="noopener noreferrer" 
                       style="color: #2563eb; text-decoration: underline; font-size: 12px;">
                       Google Mapsで開く
                    </a>
                </div>
            `
        });

        const clickListener = circle.addListener('click', (e) => {
            infoWindow.setPosition(e.latLng);
            infoWindow.open(map);
        });

        return () => {
            window.google.maps.event.removeListener(clickListener);
            circle.setMap(null);
        };
    }, [map, center, radius]);
    return null;
};


function LocateControl({ onUpdateLocation }) {
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

export default function MapInteractive({ googleMapsApiKey, center = [35.681236, 139.767125], zoom = 15, missionArea, userLocation, onUpdateLocation, markers = [] }) {
    const [mapInstance, setMapInstance] = useState(null);
    const [selectedMarker, setSelectedMarker] = useState(null);

    // 座標が不正（undefined, NaNなど）か判定するヘルパー
    const isValidCoordinate = (coord) => {
        return Array.isArray(coord) && coord.length === 2 &&
            typeof coord[0] === 'number' && !isNaN(coord[0]) &&
            typeof coord[1] === 'number' && !isNaN(coord[1]);
    };

    const safeCenter = isValidCoordinate(center)
        ? { lat: center[0], lng: center[1] }
        : { lat: 35.681236, lng: 139.767125 };

    // userLocationが更新されたときにマップを中心移動
    useEffect(() => {
        if (mapInstance && userLocation && isValidCoordinate(userLocation)) {
            mapInstance.panTo({ lat: userLocation[0], lng: userLocation[1] });
        }
    }, [userLocation, mapInstance]);

    if (!googleMapsApiKey) {
        return (
            <div className="h-full w-full flex items-center justify-center bg-gray-100 text-gray-500 p-8 text-center">
                <p>Google Maps APIキーが設定されていません。<br />設定画面からAPIキーを入力してください。</p>
            </div>
        );
    }

    return (
        <div className="h-full w-full relative z-0">
            <APIProvider apiKey={googleMapsApiKey}>
                <Map
                    defaultCenter={safeCenter}
                    defaultZoom={zoom}
                    mapId="michi-quest-map"
                    className="h-full w-full"
                    gestureHandling={'greedy'}
                    disableDefaultUI={true}
                    onMapLoad={(map) => setMapInstance(map)}
                >
                    {/* Mission Area (Circle) */}
                    {missionArea && typeof missionArea.lat === 'number' && typeof missionArea.lng === 'number' && !isNaN(missionArea.lat) && !isNaN(missionArea.lng) && (
                        <MapCircle
                            center={{ lat: missionArea.lat, lng: missionArea.lng }}
                            radius={missionArea.r}
                        />
                    )}

                    {/* User Location */}
                    {userLocation && isValidCoordinate(userLocation) && (
                        <AdvancedMarker position={{ lat: userLocation[0], lng: userLocation[1] }} title="現在地">
                            <Pin background={'#3b82f6'} borderColor={'#1d4ed8'} glyphColor={'#fff'} />
                        </AdvancedMarker>
                    )}

                    {/* Other Markers */}
                    {markers.map((marker, idx) => {
                        if (!marker.position || !isValidCoordinate(marker.position)) return null;

                        return (
                            <AdvancedMarker
                                key={idx}
                                position={{ lat: marker.position[0], lng: marker.position[1] }}
                                title={marker.popupText}
                                onClick={() => setSelectedMarker(marker)}
                            >
                                {marker.image ? (
                                    <div className="w-12 h-12 rounded-full border-[3px] border-white shadow-[0_4px_6px_rgba(0,0,0,0.3)] overflow-hidden bg-white -mt-6">
                                        <img src={marker.image} alt="ユーザー報告写真" className="w-full h-full object-cover" />
                                    </div>
                                ) : (
                                    <Pin background={'#ef4444'} borderColor={'#b91c1c'} />
                                )}
                            </AdvancedMarker>
                        );
                    })}

                    {/* Selected Marker InfoWindow */}
                    {selectedMarker && selectedMarker.position && (
                        <InfoWindow
                            position={{ lat: selectedMarker.position[0], lng: selectedMarker.position[1] }}
                            onCloseClick={() => setSelectedMarker(null)}
                        >
                            <div className="text-center p-2 min-w-[150px]">
                                <p className="font-bold text-sm mb-2 text-earth-800">{selectedMarker.popupText}</p>
                                {selectedMarker.image ? (
                                    <img src={selectedMarker.image} alt="報告写真" className="w-[120px] h-[120px] object-cover rounded-lg mx-auto border border-gray-200" />
                                ) : (
                                    <p className="text-xs text-earth-600">写真なし</p>
                                )}
                            </div>
                        </InfoWindow>
                    )}
                </Map>
            </APIProvider>

            <LocateControl onUpdateLocation={onUpdateLocation} />
        </div>
    );
}
