import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Settings from './pages/Settings';
import ChatThread from './pages/ChatThread';
import Sidebar from './components/Sidebar';
import { useLocalStorage } from './utils/useLocalStorage';
import { APP_CONFIG } from './config';

export default function App() {
  const [currentTab, setCurrentTab] = useState('chat');

  const [apiKey, setApiKey] = useLocalStorage('geminiApiKey', '');
  const [aiModel, setAiModel] = useLocalStorage('geminiAiModel', 'gemini-2.5-flash');

  // アバター系
  const [avatarData, setAvatarData] = useLocalStorage('aiAvatarData', '');
  const [avatarAngry, setAvatarAngry] = useLocalStorage('aiAvatarAngry', '');
  const [avatarJoy, setAvatarJoy] = useLocalStorage('aiAvatarJoy', '');
  const [avatarDisgust, setAvatarDisgust] = useLocalStorage('aiAvatarDisgust', '');

  const [prompt1, setPrompt1] = useLocalStorage('aiPrompt1', APP_CONFIG.defaultPrompt1);
  const [prompt2, setPrompt2] = useLocalStorage('aiPrompt2', APP_CONFIG.defaultPrompt2);

  // セッション管理系
  const [sessions, setSessions] = useLocalStorage('chatSessions', []); // [{id: number, title: string, history: [], currentMission: string}]
  const [currentSessionId, setCurrentSessionId] = useLocalStorage('currentSessionId', null);

  // アクティブなセッション状態（現在のチャットスレッド用）
  const [currentMission, setCurrentMission] = useState('');
  const [chatHistory, setChatHistory] = useState([]);

  // サイドバーの開閉状態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // 初回のセッション初期化、または選択されたセッションの読み込み
  useEffect(() => {
    if (sessions.length > 0 && currentSessionId) {
      const activeSession = sessions.find(s => s.id === currentSessionId);
      if (activeSession) {
        setChatHistory(activeSession.history || []);
        setCurrentMission(activeSession.currentMission || '');
      }
    } else if (sessions.length === 0) {
      // 既存の chatHistory があれば移行する(後方互換用)、なければ新規作成しない(New Sessionボタンで作成)
      const oldHistoryStr = window.localStorage.getItem('chatHistory');
      if (oldHistoryStr) {
        try {
          const oldHistory = JSON.parse(oldHistoryStr);
          if (oldHistory.length > 0) {
            const newId = Date.now();
            const firstMission = oldHistory.find(m => m.role === 'ai')?.text || '過去のミッション';
            // 冒頭を適当にタイトルにする
            const newSession = {
              id: newId,
              title: firstMission.slice(0, 15) + '...',
              history: oldHistory,
              currentMission: ''
            };
            setSessions([newSession]);
            setCurrentSessionId(newId);
          }
        } catch (e) { }
      }
    }
  }, [currentSessionId]); // sessions に依存させると入力のたびに呼ばれてしまうので初期ロード時とID変更時のみ

  // チャットやミッションが更新されたら、現在のセッションに保存する
  useEffect(() => {
    if (!currentSessionId) return;

    setSessions(prev => prev.map(s => {
      if (s.id === currentSessionId) {
        // AIの最初の発言をタイトルにする
        let title = s.title;
        if (!title && chatHistory.length > 0) {
          const firstAi = chatHistory.find(m => m.role === 'ai');
          if (firstAi) title = firstAi.text.slice(0, 15) + '...';
        }
        return { ...s, history: chatHistory, currentMission: currentMission, title: title || '' };
      }
      return s;
    }));
  }, [chatHistory, currentMission, currentSessionId]);

  const handleNewSession = () => {
    const newId = Date.now();
    const newSession = { id: newId, title: '', history: [], currentMission: '' };
    setSessions([newSession, ...sessions]);
    setCurrentSessionId(newId);
    setChatHistory([]);
    setCurrentMission('');
    setCurrentTab('chat');
  };

  const handleDeleteSession = (id) => {
    const newSessions = sessions.filter(s => s.id !== id);
    setSessions(newSessions);
    if (currentSessionId === id) {
      if (newSessions.length > 0) {
        setCurrentSessionId(newSessions[0].id);
      } else {
        setCurrentSessionId(null);
        setChatHistory([]);
        setCurrentMission('');
      }
    }
  };

  // 初回起動時、APIキーがなければ強制的に設定タブへ
  useEffect(() => {
    if (!apiKey) {
      setCurrentTab('settings');
    }
  }, [apiKey]);

  const handleTabChange = (tabId) => {
    if (!apiKey && tabId !== 'settings') {
      alert("まずは設定画面でGemini APIキーを入力してください。");
      setCurrentTab('settings');
      return;
    }
    setCurrentTab(tabId);
  };

  const handleSettingsSave = () => {
    if (!apiKey) {
      alert("APIキーは必須です。");
      return;
    }
    alert("設定を保存しました。");
    setCurrentTab('chat');
  };

  return (
    <div className="min-h-screen flex flex-col pb-safe-bottom relative overflow-hidden bg-earth-100">
      <Header
        currentTab={currentTab}
        onChangeTab={handleTabChange}
        onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
      />

      <div className="flex-1 flex overflow-hidden">
        <Sidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          sessions={sessions}
          currentSessionId={currentSessionId}
          onSelectSession={(id) => setCurrentSessionId(id)}
          onNewSession={handleNewSession}
          onDeleteSession={handleDeleteSession}
        />

        <main className="flex-1 w-full bg-earth-100 overflow-y-auto relative">
          {currentTab === 'settings' && (
            <Settings
              apiKey={apiKey} setApiKey={setApiKey}
              aiModel={aiModel} setAiModel={setAiModel}
              avatarData={avatarData} setAvatarData={setAvatarData}
              avatarAngry={avatarAngry} setAvatarAngry={setAvatarAngry}
              avatarJoy={avatarJoy} setAvatarJoy={setAvatarJoy}
              avatarDisgust={avatarDisgust} setAvatarDisgust={setAvatarDisgust}
              prompt1={prompt1} setPrompt1={setPrompt1}
              prompt2={prompt2} setPrompt2={setPrompt2}
              onSave={handleSettingsSave}
            />
          )}

          {currentTab === 'chat' && (
            // currentSessionIdがない場合は空画面に近いものを出すか、強制Start
            !currentSessionId ? (
              <div className="flex flex-col items-center justify-center h-full text-earth-800 p-4">
                <p className="mb-4">新しいツーリング履歴を作成してください</p>
                <button onClick={handleNewSession} className="px-6 py-3 bg-earth-800 text-white rounded-xl shadow-md font-bold hover:bg-earth-900 transition-colors">
                  新しいツーリングをはじめる
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
                prompt1={prompt1}
                prompt2={prompt2}
                chatHistory={chatHistory}
                setChatHistory={setChatHistory}
                currentMission={currentMission}
                setCurrentMission={setCurrentMission}
              />
            )
          )}
        </main>
      </div>
    </div>
  );
}
