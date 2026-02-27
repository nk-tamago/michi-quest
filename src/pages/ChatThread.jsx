import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from '../components/ChatBubble';
import Button from '../components/Button';
import { Camera, Send, Loader2, Map as MapIcon, RefreshCcw, Award } from 'lucide-react';
import { generateMission, evaluateReport, verifyLocationExists, chatWithOperator } from '../utils/api';
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
    basePrompt,
    prompt1,
    prompt2,
    prompt3,
    destinationList,
    chatHistory,
    setChatHistory,
    currentMission,
    setCurrentMission,
    onScoreAdded,
    onTitleAdded
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
        const savedInput = inputText;
        setInputText('');

        try {
            // ハルシネーション対策: 目的地リストがあればプロンプトに結合する
            let finalPrompt = basePrompt + "\n\n" + prompt1;
            const validDestinations = (destinationList || '').trim();
            if (validDestinations) {
                finalPrompt += `\n\n【重要】ミッションの目的地は、必ず以下のリストの中から実在するものを1つだけ選んでください。\n${validDestinations}`;
            }

            let missionText = '';
            let currentHistory = chatHistory;
            const maxRetries = 3;
            let isValid = false;

            for (let i = 0; i < maxRetries; i++) {
                // Rate limit (HTTP 429) エラー回避のため、2回目以降は少し待つ
                if (i > 0) {
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }

                // 生成。文脈にはエラー状況を含めず、常にフラットな「ミッションちょうだい」要求としてリトライ
                missionText = await generateMission(apiKey, aiModel, finalPrompt, currentHistory, currentInput);

                // AREAタグからnameを抽出
                const areaMatch = missionText.match(/\[AREA:\s*({[\s\S]*?})\]/);
                if (areaMatch) {
                    try {
                        const areaData = JSON.parse(areaMatch[1]);
                        if (areaData.name) {
                            // 実在チェック
                            const exists = await verifyLocationExists(areaData.name);
                            if (exists) {
                                isValid = true;
                                break;
                            } else {
                                console.log(`Retry ${i + 1}: Location ${areaData.name} not found.`);
                                // 文脈（currentHistory）は汚さずに、そのまま次のループで再生成する
                            }
                        } else {
                            isValid = true;
                            break;
                        }
                    } catch {
                        isValid = true;
                        break;
                    }
                } else {
                    isValid = true;
                    break;
                }
            }

            if (!isValid) {
                console.warn("Max retries reached. Using the last generated mission.");
                // リトライ上限に達した場合でも、取得できた最後のミッションは採用する
            }

            const aiMsg = { id: Date.now() + 1, role: 'ai', type: 'text', text: missionText };
            setChatHistory(prev => [...prev, aiMsg]);
            setCurrentMission(missionText); // Store the active mission
        } catch (err) {
            setError(err.message || "通信エラーが発生しました");
            // Remove the user message if it failed
            setChatHistory(prev => prev.filter(msg => msg.id !== userMsg.id));
            setInputText(savedInput);
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        try {
            setIsProcessingImage(true);
            // Exif情報をリサイズ前のオリジナルファイルから取得する
            const location = await getGPSFromImage(file);
            console.log("Extracted Location from original image:", location);
            setImageLocation(location);

            // 画像を送信・解析可能なサイズ(長辺最大1024px)にリサイズして圧縮
            const resizedBase64 = await resizeImage(file, 1024);

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
        const savedInputText = inputText;
        const savedImagePreview = imagePreview;
        const savedImageBase64 = imageBase64;
        const savedImageLocation = imageLocation;

        setChatHistory(prev => [...prev, userMsg]);

        setInputText('');
        handleClearImage();

        try {
            // パラメータ: apiKey, aiModel, systemInstruction, missionText, imageBase64, chatHistory, newText
            const finalPrompt = basePrompt + "\n\n" + prompt2;
            const resultText = await evaluateReport(apiKey, aiModel, finalPrompt, currentMission || "ミッション不明", imageBase64, chatHistory, currentInput);

            // SCOREタグのパース
            let displayMsg = resultText;
            let earnedScore = null;
            let earnedTitle = null;

            const scoreMatch = resultText.match(/\[SCORE:\s*(\d+)\]/i);
            if (scoreMatch) {
                const score = parseInt(scoreMatch[1], 10);
                if (!isNaN(score) && onScoreAdded) {
                    onScoreAdded(score);
                    earnedScore = score;
                }
                // 表示用テキストからはSCOREタグを削除
                displayMsg = displayMsg.replace(/\[SCORE:\s*\d+\]/ig, '').trim();
            }

            // TITLEタグのパース
            const titleMatch = resultText.match(/\[TITLE:\s*(.*?)\]/i);
            if (titleMatch) {
                const newTitle = titleMatch[1].trim();
                // 0点時の "なし" などを弾く
                if (newTitle && newTitle !== 'なし' && newTitle !== '無し' && newTitle !== 'None' && onTitleAdded) {
                    onTitleAdded({
                        title: newTitle,
                        date: new Date().toISOString(),
                        mission: currentMission
                    });
                    earnedTitle = newTitle;
                }
                // 表示用テキストからはTITLEタグを削除
                displayMsg = displayMsg.replace(/\[TITLE:\s*.*?\]/ig, '').trim();
            }

            // ANNOUNCEタグのパース
            let announceMsg = null;
            const announceMatch = resultText.match(/\[ANNOUNCE:\s*(.*?)\]/i);
            if (announceMatch) {
                announceMsg = announceMatch[1].trim();
                // 表示用テキストからはANNOUNCEタグを削除
                displayMsg = displayMsg.replace(/\[ANNOUNCE:\s*.*?\]/ig, '').trim();
            }

            const aiMsg = { id: Date.now() + 1, role: 'ai', type: 'text', text: displayMsg };

            // スコア・称号の発表メッセージをAIの会話として生成
            const newMessages = [aiMsg];
            if (announceMsg) {
                newMessages.push({ id: Date.now() + 2, role: 'ai', type: 'text', text: announceMsg });
            } else if (earnedScore !== null || earnedTitle !== null) {
                // Fallback (AI会話トーンにあわせた最低限の報告)
                let sysText = "";
                if (earnedScore !== null) sysText += `今回のスコアは ${earnedScore}pt だ！`;
                if (earnedTitle !== null) sysText += ` 新たな称号「${earnedTitle}」を授ける！`;
                if (sysText) newMessages.push({ id: Date.now() + 2, role: 'ai', type: 'text', text: sysText.trim() });
            }

            setChatHistory(prev => [...prev, ...newMessages]);
            // Depending on outcome, we might clear currentMission here
        } catch (err) {
            setError(err.message || "予期せぬエラーが発生しました");
            // Remove user msg on fail
            setChatHistory(prev => prev.filter(msg => msg.id !== userMsg.id));
            setInputText(savedInputText);
            setImagePreview(savedImagePreview);
            setImageBase64(savedImageBase64);
            setImageLocation(savedImageLocation);
        } finally {
            setLoading(false);
        }
    };

    const handleOperatorChat = async () => {
        if (!apiKey) return;
        setLoading(true);
        setError('');

        const currentInput = inputText || '進捗どう？';
        const userMsg = { id: Date.now(), role: 'user', type: 'text', text: currentInput };
        const savedInput = inputText;
        setChatHistory(prev => [...prev, userMsg]);
        setInputText('');

        try {
            const finalPrompt = basePrompt + "\n\n" + prompt3;
            const replyText = await chatWithOperator(apiKey, aiModel, finalPrompt, chatHistory, currentInput);

            const aiMsg = { id: Date.now() + 1, role: 'ai', type: 'text', text: replyText };
            setChatHistory(prev => [...prev, aiMsg]);
        } catch (err) {
            setError(err.message || "通信エラーが発生しました");
            setChatHistory(prev => prev.filter(msg => msg.id !== userMsg.id));
            setInputText(savedInput);
        } finally {
            setLoading(false);
        }
    };

    const handleSend = () => {
        if (loading || isProcessingImage) return;
        if (imageBase64) {
            handleReportMission();
        } else if (inputText.trim()) {
            if (currentMission) {
                handleOperatorChat();
            } else {
                handleRequestMission();
            }
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
                            {msg.role === 'system' ? (
                                <div className="flex justify-center my-4">
                                    <div className="bg-earth-200 text-earth-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 border border-earth-300">
                                        <Award size={18} className="text-yellow-600" />
                                        {msg.text}
                                    </div>
                                </div>
                            ) : (
                                <>
                                    {msg.type === 'image' && (
                                        <div className={`flex w-full mb-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                            <div className="max-w-xs md:max-w-md rounded-xl overflow-hidden shadow-sm border border-earth-300 bg-earth-200">
                                                {msg.image ? (
                                                    <img src={msg.image} alt="ユーザー報告写真" className="w-full object-cover" width={400} height={300} />
                                                ) : (
                                                    <div className="px-6 py-4 flex flex-col items-center justify-center text-earth-600">
                                                        <Camera size={32} className="mb-2 opacity-50" />
                                                        <span className="text-sm font-bold opacity-75">送信済み写真</span>
                                                        <span className="text-xs opacity-50">（容量節約のため非表示）</span>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                    <ChatBubble
                                        message={msg.text}
                                        avatarUrl={msg.role === 'ai' ? avatarData : null}
                                        avatarAngry={msg.role === 'ai' ? avatarAngry : null}
                                        avatarJoy={msg.role === 'ai' ? avatarJoy : null}
                                        avatarDisgust={msg.role === 'ai' ? avatarDisgust : null}
                                        isUser={msg.role === 'user'}
                                    />
                                </>
                            )}
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
