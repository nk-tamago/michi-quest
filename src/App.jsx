import React, { useState, useEffect } from 'react';
import Header from './components/Header';
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
  const [avatarData, setAvatarData] = useLocalStorage('aiAvatarData', '');
  const [avatarAngry, setAvatarAngry] = useLocalStorage('aiAvatarAngry', '');
  const [avatarJoy, setAvatarJoy] = useLocalStorage('aiAvatarJoy', '');
  const [avatarDisgust, setAvatarDisgust] = useLocalStorage('aiAvatarDisgust', '');

  const [basePrompt, setBasePrompt] = useLocalStorage('aiBasePrompt', APP_CONFIG.baseCharacterPrompt);
  const [prompt1, setPrompt1] = useLocalStorage('aiPrompt1', APP_CONFIG.defaultPrompt1);
  const [prompt2, setPrompt2] = useLocalStorage('aiPrompt2', APP_CONFIG.defaultPrompt2);
  const [prompt3, setPrompt3] = useLocalStorage('aiPrompt3', APP_CONFIG.defaultPrompt3);

  // 目的地リスト（ハルシネーション対策）
  const [destinationList, setDestinationList] = useLocalStorage('destinationList', APP_CONFIG.defaultDestinationList);

  // 累計スコア
  const [totalScore, setTotalScore] = useLocalStorage('totalScore', 0);

  // 獲得称号リスト（コレクション）
  const [titlesCollection, setTitlesCollection] = useLocalStorage('titlesCollection', []); // [{ title: "...", date: "...", ... }]

  // セッション管理系
  // 初回ロード時に既存のchatHistory互換性維持等を含めて遅延評価(Lazy Initialization)
  const [sessions, setSessions] = useLocalStorage('chatSessions', () => {
    const oldHistoryStr = window.localStorage.getItem('chatHistory');
    if (oldHistoryStr) {
      try {
        const oldHistory = JSON.parse(oldHistoryStr);
        if (oldHistory.length > 0) {
          const newId = Date.now();
          const firstMission = oldHistory.find(m => m.role === 'ai')?.text || '過去のミッション';
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



  // 地図用の状態
  const [userLocation, setUserLocation] = useState(null); // [lat, lng]
  const [mapCenter] = useState([35.681236, 139.767125]); // default: Tokyo Station

  // 現在位置の監視開始
  useEffect(() => {
    if (!navigator.geolocation) return;

    const id = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserLocation([latitude, longitude]);
        // 初回のみ、またはまだ追従モードなら中心を移動させるなどのロジックも可
        // 今回は「現在地が取れたらとりあえず中心もそこにする（初回ロード時）」などの簡易実装にするか、
        // ユーザーが動かしたかを判定する必要があるが、シンプルに「現在地があればそこに」する
        // ただし、毎回動くとウザいので、初回取得時だけセットする、あるいはボタンで移動するなど
      },
      (err) => console.error(err),
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
    return () => navigator.geolocation.clearWatch(id);
  }, []);

  // ユーザー位置が取れたら、初回だけマップ中心をそこに合わせる（簡易的）
  useEffect(() => {
    if (userLocation) {
      // すでに中心がユーザー位置付近なら更新しない、などの制御も本来は必要だが
      // ここでは「現在地取得成功時に一度だけ」のようなフラグ管理が面倒なので
      // シンプルに「ユーザー位置が更新されたらマップ中心を追従」させない（手動移動を阻害するため）
      // そのため、ここはコメントアウトして、MapInteractiveに「ユーザー位置」だけ渡す
      // MapInteractive側で「現在地へ移動」ボタンを作るのがベストだが、
      // 今回はシンプルに「初期位置もユーザー位置」にしたい場合、
      // state初期値を工夫するか、別途ボタンを用意する。
      // いったん、userLocationをMapInteractiveに渡すだけにする。
    }
  }, [userLocation]);

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
        if (!title && missionValue) {
          const cleanText = missionValue
            .replace(/\[Emotion:[\s\S]*?\]/ig, '')
            .replace(/\[AREA:[\s\S]*?\]/ig, '')
            .trim();
          title = cleanText.slice(0, 15) + (cleanText.length > 15 ? '...' : '');
        }

        // AREAタグが見つかった場合のみ更新（ストリーミング中の点滅防止のため、基本は維持or上書き）
        // ただし新しいミッション（title未定時など）の場合はクリアしたいが、
        // 既存の仕組みだと判別しづらいので、tagがあれば更新、なければ維持とする
        const nextArea = areaData || s.currentMissionArea;

        return {
          ...s,
          currentMission: missionValue,
          currentMissionArea: nextArea,
          title: title || ''
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

  const handleNewSession = () => {
    const newId = Date.now();
    const randomGreeting = APP_CONFIG.greetings[Math.floor(Math.random() * APP_CONFIG.greetings.length)];
    const initialHistory = [
      { id: Date.now() + 1, role: 'ai', type: 'text', text: randomGreeting }
    ];

    // 最初の定型文の最初の一部などをタイトルにする（後でミッション生成時に上書きされる想定）
    const initialTitle = "ミッション準備中...";

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
          onStartReplay={(id) => {
            setCurrentSessionId(id);
            setIsReplayMode(true);
            setCurrentTab('chat');
            setIsSidebarOpen(false);
          }}
          totalScore={totalScore}
          titlesCollection={titlesCollection}
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
                basePrompt={basePrompt} setBasePrompt={setBasePrompt}
                prompt1={prompt1} setPrompt1={setPrompt1}
                prompt2={prompt2} setPrompt2={setPrompt2}
                prompt3={prompt3} setPrompt3={setPrompt3}
                destinationList={destinationList} setDestinationList={setDestinationList}
                onSave={handleSettingsSave}
              />
            </div>
          )}

          {currentTab === 'chat' && (
            // currentSessionIdがない場合は空画面に近いものを出すか、強制Start
            !currentSessionId ? (
              <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 text-earth-800">
                <p className="mb-4">新しいミッション履歴を作成してください</p>
                <button onClick={handleNewSession} className="px-6 py-3 bg-earth-800 text-white rounded-xl shadow-md font-bold hover:bg-earth-900 transition-colors">
                  新しいミッションをはじめる
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
                basePrompt={basePrompt}
                prompt1={prompt1}
                prompt2={prompt2}
                prompt3={prompt3}
                destinationList={destinationList}
                chatHistory={chatHistory}
                setChatHistory={handleUpdateChatHistory}
                currentMission={currentMission}
                setCurrentMission={handleUpdateCurrentMission}
                onScoreAdded={(score) => setTotalScore(prev => prev + score)}
                onTitleAdded={(newTitleData) => setTitlesCollection(prev => [newTitleData, ...prev])}
                onMissionCleared={handleMissionCleared}
                isSessionCleared={activeSession?.isCleared}
                isReplayMode={isReplayMode}
                onExitReplay={() => setIsReplayMode(false)}
              />
            )
          )}

          {currentTab === 'map' && (
            <div className="flex-1 h-full w-full">
              <MapInteractive
                center={userLocation || mapCenter}
                zoom={15}
                userLocation={userLocation}
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
