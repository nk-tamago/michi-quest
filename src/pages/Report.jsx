import React, { useState, useRef } from 'react';
import ChatBubble from '../components/ChatBubble';
import Button from '../components/Button';
import { evaluateReport } from '../utils/api';
import { Camera, Send, Loader2, RefreshCcw } from 'lucide-react';

export default function Report({ apiKey, aiModel, avatarData, prompt2, currentMission }) {
    const [image, setImage] = useState(null);
    const [result, setResult] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        // reset previous results when new image is picked
        setResult('');
        setError('');

        const reader = new FileReader();
        reader.onload = (event) => {
            setImage(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleReport = async () => {
        if (!apiKey) {
            setError("APIキーが設定されていません。設定画面を確認してください。");
            return;
        }
        if (!currentMission) {
            setError("ミッションがありません。先にミッションを受注してください。");
            return;
        }
        if (!image) {
            setError("送信する写真を選択してください。");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const resultText = await evaluateReport(apiKey, aiModel, prompt2, currentMission, image);
            setResult(resultText);
        } catch (err) {
            setError(err.message || "予期せぬエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    const cancelImage = () => {
        setImage(null);
        setResult('');
        if (fileInputRef.current) {
            fileInputRef.current.value = "";
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col pb-20">

            {!currentMission ? (
                <div className="text-center bg-white p-6 md:p-10 rounded-2xl shadow-sm border border-earth-200 mt-8">
                    <p className="text-earth-900 mb-2 font-bold">まだミッションを受注していません</p>
                    <p className="text-sm text-earth-800/80">「ミッション」タブから今日のミッションを取得してください。</p>
                </div>
            ) : (
                <>
                    <div className="mb-6 opacity-80">
                        <h3 className="text-xs font-bold text-earth-800 uppercase tracking-wider mb-2">現在のミッション</h3>
                        <div className="bg-earth-200/50 p-3 rounded-lg text-sm text-earth-900 border-l-4 border-earth-800">
                            {currentMission}
                        </div>
                    </div>

                    {/* 画像アップロード UI */}
                    {!image ? (
                        <div
                            onClick={() => fileInputRef.current?.click()}
                            className="w-full aspect-[4/3] md:aspect-video bg-earth-200/40 rounded-2xl border-4 border-dashed border-earth-300 flex flex-col items-center justify-center cursor-pointer hover:bg-earth-200 transition-colors"
                        >
                            <Camera size={48} className="text-earth-800 mb-4 opacity-70" />
                            <p className="font-bold text-earth-900">タップして写真を撮影・選択</p>
                            <p className="text-sm text-earth-800/70 mt-1">※カメラが起動します</p>
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={fileInputRef}
                                onChange={handleImageUpload}
                                className="hidden"
                            />
                        </div>
                    ) : (
                        <div className="w-full relative rounded-2xl overflow-hidden shadow-md animate-fade-in">
                            <img src={image} alt="Preview" className="w-full h-auto max-h-[50vh] object-contain bg-black" />
                            <button
                                onClick={cancelImage}
                                disabled={loading}
                                className="absolute top-2 right-2 bg-earth-900/80 text-white p-2 text-xs rounded-full shadow hover:bg-red-800 transition backdrop-blur-sm"
                            >
                                撮り直す
                            </button>
                        </div>
                    )}

                    {error && <p className="text-red-600 mt-4 text-sm font-bold bg-red-100 p-3 rounded-lg">{error}</p>}

                    {/* 送信ボタン */}
                    {image && !result && (
                        <div className="mt-8 text-center animate-fade-in-up">
                            <Button
                                onClick={handleReport}
                                disabled={loading}
                                className="w-full max-w-sm py-4 text-lg rounded-2xl shadow-xl mx-auto"
                            >
                                {loading ? (
                                    <><Loader2 className="animate-spin" /> 写真を判定中...</>
                                ) : (
                                    <><Send /> AIに報告する</>
                                )}
                            </Button>
                        </div>
                    )}

                    {/* 判定結果 */}
                    {result && (
                        <div className="mt-8 animate-fade-in-up">
                            <h3 className="text-xs font-bold text-earth-800 uppercase tracking-wider mb-2 text-center">AIの判定結果</h3>
                            <ChatBubble
                                message={result}
                                avatarUrl={avatarData}
                                isUser={false}
                            />
                            <div className="text-center mt-6">
                                <Button variant="secondary" onClick={() => { setImage(null); setResult(''); }}>
                                    <RefreshCcw size={16} /> 次の写真で再挑戦
                                </Button>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
