import React, { useState } from 'react';
import ChatBubble from '../components/ChatBubble';
import Button from '../components/Button';
import { generateMission } from '../utils/api';
import { Map, Loader2 } from 'lucide-react';

export default function Mission({
    apiKey,
    aiModel,
    avatarData,
    prompt1,
    currentMission,
    setCurrentMission
}) {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleRequestMission = async () => {
        if (!apiKey) {
            setError("設定画面からAPIキーを設定してください。");
            return;
        }

        setLoading(true);
        setError('');

        try {
            const resultText = await generateMission(apiKey, aiModel, prompt1);
            setCurrentMission(resultText);
        } catch (err) {
            setError(err.message || "予期せぬエラーが発生しました");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-2xl mx-auto p-4 flex flex-col items-center">

            {/* イントロ・ボタンエリア */}
            <div className="w-full max-w-sm mb-8 text-center mt-6">
                <Button
                    onClick={handleRequestMission}
                    disabled={loading}
                    className="w-full py-4 text-lg rounded-2xl shadow-lg"
                >
                    {loading ? (
                        <><Loader2 className="animate-spin" /> ミッション生成中...</>
                    ) : (
                        <><Map /> 今日のミッションを要求する</>
                    )}
                </Button>
                {error && <p className="text-red-600 mt-4 text-sm font-bold bg-red-100 p-2 rounded-lg">{error}</p>}
            </div>

            {/* チャット表示エリア */}
            <div className="w-full flex-1 min-h-[50vh] flex flex-col justify-center">
                {currentMission ? (
                    <div className="animate-fade-in-up">
                        <ChatBubble
                            message={currentMission}
                            avatarUrl={avatarData}
                            isUser={false}
                        />
                    </div>
                ) : (
                    <div className="text-center text-earth-300 my-auto flex flex-col items-center">
                        <Map size={48} className="mb-2 opacity-50" />
                        <p>ボタンを押してミッションを受け取ろう</p>
                    </div>
                )}
            </div>

        </div>
    );
}
