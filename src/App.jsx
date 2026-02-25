import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Settings from './pages/Settings';
import ChatThread from './pages/ChatThread';
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

  const [prompt1, setPrompt1] = useLocalStorage('aiPrompt1', APP_CONFIG.defaultPrompt1);
  const [prompt2, setPrompt2] = useLocalStorage('aiPrompt2', APP_CONFIG.defaultPrompt2);

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
            currentMission: ''
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

  // サイドバーの開閉状態
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

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

        let title = s.title;
        if (!title && missionValue) {
          const cleanText = missionValue.replace(/\[Emotion:.*?\]/ig, '').trim();
          title = cleanText.slice(0, 15) + (cleanText.length > 15 ? '...' : '');
        }
        return { ...s, currentMission: missionValue, title: title || '' };
      }
      return s;
    }));
  };

  const handleNewSession = () => {
    const newId = Date.now();
    const newSession = { id: newId, title: '', history: [], currentMission: '' };
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
    : '設定';

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
        />

        <main className="flex-1 w-full bg-earth-100 h-full overflow-hidden flex flex-col relative">
          {currentTab === 'settings' ? (
            <div className="flex-1 overflow-y-auto w-full">
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
            </div>
          ) : null}

          {currentTab === 'chat' ? (
            // currentSessionIdがない場合は空画面に近いものを出すか、強制Start
            !currentSessionId ? (
              <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center p-4 text-earth-800">
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
                setChatHistory={handleUpdateChatHistory}
                currentMission={currentMission}
                setCurrentMission={handleUpdateCurrentMission}
              />
            )
          ) : null}
        </main>
      </div>
    </div>
  );
}
