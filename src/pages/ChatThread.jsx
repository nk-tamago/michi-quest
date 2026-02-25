import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from '../components/ChatBubble';
import Button from '../components/Button';
import { Camera, Send, Loader2, Map as MapIcon, RefreshCcw } from 'lucide-react';
import { generateMission, evaluateReport } from '../utils/api';
import { resizeImage } from '../utils/imageUtils';
import { getGPSFromImage } from '../utils/exifUtils';
import { APP_CONFIG } from '../config';

export default function ChatThread({
    apiKey,
    aiModel,
    avatarData,
    avatarAngry,
    avatarJoy,
    avatarDisgust,
    prompt1,
    prompt2,
    chatHistory,
    setChatHistory,
    currentMission,
    setCurrentMission
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [imageLocation, setImageLocation] = useState(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const fileInputRef = useRef(null);
    const chatEndRef = useRef(null);

    // Auto-scroll to bottom when chat updates
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [chatHistory, loading]);

    const handleRequestMission = async () => {
        if (!apiKey) return;
        setLoading(true);
        setError('');

        const currentInput = inputText || '今日のミッションちょうだい！';
        const userMsg = { id: Date.now(), role: 'user', type: 'text', text: currentInput };
        setChatHistory(prev => [...prev, userMsg]);
        setInputText('');

        try {
            // パラメータ: apiKey, aiModel, systemInstruction, chatHistory, newText
            const missionText = await generateMission(apiKey, aiModel, prompt1, chatHistory, currentInput);

            const aiMsg = { id: Date.now() + 1, role: 'ai', type: 'text', text: missionText };
            setChatHistory(prev => [...prev, aiMsg]);
            setCurrentMission(missionText); // Store the active mission
        } catch (err) {
            setError(err.message || "通信エラーが発生しました");
            // Remove the user message if it failed
            setChatHistory(prev => prev.filter(msg => msg.id !== userMsg.id));
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsProcessingImage(true);
            // 画像を送信・解析可能なサイズ(長辺最大1024px)にリサイズして圧縮
            const resizedBase64 = await resizeImage(file, 1024);

            // Exifから位置情報を取得
            const location = await getGPSFromImage(file);
            setImageLocation(location);

            setImagePreview(resizedBase64);
            setImageBase64(resizedBase64);
        } catch (err) {
            setError("画像の処理に失敗しました");
            console.error(err);
        } finally {
            setIsProcessingImage(false);
        }
    };

    const handleClearImage = () => {
        setImagePreview(null);
        setImageBase64(null);
        setImageLocation(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
    };

    const handleReportMission = async () => {
        if (!apiKey || !imageBase64) return;
        setLoading(true);
        setError('');

        const currentInput = inputText || 'ミッション完了！写真を見て！';
        const userMsg = {
            id: Date.now(),
            role: 'user',
            type: 'image',
            text: currentInput,
            image: imageBase64,
            location: imageLocation
        };
        setChatHistory(prev => [...prev, userMsg]);

        setInputText('');
        handleClearImage();

        try {
            // パラメータ: apiKey, aiModel, systemInstruction, missionText, imageBase64, chatHistory, newText
            const resultText = await evaluateReport(apiKey, aiModel, prompt2, currentMission || "ミッション不明", imageBase64, chatHistory, currentInput);

            const aiMsg = { id: Date.now() + 1, role: 'ai', type: 'text', text: resultText };
            setChatHistory(prev => [...prev, aiMsg]);
            // Depending on outcome, we might clear currentMission here
        } catch (err) {
            setError(err.message || "予期せぬエラーが発生しました");
            // Remove user msg on fail
            setChatHistory(prev => prev.filter(msg => msg.id !== userMsg.id));
        } finally {
            setLoading(false);
        }
    };

    const handleSend = () => {
        if (loading || isProcessingImage) return;
        if (imageBase64) {
            handleReportMission();
        } else if (inputText.trim()) {
            handleRequestMission();
        } else if (!currentMission) {
            handleRequestMission();
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
            handleSend();
        }
    };

    return (
        <div className="flex flex-col h-full relative">
            {/* Chat Timeline Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                {chatHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-earth-500 opacity-50">
                        <MapIcon size={64} className="mb-4" />
                        <p>まだ会話がありません。</p>
                        <p>下のボタンからミッションを要求してみましょう。</p>
                    </div>
                ) : (
                    chatHistory.map((msg) => (
                        <div key={msg.id} className="w-full">
                            {msg.type === 'image' && msg.image ? (
                                <div className={`flex w-full mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className="max-w-xs md:max-w-md rounded-xl overflow-hidden shadow-sm border border-earth-300">
                                        <img src={msg.image} alt="ユーザー報告写真" className="w-full object-cover" width={400} height={300} />
                                    </div>
                                </div>
                            ) : null}
                            <ChatBubble
                                message={msg.text}
                                avatarUrl={msg.role === 'ai' ? avatarData : null}
                                avatarAngry={msg.role === 'ai' ? avatarAngry : null}
                                avatarJoy={msg.role === 'ai' ? avatarJoy : null}
                                avatarDisgust={msg.role === 'ai' ? avatarDisgust : null}
                                isUser={msg.role === 'user'}
                            />
                        </div>
                    ))
                )}

                {loading ? (
                    <div className="flex w-full mt-4 space-x-3 max-w-xl mx-auto p-2 justify-start">
                        <div className="flex-shrink-0">
                            <img className="h-12 w-12 rounded-full border-2 border-earth-300 object-cover bg-earth-200" src={avatarData || './pwa-192x192.png'} alt="AI Avatar" width={48} height={48} />
                        </div>
                        <div className="relative px-5 py-4 text-base shadow-sm bg-white text-earth-900 rounded-2xl rounded-tl-none border border-earth-200 flex items-center gap-2">
                            <Loader2 className="animate-spin text-earth-500" size={20} />
                            <span className="text-earth-500 animate-pulse">入力中...</span>
                        </div>
                    </div>
                ) : null}
                {error ? (
                    <div className="w-full max-w-xl mx-auto p-4 bg-red-100 text-red-700 rounded-xl border border-red-200 text-sm mt-4">
                        {error}
                    </div>
                ) : null}
                <div ref={chatEndRef} />
            </div>

            {/* Input Area (Bottom Sticky) */}
            <div className="absolute bottom-0 left-0 right-0 bg-earth-100 border-t border-earth-300 p-2 sm:p-4 shadow-lg">
                <div className="max-w-3xl mx-auto">
                    {imagePreview ? (
                        <div className="relative inline-block mb-3">
                            <img src={imagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg border-2 border-earth-400 shadow-sm" />
                            <button
                                onClick={handleClearImage}
                                className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md hover:bg-red-600 transition-colors"
                                aria-label="画像をクリア"
                            >
                                <RefreshCcw size={14} />
                            </button>
                        </div>
                    ) : null}

                    <div className="flex gap-2">
                        {/* Hidden File Input */}
                        <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            ref={fileInputRef}
                            onChange={handleImageUpload}
                            className="hidden"
                        />

                        {/* Upload Button */}
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            disabled={loading || isProcessingImage}
                            className="p-3 md:p-4 bg-earth-200 text-earth-700 rounded-xl border-2 border-earth-300 hover:bg-earth-300 transition-colors disabled:opacity-50"
                            title="写真を添付"
                            aria-label="写真を添付"
                        >
                            {isProcessingImage ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
                        </button>

                        {/* Text Input */}
                        <textarea
                            value={inputText}
                            onChange={(e) => setInputText(e.target.value)}
                            onKeyDown={handleKeyDown}
                            disabled={loading || isProcessingImage}
                            placeholder={!currentMission ? "ミッションを要求する..." : "何かメッセージを送る (Ctrl+Enterで送信)"}
                            className="flex-1 px-4 py-3 bg-white border border-earth-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-earth-800 resize-none overflow-hidden min-h-[50px] max-h-[120px]"
                            rows="1"
                        />

                        {/* Send Button */}
                        <button
                            onClick={handleSend}
                            disabled={loading || isProcessingImage || (!inputText.trim() && !imageBase64 && currentMission)}
                            className="p-3 md:p-4 bg-earth-800 text-earth-100 rounded-xl hover:bg-earth-900 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                            aria-label="送信"
                        >
                            {loading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
