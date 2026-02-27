import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import Button from './Button';
import { getCroppedImg } from '../utils/imageUtils';

export default function ImageCropper({ imageSrc, onCropComplete, onCancel }) {
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropCompleteEvent = useCallback((croppedArea, croppedAreaPixels) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels || !imageSrc) return;
        try {
            setIsProcessing(true);
            const croppedBase64 = await getCroppedImg(imageSrc, croppedAreaPixels, 256);
            onCropComplete(croppedBase64);
        } catch (e) {
            console.error("クロップ失敗:", e);
            alert("切り取り処理に失敗しました。");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex flex-col bg-black/90 text-white pb-safe pt-safe sm:pt-0 sm:pb-0 animate-in fade-in duration-200">
            {/* 上部ヘッダー（操作ボタン） */}
            <div className="flex justify-between items-center p-4 bg-black/50 absolute top-0 left-0 right-0 z-10 safe-top">
                <button
                    onClick={onCancel}
                    disabled={isProcessing}
                    className="px-4 py-2 text-earth-300 font-bold hover:text-white disabled:opacity-50"
                >
                    キャンセル
                </button>
                <div className="text-sm font-bold opacity-70">トリミング位置を調整</div>
                <button
                    onClick={handleConfirm}
                    disabled={isProcessing}
                    className="px-4 py-2 bg-earth-600 text-white rounded-lg font-bold hover:bg-earth-500 disabled:opacity-50 shadow-md"
                >
                    {isProcessing ? "処理中..." : "決定"}
                </button>
            </div>

            {/* クロップ領域 */}
            <div className="relative flex-1 w-full bg-black">
                <Cropper
                    image={imageSrc}
                    crop={crop}
                    zoom={zoom}
                    aspect={1}
                    cropShape="round"
                    showGrid={false}
                    onCropChange={setCrop}
                    onCropComplete={onCropCompleteEvent}
                    onZoomChange={setZoom}
                    classes={{ containerClassName: 'h-full w-full' }}
                />
            </div>

            {/* 下部ズームスライダー */}
            <div className="p-6 bg-black/80 flex flex-col items-center gap-4 absolute bottom-0 left-0 right-0 z-10 safe-bottom">

                <div className="flex items-center w-full max-w-sm gap-4 text-earth-300">
                    <span className="text-xl">⊖</span>
                    <input
                        type="range"
                        value={zoom}
                        min={1}
                        max={3}
                        step={0.1}
                        aria-labelledby="Zoom"
                        onChange={(e) => setZoom(e.target.value)}
                        className="flex-1 accent-earth-500"
                    />
                    <span className="text-xl">⊕</span>
                </div>
                <div className="text-xs text-earth-400">画像のスワイプで位置の移動、ピンチイン/アウトでズームも可能です</div>
            </div>
        </div>
    );
}
