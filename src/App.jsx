import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import Settings from './pages/Settings';
import Mission from './pages/Mission';
import Report from './pages/Report';
import { useLocalStorage } from './utils/useLocalStorage';
import { Camera } from 'lucide-react';
import { APP_CONFIG } from './config';

export default function App() {
  const [currentTab, setCurrentTab] = useState('mission');

  // 永続化ステート
  const [apiKey, setApiKey] = useLocalStorage('geminiApiKey', '');
  const [aiModel, setAiModel] = useLocalStorage('geminiAiModel', 'gemini-2.5-flash');
  const [avatarData, setAvatarData] = useLocalStorage('aiAvatarData', '');

  const [prompt1, setPrompt1] = useLocalStorage('aiPrompt1', APP_CONFIG.defaultPrompt1);
  const [prompt2, setPrompt2] = useLocalStorage('aiPrompt2', APP_CONFIG.defaultPrompt2);

  // アクティブなセッション状態（リロード時にも保持するかどうかは要件次第だが、今回はlocalStorageに入れる）
  const [currentMission, setCurrentMission] = useLocalStorage('currentMission', '');

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
    setCurrentTab('mission');
  };

  return (
    <div className="min-h-screen flex flex-col pb-safe-bottom relative">
      <Header currentTab={currentTab} onChangeTab={handleTabChange} />

      <main className="flex-1 w-full bg-earth-100 overflow-y-auto">
        {currentTab === 'settings' && (
          <Settings
            apiKey={apiKey} setApiKey={setApiKey}
            aiModel={aiModel} setAiModel={setAiModel}
            avatarData={avatarData} setAvatarData={setAvatarData}
            prompt1={prompt1} setPrompt1={setPrompt1}
            prompt2={prompt2} setPrompt2={setPrompt2}
            onSave={handleSettingsSave}
          />
        )}

        {currentTab === 'mission' && (
          <Mission
            apiKey={apiKey}
            aiModel={aiModel}
            avatarData={avatarData}
            prompt1={prompt1}
            currentMission={currentMission}
            setCurrentMission={setCurrentMission}
          />
        )}

        {currentTab === 'report' && (
          <Report
            apiKey={apiKey}
            aiModel={aiModel}
            avatarData={avatarData}
            prompt2={prompt2}
            currentMission={currentMission}
          />
        )}
      </main>

      {/* フローティングアクションボタン (スマホ向け補助UI) */}
      {currentTab === 'mission' && currentMission && (
        <button
          onClick={() => setCurrentTab('report')}
          className="fixed bottom-6 right-6 md:hidden bg-earth-800 text-white p-4 rounded-full shadow-lg z-50 hover:bg-earth-900 transition-transform active:scale-95 flex items-center gap-2"
        >
          <Camera size={24} /> 報告へ
        </button>
      )}
    </div>
  );
}
