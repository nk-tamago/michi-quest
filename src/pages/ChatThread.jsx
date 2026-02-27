import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from '../components/ChatBubble';
import Button from '../components/Button';
import { Camera, Send, Loader2, Map as MapIcon, RefreshCcw, Award, Play, Pause, ChevronLeft, ChevronRight, X } from 'lucide-react';
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
    onTitleAdded,
    onMissionCleared,
    isSessionCleared,
    isReplayMode = false,
    onExitReplay
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

    // リプレイ用ステート
    const [replayIndex, setReplayIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);

    // クリア演出用ステート
    const [showClearAnimation, setShowClearAnimation] = useState(false);
    const [clearedTitle, setClearedTitle] = useState(null);

    // モード切り替え時にリプレイを初期化
    useEffect(() => {
        if (isReplayMode) {
            setReplayIndex(0);
            setIsPlaying(false);
            setShowClearAnimation(false);
        }
    }, [isReplayMode, currentMission]);

    // リプレイ終了時のクリア演出
    useEffect(() => {
        if (isReplayMode && isSessionCleared && chatHistory.length > 0 && replayIndex === chatHistory.length - 1) {
            setShowClearAnimation(true);
            setTimeout(() => setShowClearAnimation(false), 5000);
        } else if (isReplayMode) {
            setShowClearAnimation(false);
        }
    }, [isReplayMode, isSessionCleared, replayIndex, chatHistory.length]);

    // 表示用の履歴配列（リプレイモード時はスライスする）
    const displayedHistory = isReplayMode ? chatHistory.slice(0, replayIndex + 1) : chatHistory;

    // 自動再生タイマー
    useEffect(() => {
        let timer;
        if (isReplayMode && isPlaying && replayIndex < chatHistory.length - 1) {
            timer = setTimeout(() => {
                setReplayIndex(prev => prev + 1);
            }, 2500); // 2.5秒間隔
        } else if (replayIndex >= chatHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearTimeout(timer);
    }, [isReplayMode, isPlaying, replayIndex, chatHistory.length]);

    // キーボード操作（← → Space）
    useEffect(() => {
        if (!isReplayMode) return;
        const handleReplayKey = (e) => {
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowRight') {
                setReplayIndex(prev => Math.min(prev + 1, chatHistory.length - 1));
            } else if (e.key === 'ArrowLeft') {
                setReplayIndex(prev => Math.max(prev - 0, 0) - 1);
            } else if (e.key === ' ') {
                e.preventDefault();
                setIsPlaying(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleReplayKey);
        return () => window.removeEventListener('keydown', handleReplayKey);
    }, [isReplayMode, chatHistory.length]);

    // Auto-scroll to bottom when chat updates or replay advances
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayedHistory.length, loading, isReplayMode]);

    const handleRequestMission = async (isAuto = false) => {
        if (!apiKey) return;
        setLoading(true);
        setError('');

        const currentInput = inputText || '新規ミッションを教えてください';

        // 自動送信時はユーザーの発言（「新規ミッションを教えてください」等）を履歴に追加しない
        if (!isAuto) {
            const userMsg = { id: Date.now(), role: 'user', type: 'text', text: currentInput };
            setChatHistory(prev => [...prev, userMsg]);
        }

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
            if (!isAuto) {
                // Remove the user message if it failed
                setChatHistory(prev => prev.filter(msg => msg.id !== (Date.now() - 1))); // 正確なIDは取れないがエラー時は一旦戻す等の措置（今回は雑に最後を消すかそのままにする）
            }
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

            // クリア判定と演出のトリガー
            if (earnedScore !== null && earnedScore > 0) {
                if (onMissionCleared) onMissionCleared();
                if (!isReplayMode) {
                    setClearedTitle(earnedTitle);
                    setShowClearAnimation(true);
                    setTimeout(() => setShowClearAnimation(false), 5000); // 5秒後に消す
                }
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

    useEffect(() => {
        // 新規作成されたセッションが開かれた時の自動送信
        // 挨拶機能の追加により初期メッセージが1件入っている状態（chatHistory.length === 1）で、
        // かつまだミッションが生成されていない（currentMission が空）場合に自動でミッション要求を送信する。
        if (!isReplayMode && apiKey && chatHistory.length === 1 && !loading && !currentMission) {
            const timer = setTimeout(() => {
                if (chatHistory.length === 1 && !loading) {
                    handleRequestMission(true); // isAuto = true
                }
            }, 1500); // 挨拶を少し読ませるためのディレイ（1.5秒程度）
            return () => clearTimeout(timer);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReplayMode, apiKey, chatHistory.length, currentMission]);

    return (
        <div className="flex flex-col h-full relative">
            {/* Chat Timeline Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-32">
                {displayedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-earth-500 opacity-50">
                        <MapIcon size={64} className="mb-4 animate-pulse" />
                        <p>ナビゲーションシステム起動中...</p>
                        <p className="text-sm mt-2">自動でミッションを受信します</p>
                    </div>
                ) : (
                    displayedHistory.map((msg) => (
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
                    <div className="flex w-full mt-4 space-x-3 md:space-x-4 max-w-xl mx-auto p-2 justify-start items-start">
                        <div className="flex-shrink-0">
                            <img className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-earth-300 object-cover bg-earth-200 shadow-sm" src={avatarData || './pwa-192x192.png'} alt="AI Avatar" width={128} height={128} />
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

            {/* Clear Animation Overlay */}
            {showClearAnimation && (
                <div
                    className="absolute inset-0 z-50 flex flex-col items-center justify-center pointer-events-none bg-black/40 backdrop-blur-sm animate-in fade-in duration-500"
                    role="status"
                    aria-live="polite"
                >
                    <div className="transform -rotate-6 motion-safe:animate-bounce">
                        <div className="text-center drop-shadow-[0_5px_5px_rgba(0,0,0,0.8)]">
                            <div className="text-5xl md:text-7xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-yellow-200 to-yellow-600 tracking-wider">
                                MISSION
                            </div>
                            <div className="text-6xl md:text-9xl font-black italic text-transparent bg-clip-text bg-gradient-to-b from-orange-400 to-red-600 tracking-tighter leading-none mt-[-10px]">
                                CLEARED!
                            </div>
                        </div>
                        {clearedTitle && (
                            <div className="mt-8 mx-auto text-center bg-black/80 text-yellow-400 px-6 py-2 rounded-full font-bold shadow-[0_0_15px_rgba(234,179,8,0.5)] border border-yellow-500/50 transform scale-125">
                                👑 新たな称号「{clearedTitle}」を獲得！
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* Input Area (Bottom Sticky - Switches with Replay Controls) */}
            <div className="absolute bottom-0 left-0 right-0 bg-earth-100 border-t border-earth-300 p-2 sm:p-4 shadow-lg">
                <div className="max-w-3xl mx-auto">
                    {isReplayMode ? (
                        <div className="flex items-center justify-between bg-earth-800 text-white rounded-xl shadow-inner px-2 py-2 sm:px-4 sm:py-3 border-2 border-earth-900">
                            <div className="flex items-center gap-1 sm:gap-2">
                                <button onClick={() => setIsPlaying(!isPlaying)} className="p-2 sm:p-3 hover:bg-earth-700 rounded-full transition-colors border border-earth-700 bg-earth-900" title="自動再生 (Space)">
                                    {isPlaying ? <Pause size={24} className="text-yellow-400" /> : <Play size={24} className="text-green-400" />}
                                </button>
                                <div className="w-px h-8 bg-earth-700 mx-1 sm:mx-2"></div>
                                <button onClick={() => setReplayIndex(prev => Math.max(prev - 1, 0))} disabled={replayIndex === 0} className="p-2 sm:p-3 hover:bg-earth-700 rounded-full disabled:opacity-30 transition-colors" title="前へ (←)"><ChevronLeft size={24} /></button>
                                <button onClick={() => setReplayIndex(prev => Math.min(prev + 1, chatHistory.length - 1))} disabled={replayIndex === chatHistory.length - 1} className="p-2 sm:p-3 hover:bg-earth-700 rounded-full disabled:opacity-30 transition-colors" title="次へ (→)"><ChevronRight size={24} /></button>
                            </div>

                            <div className="text-sm sm:text-base font-mono font-bold text-earth-300 px-3 py-1.5 bg-earth-900 rounded-lg shadow-inner">
                                {replayIndex + 1} <span className="opacity-50">/</span> {Math.max(1, chatHistory.length)}
                            </div>

                            <button onClick={() => { onExitReplay && onExitReplay(); setIsPlaying(false); }} className="p-2 sm:px-4 sm:py-2 flex items-center gap-1 sm:gap-2 bg-red-900/40 hover:bg-red-600 hover:text-white rounded-lg text-red-300 transition-colors font-bold border border-red-900/50" title="リプレイ終了">
                                <span className="hidden sm:inline">終了</span><X size={20} />
                            </button>
                        </div>
                    ) : (
                        <>
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
                                    placeholder={!currentMission ? "送信してミッションを開始するか、条件を入力..." : "何かメッセージを送る (Ctrl+Enterで送信)"}
                                    className="flex-1 px-4 py-3 bg-white border border-earth-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-earth-800 resize-none overflow-hidden min-h-[50px] max-h-[120px]"
                                    rows="1"
                                />

                                <button
                                    id="send-btn"
                                    onClick={handleSend}
                                    disabled={loading || isProcessingImage || (!inputText.trim() && !imageBase64 && currentMission)}
                                    className="p-3 md:p-4 bg-earth-800 text-earth-100 rounded-xl hover:bg-earth-900 transition-colors disabled:opacity-50 flex items-center justify-center shrink-0"
                                    aria-label="送信"
                                >
                                    {loading ? <Loader2 className="animate-spin" size={24} /> : <Send size={24} />}
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
