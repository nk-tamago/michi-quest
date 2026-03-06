import React, { useState, useRef, useEffect } from 'react';
import ChatBubble from '../components/ChatBubble';
import Button from '../components/Button';
import { Camera, Send, Loader2, Map as MapIcon, RefreshCcw, Award, Play, Pause, ChevronLeft, ChevronRight, X, Image as ImageIcon, Star } from 'lucide-react';
import { generateMission, evaluateReport, verifyLocationExists, chatWithOperator } from '../utils/api';
import { resizeImage } from '../utils/imageUtils';
import { getGPSFromImage } from '../utils/exifUtils';
import { APP_CONFIG } from '../config';
import { splitMessageByEmotion } from '../utils/textUtils';

export default function ChatThread({
    apiKey,
    googleMapsApiKey,
    aiModel,
    avatarData,
    avatarAngry,
    avatarJoy,
    avatarDisgust,
    avatarBlush,
    avatarSparkle,
    avatarStare,
    avatarSad,
    basePrompt,
    prompt1,
    prompt2,
    prompt3,
    destinationList,
    chatHistory,
    setChatHistory,
    currentMission,
    setCurrentMission,
    insightCount = 0,
    trustPrompt,
    onTrustChanged,
    onInsightAdded,
    onMissionCleared,
    isReplayMode = false,
    isAutoReplayMode = false,
    onExitReplay
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [inputText, setInputText] = useState('');
    const [imagePreview, setImagePreview] = useState(null);
    const [imageBase64, setImageBase64] = useState(null);
    const [imageLocation, setImageLocation] = useState(null);
    const [isProcessingImage, setIsProcessingImage] = useState(false);
    const [isImageMenuOpen, setIsImageMenuOpen] = useState(false); // メニュー開閉状態
    const cameraInputRef = useRef(null); // カメラ用 (capture="environment")
    const galleryInputRef = useRef(null); // ギャラリー用
    const chatEndRef = useRef(null);
    const menuRef = useRef(null); // メニュー領域外クリック検知用

    // リプレイ用ステート
    const [replayIndex, setReplayIndex] = useState(0);
    const [isPlaying, setIsPlaying] = useState(isAutoReplayMode);
    const [isReplayTyping, setIsReplayTyping] = useState(false);  // AI入力中アニメーション
    const [replayInputText, setReplayInputText] = useState('');   // ユーザーの入力文字反映用
    const [replayImagePreview, setReplayImagePreview] = useState(null); // ユーザーの画像反映用

    // 段階的評価表示用ステート
    const [pendingEvaluation, setPendingEvaluation] = useState(null);
    const [isEvaluating, setIsEvaluating] = useState(false);

    // [ADD] 挨拶の重複生成防止用フラグ（Strict Mode対策）
    const hasGeneratedGreeting = useRef(false);

    // [ADD] 複数のメッセージ（AIの連続発言）を時間差で追加していく共通関数
    const addMessagesWithDelay = (messages, delayMs = 600) => {
        if (!messages || messages.length === 0) return;

        // 即座に追加する1つ目
        setChatHistory(prev => [...prev, messages[0]]);

        // 2つ目以降がある場合は時間差で順番に追加
        if (messages.length > 1) {
            let i = 1;
            const interval = setInterval(() => {
                const msgToAdd = messages[i];
                if (msgToAdd) {
                    setChatHistory(prev => [...prev, msgToAdd]);
                }
                i++;
                if (i >= messages.length) clearInterval(interval);
            }, delayMs);
        }
    };

    // 初期マウント時の挨拶生成とディレイ表示
    useEffect(() => {
        if (!isReplayMode && chatHistory.length === 0 && !hasGeneratedGreeting.current) {
            hasGeneratedGreeting.current = true;
            const rawGreeting = APP_CONFIG.greetings[Math.floor(Math.random() * APP_CONFIG.greetings.length)];
            const randomGreeting = rawGreeting.replace('{{insightCount}}', insightCount.toString());
            const greetingMessages = splitMessageByEmotion(randomGreeting, Date.now() + 1, 'ai').map(msg => ({ ...msg, isGreeting: true }));

            addMessagesWithDelay(greetingMessages);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReplayMode, insightCount]); // 初回マウント時のみ実行させたいが、依存配列がないと警告が出るため最小限に絞る

    // 表示用の履歴配列（リプレイモード時は replayIndexでスライス）
    const displayedHistory = isReplayMode
        ? chatHistory.slice(0, replayIndex + 1)
        : chatHistory;

    // [ADD] 保存された履歴から「評価待ち状態」を復元する判定ロジック
    useEffect(() => {
        if (isReplayMode || chatHistory.length === 0 || pendingEvaluation) return;

        // 履歴を後ろから探し、評価完了処理が済んでおらず pendingData を持っているメッセージを探す
        for (let i = chatHistory.length - 1; i >= 0; i--) {
            const msg = chatHistory[i];
            // 評価処理が済んでいる（isEvaluationDone === true）ものは除外
            if (msg.pendingData && !msg.isEvaluationDone) {
                setPendingEvaluation({
                    msgId: msg.id,
                    grade: msg.pendingData.grade,
                    title: msg.pendingData.title,
                    announce: msg.pendingData.announce,
                    isClear: msg.pendingData.isClear
                });
                break;
            }
        }
    }, [chatHistory, isReplayMode, pendingEvaluation]);

    // クリア演出用ステート（全画面アニメーションは廃止、スタンプ表示用にフラグのみ利用）
    const [showClearStamp, setShowClearStamp] = useState(false);

    // モード切り替え時にリプレイを初期化
    useEffect(() => {
        if (isReplayMode) {
            setReplayIndex(0);
            setIsPlaying(isAutoReplayMode);
            setIsReplayTyping(false);
            setReplayInputText('');
            setReplayImagePreview(null);
            setShowClearStamp(false);
            setPendingEvaluation(null);
            setIsEvaluating(false);
        }
    }, [isReplayMode, isAutoReplayMode, currentMission]);

    // リプレイ進行中のクリアスタンプ演出再現
    useEffect(() => {
        if (isReplayMode && chatHistory.length > 0 && replayIndex < chatHistory.length) {
            const currentMsg = chatHistory[replayIndex];
            if (currentMsg && currentMsg.isClearMessage) {
                setShowClearStamp(true);
            } else if (currentMsg && currentMsg.type === 'evaluation') {
                // 評価カード表示のタイミングではまだスタンプは出さない（後のAI発言で出す）
                setShowClearStamp(false);
            }
        }
    }, [isReplayMode, replayIndex, chatHistory]);

    // リプレイ制御フロー (手動 / 自動共通の1ステップ進行)
    const advanceReplayStep = React.useCallback(() => {
        if (replayIndex >= chatHistory.length - 1) {
            setIsPlaying(false);
            return;
        }

        const nextMsg = chatHistory[replayIndex + 1];
        if (nextMsg.role === 'user') {
            // ユーザーの発言：入力欄に一括表示してディレイ後に送信（インクリメント）する
            setReplayInputText(nextMsg.text || '');
            if (nextMsg.type === 'image' && nextMsg.image) setReplayImagePreview(nextMsg.image);

            setTimeout(() => {
                setReplayIndex(prev => prev + 1);
                setReplayInputText('');
                setReplayImagePreview(null);
            }, 1000); // 1秒ディレイ
        } else {
            // AI または system
            const currentMsg = chatHistory[replayIndex];

            // 直前もAI/systemであれば、入力中アニメーションをスキップしてテンポよく連続表示する
            const isContinuousAI = currentMsg && (currentMsg.role === 'ai' || currentMsg.role === 'system');

            if (isContinuousAI) {
                // 連続の場合はタイピング演出なし
                // 手動送り（!isPlaying）なら即時、自動再生なら少し間を開ける（500ms）
                const delayMs = isPlaying ? 500 : 0;
                setTimeout(() => {
                    setReplayIndex(prev => prev + 1);
                }, delayMs);
            } else {
                // 通常の入力中アニメーション
                setIsReplayTyping(true);
                setTimeout(() => {
                    setIsReplayTyping(false);
                    setReplayIndex(prev => prev + 1);
                }, 1500); // 1.5秒待機
            }
        }
    }, [replayIndex, chatHistory]);

    // 自動再生タイマー
    useEffect(() => {
        let timer;

        const currentMsg = chatHistory[replayIndex];
        const nextMsg = chatHistory[replayIndex + 1];

        // 現在のメッセージが保留データ（PRELUDE）を持ち、次のメッセージが評価（evaluation）である場合、
        // ユーザーのアクション（ボタン押下）を待つため、自動進行を一時停止する
        const isWaitingEvaluation = currentMsg && currentMsg.pendingData &&
            nextMsg && nextMsg.type === 'evaluation';

        // 再生中で、現在待機演出中（TypingやInput中）でなければ、次のステップを発火
        if (isReplayMode && isPlaying && !isReplayTyping && !replayInputText && replayIndex < chatHistory.length - 1) {
            if (!isWaitingEvaluation) {
                timer = setTimeout(() => {
                    advanceReplayStep();
                }, 500); // ステップ間隔（0.5秒）
            }
        } else if (replayIndex >= chatHistory.length - 1) {
            setIsPlaying(false);
        }
        return () => clearTimeout(timer);
    }, [isReplayMode, isPlaying, isReplayTyping, replayInputText, replayIndex, chatHistory.length, advanceReplayStep, chatHistory]);

    // キーボード操作（← → Space, Esc）
    useEffect(() => {
        if (!isReplayMode) return;
        const handleReplayKey = (e) => {
            // Escで終了
            if (e.key === 'Escape') {
                if (onExitReplay) onExitReplay();
                return;
            }
            if (e.target.tagName === 'TEXTAREA' || e.target.tagName === 'INPUT') return;
            if (e.key === 'ArrowRight' && !isPlaying) {
                // 手動時のみ右キーで次へ（待機中は無視）
                if (!isReplayTyping && !replayInputText) advanceReplayStep();
            } else if (e.key === 'ArrowLeft' && !isPlaying) {
                // 戻る時は演出なしで即戻る
                setReplayIndex(prev => Math.max(prev - 0, 0) - 1);
            } else if (e.key === ' ') {
                e.preventDefault();
                setIsPlaying(prev => !prev);
            }
        };
        window.addEventListener('keydown', handleReplayKey);
        return () => window.removeEventListener('keydown', handleReplayKey);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isReplayMode, chatHistory.length]);

    // Auto-scroll to bottom when chat updates or replay advances
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, [displayedHistory.length, loading, isReplayTyping, isReplayMode]);

    // 画像メニューの外側をクリックした時に閉じる処理
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (menuRef.current && !menuRef.current.contains(event.target)) {
                setIsImageMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => {
            document.removeEventListener('mousedown', handleClickOutside);
        };
    }, []);

    const handleRequestMission = async (isAuto = false) => {
        if (!apiKey) return;
        setLoading(true);
        setError('');

        const currentInput = inputText || '次の調査対象を教えてください';

        // 自動送信時はユーザーの発言（「次の調査対象を教えてください」等）を履歴に追加しない
        if (!isAuto) {
            const userMsg = { id: Date.now(), role: 'user', type: 'text', text: currentInput };
            setChatHistory(prev => [...prev, userMsg]);
        }

        const savedInput = inputText;
        setInputText('');

        try {
            // ハルシネーション対策: 目的地リストがあればプロンプトに結合する
            let finalPrompt = basePrompt + "\n\n【ミチ・ノマの現在の態度（信頼度に基づく）】\n" + trustPrompt + "\n\n" + prompt1;
            const validDestinations = (destinationList || '').trim();
            if (validDestinations) {
                finalPrompt += `\n\n【重要】調査の目的地は、必ず以下のリストの中から実在するものを1つだけ選んでください。\n${validDestinations}`;
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

                // 生成。文脈にはエラー状況を含めず、常にフラットな「調査依頼ちょうだい」要求としてリトライ
                missionText = await generateMission(apiKey, aiModel, finalPrompt, currentHistory, currentInput);

                // AREAタグからnameを抽出
                const areaMatch = missionText.match(/\[AREA:\s*({[\s\S]*?})\]/);
                if (areaMatch) {
                    try {
                        const areaData = JSON.parse(areaMatch[1]);
                        if (areaData.name) {
                            // 実在チェック (Google Places API)
                            const locationMatch = await verifyLocationExists(areaData.name, googleMapsApiKey);
                            if (locationMatch) {
                                // 取得できた正確な座標で上書きする (オプショナルだけどマップ中心移動が正確になる)
                                if (locationMatch.lat !== undefined && locationMatch.lng !== undefined) {
                                    areaData.lat = locationMatch.lat;
                                    areaData.lng = locationMatch.lng;
                                    // AREAタグ自体を新しい座標で置換してmissionTextを更新する
                                    missionText = missionText.replace(areaMatch[1], JSON.stringify(areaData));
                                }
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
                // リトライ上限に達した場合でも、取得できた最後の調査依頼は採用する
            }

            // AREAタグは履歴に不要なのでここで削除してから分割する（ChatBubble側の負担も減る）
            const cleanMissionText = missionText.replace(/\[AREA:[\s\S]*?\]/ig, '').trim();
            const aiMsgParts = splitMessageByEmotion(cleanMissionText, Date.now() + 1, 'ai');
            addMessagesWithDelay(aiMsgParts);
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
        if (cameraInputRef.current) cameraInputRef.current.value = '';
        if (galleryInputRef.current) galleryInputRef.current.value = '';
    };

    const handleReportMission = async () => {
        if (!apiKey || !imageBase64) return;
        setLoading(true);
        setError('');

        const currentInput = inputText || '調査完了！記録データを確認して！';
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
            const finalPrompt = basePrompt + "\n\n【ミチ・ノマの現在の態度（信頼度に基づく）】\n" + trustPrompt + "\n\n" + prompt2;
            const resultText = await evaluateReport(apiKey, aiModel, finalPrompt, currentMission || "調査対象不明", imageBase64, chatHistory, currentInput);

            // ★ Auto-Routing: 雑談判定（PATTERN A）のチェック
            // 応答内に [Emotion: xxx] などのネストしたブラケットが含まれる可能性があるため、
            // [CHAT: から末尾までを大まかに取得し、末尾の ] を取り除く安全なパースを行う
            const chatMatch = resultText.match(/\[CHAT:\s*([\s\S]*)/i);
            if (chatMatch) {
                // 評価・判定プロセスを完全にスキップし、ただのチャット履歴として処理する
                let chatMsg = chatMatch[1].trim();
                if (chatMsg.endsWith(']')) {
                    chatMsg = chatMsg.slice(0, -1).trim();
                }

                // 万が一他のタグが含まれていた場合は除去（[CHAT]内のみを表示）
                chatMsg = chatMsg.replace(/\[GRADE:[^\]]*\]/ig, '')
                    .replace(/\[INSIGHT:\s*({[\s\S]*?}|[^\]]*)\]/ig, '')
                    .replace(/\[AREA:\s*({[\s\S]*?})\]/ig, '')
                    .replace(/\[PRELUDE:[^\]]*\]/ig, '')
                    .replace(/\[ANNOUNCE:[^\]]*\]/ig, '')
                    .trim();

                const aiMsgParts = splitMessageByEmotion(chatMsg, Date.now() + 1, 'ai');
                addMessagesWithDelay(aiMsgParts);
                return; // 雑談として処理完了
            }

            let earnedGrade = null;
            let earnedTitle = null;

            // PRELUDEタグのパースと、それに続く評価コメント（地の文）の結合取得
            let preludeMsg = "……データを開示しますよ。";
            const preludePattern = /\[PRELUDE:\s*((?:\[Emotion:[^\]]*\]|[^\]])*)\]([\s\S]*?)(?=\[(?:GRADE|INSIGHT|ANNOUNCE|AREA):|$)/i;
            const preludeMatch = resultText.match(preludePattern);
            if (preludeMatch) {
                const preludeInside = preludeMatch[1].trim();
                const descriptiveText = preludeMatch[2].trim();
                preludeMsg = (preludeInside + (descriptiveText ? '\n\n' + descriptiveText : '')).trim();
            }

            // GRADEタグのパース
            const gradeMatch = resultText.match(/\[GRADE:\s*(\d+)\]/i);
            if (gradeMatch) {
                const grade = parseInt(gradeMatch[1], 10);
                if (!isNaN(grade)) {
                    earnedGrade = grade;
                    // 信頼度の増減ロジック
                    let trustDiff = 0;
                    if (grade === 3) trustDiff = 15;
                    else if (grade === 2) trustDiff = 8;
                    else if (grade === 1) trustDiff = -3;
                    else trustDiff = -10;

                    if (onTrustChanged) onTrustChanged(trustDiff);
                }
            }

            // INSIGHTタグのパース
            const insightMatch = resultText.match(/\[INSIGHT:\s*({[\s\S]*?}|[^\]]*)\]/i);
            let insightDataObj = null;
            if (insightMatch) {
                const insightStr = insightMatch[1].trim();
                if (insightStr !== 'なし' && insightStr !== '無し' && insightStr !== 'None' && earnedGrade >= 1) {
                    try {
                        insightDataObj = JSON.parse(insightStr);
                        if (insightDataObj.title) {
                            // フィールドノートへの保存は最終表示時ではなく、ここで確定させる（裏で保存）
                            if (onInsightAdded) {
                                onInsightAdded({
                                    ...insightDataObj,
                                    grade: earnedGrade,
                                    source: 'mission',
                                    date: new Date().toISOString()
                                });
                            }
                            earnedTitle = insightDataObj.title;
                        }
                    } catch (e) {
                        console.error("Failed to parse INSIGHT data in evaluateReport", e);
                    }
                }
            }

            // AREAタグの処理 (再調査等で目的地変更指示があった場合)
            const areaMatch = resultText.match(/\[AREA:\s*({[\s\S]*?})\]/);
            if (areaMatch) {
                setCurrentMission(resultText); // AREAタグが含まれる文字列を渡すとApp.jsx側で新しい目的地として更新される
            }

            // ANNOUNCEタグのパース
            let announceMsg = null;
            const announceMatch = resultText.match(/\[ANNOUNCE:\s*([\s\S]*?)(?:\]?\s*(?=\[(?:PRELUDE|GRADE|INSIGHT|AREA):)|\]?\s*$)/i);
            if (announceMatch) {
                announceMsg = announceMatch[1].trim();
            }

            // 不要なタグのクリーンアップ（PRELUDEのゴミ処理含め、念のため）
            // （現状、displayMsgステート等の直接表示には使っていないが安全のため）

            const isClear = (earnedGrade !== null && Math.floor(earnedGrade) >= 2);

            // まずタメの言葉（PRELUDE）だけをチャット履歴に追加する
            const preludeParts = splitMessageByEmotion(preludeMsg, Date.now() + 1, 'ai');

            // ★ リロード時復元のため、裏データとしてpendingData（評価結果）をメッセージオブジェクトに仕込んでおく
            // ただし分割された場合は「最後の吹き出し」に仕込んでおき、そこで評価待機・評価カード表示のトリガーとする
            if (preludeParts.length > 0) {
                preludeParts[preludeParts.length - 1].pendingData = {
                    grade: earnedGrade,
                    title: earnedTitle,
                    announce: announceMsg,
                    isClear: isClear
                };
            }

            addMessagesWithDelay(preludeParts);

            // Reactのステートにも退避（useEffectで自動復元されるが直後のUI表示のためにもセット）
            // 最後の吹き出しのIDを退避しておく
            setPendingEvaluation({
                msgId: preludeParts.length > 0 ? preludeParts[preludeParts.length - 1].id : null,
                grade: earnedGrade,
                title: earnedTitle,
                announce: announceMsg,
                isClear: isClear
            });

        } catch (err) {
            setError(err.message || "予期せぬエラーが発生しました");
            setChatHistory(prev => prev.filter(msg => msg.id !== userMsg.id));
            setInputText(savedInputText);
            setImagePreview(savedImagePreview);
            setImageBase64(savedImageBase64);
            setImageLocation(savedImageLocation);
        } finally {
            setLoading(false);
        }
    };

    const handleAcceptEvaluation = () => {
        if (!pendingEvaluation) return;

        setIsEvaluating(true);
        const { msgId, grade, title, announce, isClear } = pendingEvaluation;
        setPendingEvaluation(null);

        // リロード時の再発火を防ぐため、chatHistory内の対象メッセージに処理済みマークを付ける
        setChatHistory(prev => prev.map(msg =>
            msg.id === msgId ? { ...msg, isEvaluationDone: true } : msg
        ));

        // 1秒後に評価カードを表示
        setTimeout(() => {
            if (grade !== null) {
                setChatHistory(prev => [...prev, {
                    id: Date.now(),
                    role: 'system',
                    type: 'evaluation',
                    grade: grade,
                    title: title
                }]);
            }

            // さらに1.5秒後にAIの労いコメント（とクリアスタンプ）を表示
            if (announce) {
                setTimeout(() => {
                    const announceParts = splitMessageByEmotion(announce, Date.now() + 1, 'ai');

                    // クリア演出がある場合、最後のメッセージのプロパティに付与する
                    if (announceParts.length > 0 && isClear) {
                        announceParts[announceParts.length - 1].isClearMessage = true;
                        announceParts[announceParts.length - 1].clearedTitle = title;
                    }

                    addMessagesWithDelay(announceParts);
                    setIsEvaluating(false);

                    if (isClear) {
                        setShowClearStamp(true);
                        if (onMissionCleared) onMissionCleared();
                        setCurrentMission(""); // クリアなのでフリー状態へ
                    }
                }, 1500);
            } else {
                setIsEvaluating(false);
                if (isClear) {
                    if (onMissionCleared) onMissionCleared();
                    setCurrentMission("");
                }
            }
        }, 1000);
    };

    const handleOperatorChat = async (withImage = false) => {
        if (!apiKey) return;
        setLoading(true);
        setError('');

        const currentInput = inputText || (withImage ? 'この写真を見て！' : '進捗どう？');
        const userMsg = {
            id: Date.now(),
            role: 'user',
            type: withImage ? 'image' : 'text',
            text: currentInput,
            ...(withImage && { image: imageBase64, location: imageLocation })
        };
        const savedInput = inputText;
        const savedImagePreview = imagePreview;
        const savedImageBase64 = imageBase64;
        const savedImageLocation = imageLocation;

        setChatHistory(prev => [...prev, userMsg]);
        setInputText('');
        if (withImage) handleClearImage();

        try {
            const finalPrompt = basePrompt + "\n\n【ミチ・ノマの現在の態度（信頼度に基づく）】\n" + trustPrompt + "\n\n" + prompt3 + (currentMission ? `\n\n【システムデータ】\n現在進行中の調査対象：${currentMission}` : "");
            let replyText = await chatWithOperator(apiKey, aiModel, finalPrompt, chatHistory, currentInput, withImage ? imageBase64 : null);

            let displayMsg = replyText;

            // AREAタグ抽出
            const areaMatch = replyText.match(/\[AREA:\s*({[\s\S]*?})\]/);
            if (areaMatch) {
                try {
                    const areaData = JSON.parse(areaMatch[1]);
                    if (areaData.name) {
                        const locationMatch = await verifyLocationExists(areaData.name, googleMapsApiKey);
                        if (!locationMatch) {
                            console.warn(`Location ${areaData.name} not found but proceeding to update.`);
                        } else if (locationMatch.lat !== undefined && locationMatch.lng !== undefined) {
                            areaData.lat = locationMatch.lat;
                            areaData.lng = locationMatch.lng;
                            replyText = replyText.replace(areaMatch[1], JSON.stringify(areaData));
                        }
                        setCurrentMission(replyText);
                    } else {
                        setCurrentMission(replyText);
                    }
                } catch (e) {
                    console.error("Failed to parse AREA tag in operator chat", e);
                }
            }

            // 自発写真によるINSIGHTタグ抽出
            let spontaneousTitle = null;
            if (withImage) {
                const insightMatch = replyText.match(/\[INSIGHT:\s*({[\s\S]*?}|[^\]]*)\]/i);
                if (insightMatch) {
                    const insightStr = insightMatch[1].trim();
                    if (insightStr !== 'なし' && insightStr !== '無し' && insightStr !== 'None') {
                        try {
                            const insightData = JSON.parse(insightStr);
                            if (onInsightAdded && insightData.title) {
                                onInsightAdded({
                                    ...insightData,
                                    grade: null, // 自発写真なのでGRADEはつかない
                                    source: 'spontaneous',
                                    date: new Date().toISOString()
                                });
                                spontaneousTitle = insightData.title;
                                if (onTrustChanged) onTrustChanged(5); // 有益なら信頼度+5
                            }
                        } catch (e) {
                            console.error("Failed to parse INSIGHT data in operator chat", e);
                        }
                    } else {
                        if (onTrustChanged) onTrustChanged(-2); // 無益だった場合は信頼度を少し下げる
                    }
                }
            }

            // 全タグのクリーンアップ (withImageに関わらず)
            // ※ EmotionタグはChatBubble側で判定して表示を切り替えてから削除するため、ここでは削除しない
            // （ここでは他のシステム的な指示タグだけを消しておき、Emotion分割関数に投げる）
            displayMsg = displayMsg.replace(/\[GRADE:[^\]]*\]/ig, '')
                .replace(/\[INSIGHT:\s*({[\s\S]*?}|[^\]]*)\]/ig, '')
                .replace(/\[AREA:\s*({[\s\S]*?})\]/ig, '')
                .replace(/\[ANNOUNCE:\s*((?:\[Emotion:[^\]]*\]|[^\]])*)\]/ig, '')
                .trim();

            const aiMsgParts = splitMessageByEmotion(displayMsg, Date.now() + 1, 'ai');
            const newMessages = [...aiMsgParts];

            if (spontaneousTitle) {
                newMessages.push({
                    id: Date.now() + 2,
                    role: 'system',
                    type: 'insight',
                    title: spontaneousTitle
                });
            }

            addMessagesWithDelay(newMessages);
        } catch (err) {
            setError(err.message || "通信エラーが発生しました");
            setChatHistory(prev => prev.filter(msg => msg.id !== userMsg.id));
            setInputText(savedInput);
            if (withImage) {
                setImagePreview(savedImagePreview);
                setImageBase64(savedImageBase64);
                setImageLocation(savedImageLocation);
            }
        } finally {
            setLoading(false);
        }
    };

    const handleSend = () => {
        if (isReplayMode) {
            // リプレイモードの隠し操作
            if (isAutoReplayMode) {
                setIsPlaying(!isPlaying); // 自動モード時はトグル
            } else {
                if (!isReplayTyping && !replayInputText) {
                    advanceReplayStep(); // 手動時は次へ
                }
            }
            return;
        }

        if (loading || isProcessingImage || pendingEvaluation || isEvaluating) return;
        if (imageBase64) {
            if (currentMission) {
                // ミッション実行中は報告として扱う
                handleReportMission();
            } else {
                // フリー状態の時は自発写真として扱う
                handleOperatorChat(true);
            }
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
        // 初期メッセージがすべて「挨拶（isGreeting）」である場合（調査依頼の受信前）に自動で調査要求を送信する。
        const hasOnlyGreetings = chatHistory.length > 0 && chatHistory.every(msg => msg.isGreeting);

        if (!isReplayMode && apiKey && hasOnlyGreetings && !loading && !currentMission) {
            const timer = setTimeout(() => {
                if (!loading && !currentMission) {
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
            <div className="flex-1 overflow-y-auto p-4 space-y-4 pb-48">
                {displayedHistory.length === 0 ? (
                    <div className="flex flex-col items-center justify-center h-full text-earth-500 opacity-50">
                        <MapIcon size={64} className="mb-4 animate-pulse" />
                        <p>ナビゲーションシステム起動中...</p>
                        <p className="text-sm mt-2">自動で調査依頼を受信します</p>
                    </div>
                ) : (
                    displayedHistory.filter(msg => msg).map((msg) => {
                        // isClearMessageがある場合、スタンプをこのバブルの上に被せる
                        const isStampTarget = msg.isClearMessage && showClearStamp;

                        return (
                            <div key={msg.id} className="w-full relative">
                                {msg.role === 'system' ? (
                                    msg.type === 'evaluation' ? (
                                        <div className="flex justify-center my-6 animate-fade-in-up">
                                            <div className="bg-gradient-to-br from-[#4E342E] to-[#3E2723] border border-[#8D6E63]/40 p-5 rounded-xl shadow-[0_10px_25px_rgba(0,0,0,0.5)] max-w-sm w-full relative overflow-hidden">
                                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-600 via-yellow-400 to-yellow-600"></div>
                                                <div className="text-center">
                                                    <div className="text-amber-100/60 text-xs font-bold tracking-widest mb-2 font-serif border-b border-[#8D6E63]/0 pb-1">ミチ・ノマの評価</div>
                                                    <div className="flex justify-center gap-2 mb-4 mt-2">
                                                        {[1, 2, 3].map(star => (
                                                            <Star
                                                                key={star}
                                                                size={48}
                                                                className={`transform transition-all duration-500 ease-out ${star <= msg.grade ? 'text-yellow-400 drop-shadow-[0_0_12px_rgba(250,204,21,0.8)] scale-110' : 'text-[#8D6E63]/30 scale-90'}`}
                                                                fill={star <= msg.grade ? 'currentColor' : 'none'}
                                                                strokeWidth={star <= msg.grade ? 1 : 1.5}
                                                            />
                                                        ))}
                                                    </div>
                                                    {msg.title && (
                                                        <div className="mt-4 pt-4 border-t border-[#8D6E63]/30 relative">
                                                            <div className="text-xl font-bold text-amber-50 leading-snug font-serif break-words">『{msg.title}』</div>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ) : msg.type === 'insight' ? (
                                        <div className="flex justify-center my-4 animate-fade-in-up">
                                            <div className="bg-[#4E342E] border border-amber-900/50 text-amber-50 px-5 py-3 rounded-lg shadow-md flex items-center gap-3 relative overflow-hidden max-w-sm w-full">
                                                <div className="absolute left-0 top-0 bottom-0 w-1 bg-yellow-500"></div>
                                                <Award size={24} className="text-yellow-500 drop-shadow flex-shrink-0" />
                                                <div className="min-w-0">
                                                    <div className="text-[10px] text-amber-200/60 font-serif italic mb-0.5">Spontaneous discovery!</div>
                                                    <div className="text-sm font-serif font-bold truncate leading-tight">「{msg.title}」を記録</div>
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex justify-center my-4 animate-fade-in">
                                            <div className="bg-earth-200 text-earth-800 px-4 py-2 rounded-full text-sm font-bold shadow-sm flex items-center gap-2 border border-earth-300">
                                                <Award size={18} className="text-yellow-600" />
                                                {msg.text}
                                            </div>
                                        </div>
                                    )
                                ) : (
                                    <div className="relative">
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
                                            avatarBlush={msg.role === 'ai' ? avatarBlush : null}
                                            avatarSparkle={msg.role === 'ai' ? avatarSparkle : null}
                                            avatarStare={msg.role === 'ai' ? avatarStare : null}
                                            avatarSad={msg.role === 'ai' ? avatarSad : null}
                                            isUser={msg.role === 'user'}
                                            timestamp={msg.id}
                                        />
                                        {/* クリアスタンプの表示（該当メッセージのみ、上に被せる） */}
                                        {isStampTarget && (
                                            <div className="absolute right-8 md:right-1/4 top-1/2 transform -translate-y-1/2 z-0 pointer-events-none animate-in zoom-in spin-in-12 duration-500 delay-300">
                                                <div className="w-36 h-36 md:w-44 md:h-44 border-[6px] border-red-500 rounded-full flex flex-col items-center justify-center transform -rotate-12 bg-transparent shadow-lg text-red-500 opacity-90 drop-shadow-md">
                                                    <div className="text-xl md:text-2xl font-black font-serif tracking-wider border-b-2 border-red-500 pb-1 mb-1 px-1">APPROVED</div>
                                                    <div className="text-sm md:text-md font-bold text-center leading-tight">調査完了<br />M.NOMA</div>
                                                </div>
                                            </div>
                                        )}
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}

                {loading || isReplayTyping || isEvaluating ? (
                    <div className="flex w-full mt-4 space-x-3 md:space-x-4 max-w-xl mx-auto p-2 justify-start items-start">
                        <div className="flex-shrink-0">
                            <img className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-earth-300 object-cover bg-earth-200 shadow-sm" src={avatarData || './pwa-192x192.png'} alt="AI Avatar" width={128} height={128} />
                        </div>
                        <div className="relative px-5 py-4 text-lg md:text-xl shadow-sm bg-white text-earth-900 rounded-2xl rounded-tl-none border border-earth-200 flex items-center gap-2">
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

                {/* Exit Replay Button (Top Right) */}
                {
                    isReplayMode && (
                        <button
                            onClick={() => { if (onExitReplay) onExitReplay(); setIsPlaying(false); }}
                            className="absolute top-4 right-4 z-50 p-2 bg-earth-900/40 hover:bg-red-600/80 text-white rounded-full transition-colors backdrop-blur shadow-sm cursor-pointer"
                            title="リプレイを終了 (Esc)"
                            aria-label="リプレイを終了"
                        >
                            <X size={20} className="opacity-75" />
                        </button>
                    )
                }

                {/* 結果受け取りのアクションボタン（Quick Reply風） */}
                {((!isReplayMode && pendingEvaluation && !isEvaluating && !loading) ||
                    (isReplayMode && !isReplayTyping && displayedHistory.length > 0 &&
                        displayedHistory[displayedHistory.length - 1].pendingData &&
                        chatHistory[replayIndex + 1]?.type === 'evaluation')) && (
                        <div className="flex justify-center mt-4 mb-8 w-full animate-fade-in-up">
                            <div className="flex flex-col gap-3 relative z-10">
                                <span className="text-xs text-earth-500 font-bold text-center">タップして話を聞く</span>
                                <div className="flex gap-4">
                                    <Button
                                        onClick={() => {
                                            if (isReplayMode) {
                                                advanceReplayStep();
                                                if (isAutoReplayMode) setIsPlaying(true);
                                            } else {
                                                handleAcceptEvaluation();
                                            }
                                        }}
                                        className="bg-earth-800 hover:bg-earth-900 text-white font-bold py-3 px-6 rounded-full shadow-md flex items-center gap-2 transition-transform hover:scale-105 active:scale-95 border-2 border-earth-600 w-full justify-center"
                                    >
                                        ミチ・ノマの話を聞く
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                <div ref={chatEndRef} />
            </div>

            {/* Exit Replay Button (Top Right) */}
            {
                isReplayMode && (
                    <button
                        onClick={() => { if (onExitReplay) onExitReplay(); setIsPlaying(false); }}
                        className="absolute top-4 right-4 z-50 p-2 bg-earth-900/40 hover:bg-red-600/80 text-white rounded-full transition-colors backdrop-blur shadow-sm cursor-pointer"
                        title="リプレイを終了 (Esc)"
                        aria-label="リプレイを終了"
                    >
                        <X size={20} className="opacity-75" />
                    </button>
                )
            }

            {/* Input Area (Bottom Sticky - Same UI for both Modes) */}
            <div className={`absolute bottom-0 left-0 right-0 z-40 bg-earth-100 border-t p-2 sm:p-4 shadow-lg transition-colors ${isReplayMode ? 'border-amber-400' : 'border-earth-300'}`}>
                <div className="max-w-3xl mx-auto">
                    <>
                        {(imagePreview || replayImagePreview) ? (
                            <div className="relative inline-block mb-3">
                                <img src={imagePreview || replayImagePreview} alt="Preview" className="h-24 w-24 object-cover rounded-lg border-2 border-earth-400 shadow-sm" />
                                <button
                                    onClick={handleClearImage}
                                    disabled={isReplayMode}
                                    className={`absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-md transition-colors ${isReplayMode ? 'opacity-50 cursor-not-allowed' : 'hover:bg-red-600'}`}
                                    aria-label="画像をクリア"
                                >
                                    <RefreshCcw size={14} />
                                </button>
                            </div>
                        ) : null}

                        <div className="flex gap-2 relative">
                            {/* Hidden File Inputs */}
                            <input
                                type="file"
                                accept="image/*"
                                capture="environment"
                                ref={cameraInputRef}
                                onChange={(e) => {
                                    if (isReplayMode) return;
                                    setIsImageMenuOpen(false);
                                    handleImageUpload(e);
                                }}
                                className="hidden"
                            />
                            <input
                                type="file"
                                accept="image/*"
                                ref={galleryInputRef}
                                onChange={(e) => {
                                    if (isReplayMode) return;
                                    setIsImageMenuOpen(false);
                                    handleImageUpload(e);
                                }}
                                className="hidden"
                            />

                            {/* Menu Content */}
                            {isImageMenuOpen && !isReplayMode && (
                                <div ref={menuRef} className="absolute bottom-full left-0 mb-2 w-48 bg-white rounded-xl shadow-xl border border-earth-200 overflow-hidden z-50 animate-in slide-in-from-bottom-2 fade-in duration-200">
                                    <button
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-earth-800 hover:bg-earth-100 transition-colors font-bold border-b border-earth-100"
                                        onClick={() => cameraInputRef.current?.click()}
                                    >
                                        <div className="bg-blue-100 p-2 rounded-full text-blue-600"><Camera size={18} /></div>
                                        カメラで撮影
                                    </button>
                                    <button
                                        className="w-full flex items-center gap-3 px-4 py-3 text-left text-earth-800 hover:bg-earth-100 transition-colors font-bold"
                                        onClick={() => galleryInputRef.current?.click()}
                                    >
                                        <div className="bg-green-100 p-2 rounded-full text-green-600"><ImageIcon size={18} /></div>
                                        写真から選ぶ
                                    </button>
                                </div>
                            )}

                            {/* Attach Button (Toggles Menu) */}
                            <button
                                onClick={() => { if (!isReplayMode) setIsImageMenuOpen(!isImageMenuOpen); }}
                                disabled={loading || isProcessingImage || isReplayMode}
                                className={`p-3 md:p-4 rounded-xl border-2 transition-colors disabled:opacity-50 ${isReplayMode ? 'bg-earth-200 border-earth-300 text-earth-700 cursor-default' : (isImageMenuOpen ? 'bg-earth-300 border-earth-400 text-earth-800' : 'bg-earth-200 border-earth-300 text-earth-700 hover:bg-earth-300')}`}
                                title="写真を添付"
                                aria-label="写真を添付メニューを開く"
                            >
                                {isProcessingImage ? <Loader2 className="animate-spin" size={24} /> : <Camera size={24} />}
                            </button>

                            {/* Text Input */}
                            <textarea
                                value={isReplayMode ? replayInputText : inputText}
                                onChange={(e) => {
                                    if (!isReplayMode) setInputText(e.target.value);
                                }}
                                onKeyDown={handleKeyDown}
                                disabled={loading || isProcessingImage}
                                readOnly={isReplayMode}
                                placeholder={!currentMission ? "調査の条件を入力..." : "メッセージを入力..."}
                                className={`flex-1 px-4 py-3 text-lg bg-white border border-earth-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-earth-800 resize-none overflow-hidden min-h-[50px] max-h-[120px] ${isReplayMode ? 'cursor-default' : ''}`}
                                rows="1"
                            />

                            <button
                                id="send-btn"
                                onClick={handleSend}
                                disabled={(!isReplayMode && (loading || isProcessingImage || (!inputText.trim() && !imageBase64 && currentMission)))}
                                className={`p-3 md:p-4 rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center shrink-0 ${isReplayMode ? (isPlaying ? 'bg-amber-600 text-white hover:bg-amber-700' : 'bg-earth-800 text-earth-100 hover:bg-earth-900') : 'bg-earth-800 text-earth-100 hover:bg-earth-900'}`}
                                aria-label={isReplayMode ? (isAutoReplayMode ? "再生トグル" : "次へ進む") : "送信"}
                                title={isReplayMode ? (isAutoReplayMode ? "再生/一時停止" : "次へ進む") : "送信"}
                            >
                                {loading || (isReplayMode && isPlaying && !isAutoReplayMode && isReplayTyping) ? (
                                    <Loader2 className="animate-spin" size={24} />
                                ) : (
                                    isReplayMode && isAutoReplayMode && isPlaying ? <Pause size={24} /> : <Send size={24} />
                                )}
                            </button>
                        </div>
                    </>
                </div>
            </div>
        </div >
    );
}
