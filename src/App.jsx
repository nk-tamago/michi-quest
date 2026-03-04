import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import { Plus } from 'lucide-react';
import Settings from './pages/Settings';
import ChatThread from './pages/ChatThread';
import MapInteractive from './components/MapInteractive';
import Sidebar from './components/Sidebar';
import { useLocalStorage } from './utils/useLocalStorage';
import { APP_CONFIG } from './config';

export default function App() {
  const [currentTab, setCurrentTab] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') || 'chat';
  });

  const [apiKey, setApiKey] = useLocalStorage('geminiApiKey', '');
  const [aiModel, setAiModel] = useLocalStorage('geminiAiModel', 'gemini-2.5-flash');

  // アバター系
  const [avatarData, setAvatarData] = useLocalStorage('aiAvatarData', APP_CONFIG.defaultAvatarNormal);
  const [avatarAngry, setAvatarAngry] = useLocalStorage('aiAvatarAngry', APP_CONFIG.defaultAvatarAngry);
  const [avatarJoy, setAvatarJoy] = useLocalStorage('aiAvatarJoy', APP_CONFIG.defaultAvatarJoy);
  const [avatarDisgust, setAvatarDisgust] = useLocalStorage('aiAvatarDisgust', APP_CONFIG.defaultAvatarDisgust);
  const [avatarBlush, setAvatarBlush] = useLocalStorage('aiAvatarBlush', APP_CONFIG.defaultAvatarBlush);
  const [avatarSparkle, setAvatarSparkle] = useLocalStorage('aiAvatarSparkle', APP_CONFIG.defaultAvatarSparkle);
  const [avatarStare, setAvatarStare] = useLocalStorage('aiAvatarStare', APP_CONFIG.defaultAvatarStare);
  const [avatarSad, setAvatarSad] = useLocalStorage('aiAvatarSad', APP_CONFIG.defaultAvatarSad);

  const [basePrompt, setBasePrompt] = useLocalStorage('aiBasePrompt', APP_CONFIG.baseCharacterPrompt);
  const [prompt1, setPrompt1] = useLocalStorage('aiPrompt1', APP_CONFIG.defaultPrompt1);
  const [prompt2, setPrompt2] = useLocalStorage('aiPrompt2', APP_CONFIG.defaultPrompt2);
  const [prompt3, setPrompt3] = useLocalStorage('aiPrompt3', APP_CONFIG.defaultPrompt3);

  // 目的地リスト（ハルシネーション対策）
  const [destinationList, setDestinationList] = useLocalStorage('destinationList', APP_CONFIG.defaultDestinationList);

  // 信頼度（初期値: 20）
  const [trustScore, setTrustScore] = useLocalStorage('michi-trust-score', 20);

  // フィールドノート（知見コレクション）
  const [fieldNotes, setFieldNotes] = useLocalStorage('michi-field-notes', []); // [{ id: "...", title: "...", description: "...", location: "...", grade: 3, source: "mission", date: "..." }]

  // 信頼度に基づく態度プロンプトの取得
  const getTrustLevelPrompt = (score) => {
    if (score < 0) return "助手の能力に大きな疑念を抱いています。非常に厳しく、嫌味混じりに対応してください。";
    if (score < 20) return "助手をまだ信頼していません。塩対応で、能力を試すような態度で接してください。";
    if (score < 50) return "（通常のキャラクター設定通りに振る舞ってください）";
    if (score < 80) return "助手の実力を少し認め始めています。普段は塩対応ですが、時折り思わず素直な言葉が漏れます。";
    if (score < 100) return "助手を不器用ながらも頼りにしています。厳しい指摘の中に、明確な期待と信頼が滲みます。";
    return "助手を対等な研究パートナーとして認めています。ただしツンデレは変わりません。";
  };

  // セッション管理系
  // 初回ロード時に既存のchatHistory互換性維持等を含めて遅延評価(Lazy Initialization)
  const [sessions, setSessions] = useLocalStorage('chatSessions', () => {
    const oldHistoryStr = window.localStorage.getItem('chatHistory');
    if (oldHistoryStr) {
      try {
        const oldHistory = JSON.parse(oldHistoryStr);
        if (oldHistory.length > 0) {
          const newId = Date.now();
          const firstMission = oldHistory.find(m => m.role === 'ai')?.text || '過去の調査';
          return [{
            id: newId,
            title: firstMission.slice(0, 15) + '...',
            history: oldHistory,
            currentMission: '',
            isCleared: false
          }];
        }
      } catch { /* ignore */ }
    }
    return [];
  });
  const [currentSessionId, setCurrentSessionId] = useLocalStorage('currentSessionId', null);

  // アクティブなセッションから派生状態 (Derived State) としてデータを計算
  // これにより不要な useEffect での同期や state 再描画を防ぎます
  const activeSession = sessions.find(s => s.id === currentSessionId);
  const chatHistory = activeSession?.history || [];
  const currentMission = activeSession?.currentMission || '';
  const currentMissionArea = activeSession?.currentMissionArea || null;

  // サイドバーの開閉状態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // リプレイモードのステート
  const [isReplayMode, setIsReplayMode] = useState(false);
  const [isAutoReplayMode, setIsAutoReplayMode] = useState(false);



  // 地図用の状態
  const [userLocation, setUserLocation] = useState(null); // [lat, lng]
  const [mapCenter] = useState([35.681236, 139.767125]); // default: Tokyo Station

  // 初回のみ現在地を取得して初期位置とする
  useEffect(() => {
    if (!navigator.geolocation) return;

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  }, []);

  // --- State更新時に、現在のセッションへ同期するラッパー関数 ---
  const handleUpdateChatHistory = (newHistory) => {
    if (!currentSessionId) return;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const historyValue = typeof newHistory === 'function' ? newHistory(s.history) : newHistory;
        return { ...s, history: historyValue };
      }
      return s;
    }));
  };

  const handleUpdateCurrentMission = (newMission) => {
    if (!currentSessionId) return;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        const missionValue = typeof newMission === 'function' ? newMission(s.currentMission) : newMission;

        // Parse AREA tag from AI response
        let areaData = null;
        const areaMatch = missionValue.match(/\[AREA:\s*({[\s\S]*?})\]/);
        if (areaMatch) {
          try {
            areaData = JSON.parse(areaMatch[1]);
          } catch (e) {
            console.error("Failed to parse AREA tag", e);
          }
        }

        let title = s.title;
        const isInitialTitle = (!title || title === "調査対象を選定中...");

        if (areaData && areaData.name) {
          // 調査対象が変更された場合はタイトルも更新する
          title = `📍${areaData.name}`;
        } else if (isInitialTitle && missionValue) {
          const cleanText = missionValue
            .replace(/\[Emotion:[^\]]*(?:\]|\n|$)/ig, '')
            .replace(/\[AREA:[\s\S]*?\]/ig, '')
            .trim();
          title = cleanText.slice(0, 15) + (cleanText.length > 15 ? '...' : '');
        }

        // AREAタグが見つかった場合のみ更新（ストリーミング中の点滅防止のため、基本は維持or上書き）
        // ただし新しい調査対象（title未定時など）の場合はクリアしたいが、
        // 既存の仕組みだと判別しづらいので、tagがあれば更新、なければ維持とする
        const nextArea = areaData || s.currentMissionArea;

        return {
          ...s,
          currentMission: missionValue,
          currentMissionArea: nextArea,
          title: title || s.title || ''
        };
      }
      return s;
    }));
  };

  const handleMissionCleared = () => {
    if (!currentSessionId) return;
    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        return { ...s, isCleared: true };
      }
      return s;
    }));
  };

  const handleClearData = () => {
    setTrustScore(20);
    setFieldNotes([]);
    alert('フィールドノートの記録と信頼度を初期化しました。');
  };

  const handleNewSession = () => {
    const newId = Date.now();
    const rawGreeting = APP_CONFIG.greetings[Math.floor(Math.random() * APP_CONFIG.greetings.length)];
    const randomGreeting = rawGreeting.replace('{{insightCount}}', fieldNotes.length.toString());
    const initialHistory = [
      { id: Date.now() + 1, role: 'ai', type: 'text', text: randomGreeting }
    ];

    // 最初の定型文の最初の一部などをタイトルにする（後で調査生成時に上書きされる想定）
    const initialTitle = "調査対象を選定中...";

    const newSession = { id: newId, title: initialTitle, history: initialHistory, currentMission: '', isCleared: false };
    setSessions(prev => [newSession, ...prev]);
    setCurrentSessionId(newId);
    setCurrentTab('chat');
  };

  const handleDeleteSession = (id) => {
    setSessions(prev => {
      const newSessions = prev.filter(s => s.id !== id);
      if (currentSessionId === id) {
        if (newSessions.length > 0) {
          setCurrentSessionId(newSessions[0].id);
        } else {
          setCurrentSessionId(null);
        }
      }
      return newSessions;
    });
  };

  // 初回起動時、APIキーがなければ強制的に設定タブへ
  useEffect(() => {
    if (!apiKey) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCurrentTab('settings');
    }
  }, [apiKey]);

  const handleTabChange = (tabId) => {
    if (!apiKey && tabId !== 'settings') {
      alert("まずは設定画面でGemini APIキーを入力してください。");
      setCurrentTab('settings');
      window.history.replaceState(null, '', `?tab=settings`);
      return;
    }
    setCurrentTab(tabId);
    window.history.replaceState(null, '', `?tab=${tabId}`);
  };

  const handleSettingsSave = () => {
    if (!apiKey) {
      alert("APIキーは必須です。");
      return;
    }
    alert("設定を保存しました。");
    setCurrentTab('chat');
  };

  const headerTitle = currentTab === 'chat'
    ? (activeSession?.title || 'MichiQuest')
    : currentTab === 'map' ? '地図' : '設定';

  // Extract photo locations from chat history for markers
  const photoMarkers = (activeSession?.history || [])
    .filter(msg => msg.role === 'user' && msg.type === 'image' && msg.location)
    .map(msg => ({
      position: [msg.location.lat, msg.location.lng],
      popupText: `撮影地点: ${msg.text.slice(0, 20)}...`,
      image: msg.image
    }));

  return (
    <div className="h-[100dvh] flex flex-col pb-safe-bottom relative overflow-hidden bg-earth-100">
      <Header
        currentTab={currentTab}
        onChangeTab={handleTabChange}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
        title={headerTitle}
      />

      <div className="flex-1 flex overflow-hidden w-full relative">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={(id) => setCurrentSessionId(id)}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
          onStartReplay={(id, isAuto) => {
            setCurrentSessionId(id);
            setIsReplayMode(true);
            setIsAutoReplayMode(isAuto);
            setCurrentTab('chat');
            setIsSidebarOpen(false);
          }}
          trustScore={trustScore}
          fieldNotes={fieldNotes}
        />

        <main className="flex-1 w-full bg-earth-100 h-full overflow-hidden flex flex-col relative">
          {currentTab === 'settings' && (
            <div className="flex-1 overflow-y-auto w-full">
              <Settings
                apiKey={apiKey} setApiKey={setApiKey}
                aiModel={aiModel} setAiModel={setAiModel}
                avatarData={avatarData} setAvatarData={setAvatarData}
                avatarAngry={avatarAngry} setAvatarAngry={setAvatarAngry}
                avatarJoy={avatarJoy} setAvatarJoy={setAvatarJoy}
                avatarDisgust={avatarDisgust} setAvatarDisgust={setAvatarDisgust}
                avatarBlush={avatarBlush} setAvatarBlush={setAvatarBlush}
                avatarSparkle={avatarSparkle} setAvatarSparkle={setAvatarSparkle}
                avatarStare={avatarStare} setAvatarStare={setAvatarStare}
                avatarSad={avatarSad} setAvatarSad={setAvatarSad}
                basePrompt={basePrompt} setBasePrompt={setBasePrompt}
                prompt1={prompt1} setPrompt1={setPrompt1}
                prompt2={prompt2} setPrompt2={setPrompt2}
                prompt3={prompt3} setPrompt3={setPrompt3}
                destinationList={destinationList} setDestinationList={setDestinationList}
                onSave={handleSettingsSave}
                onClearData={handleClearData}
              />
            </div>
          )}

          {currentTab === 'chat' && (
            // currentSessionIdがない場合は空画面に近いものを出すか、強制Start
            !currentSessionId ? (
              <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 text-earth-800">
                <p className="mb-4">新しい調査記録を作成してください</p>
                <button
                  onClick={handleNewSession}
                  className="flex items-center gap-2 px-6 py-3 bg-earth-800 text-white rounded-xl hover:bg-earth-900 transition-colors shadow-md font-bold"
                >
                  <Plus size={20} />
                  新しい調査を開始する
                </button>
              </div>
            ) : (
              <ChatThread
                apiKey={apiKey}
                aiModel={aiModel}
                avatarData={avatarData}
                avatarAngry={avatarAngry}
                avatarJoy={avatarJoy}
                avatarDisgust={avatarDisgust}
                avatarBlush={avatarBlush}
                avatarSparkle={avatarSparkle}
                avatarStare={avatarStare}
                avatarSad={avatarSad}
                basePrompt={basePrompt}
                prompt1={prompt1}
                prompt2={prompt2}
                prompt3={prompt3}
                destinationList={destinationList}
                chatHistory={chatHistory}
                setChatHistory={handleUpdateChatHistory}
                currentMission={currentMission}
                setCurrentMission={handleUpdateCurrentMission}
                trustPrompt={getTrustLevelPrompt(trustScore)}
                onTrustChanged={(diff) => setTrustScore(prev => prev + diff)}
                onInsightAdded={(newInsight) => setFieldNotes(prev => [newInsight, ...prev])}
                onMissionCleared={handleMissionCleared}
                isReplayMode={isReplayMode}
                isAutoReplayMode={isAutoReplayMode}
                onExitReplay={() => {
                  setIsReplayMode(false);
                  setIsAutoReplayMode(false);
                }}
              />
            )
          )}

          {currentTab === 'map' && (
            <div className="flex-1 h-full w-full">
              <MapInteractive
                center={userLocation || mapCenter}
                zoom={15}
                userLocation={userLocation}
                onUpdateLocation={(loc) => setUserLocation(loc)}
                missionArea={currentMissionArea}
                markers={photoMarkers}
              />
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
