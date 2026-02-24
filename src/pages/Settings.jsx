import React, { useRef } from 'react';
import Button from '../components/Button';
import { Settings as SettingsIcon, ImagePlus, Save } from 'lucide-react';
import { APP_CONFIG } from '../config';

export default function SettingsPath({
    apiKey, setApiKey,
    aiModel, setAiModel,
    avatarData, setAvatarData,
    prompt1, setPrompt1,
    prompt2, setPrompt2,
    onSave
}) {
    const fileInputRef = useRef(null);

    const handleImageUpload = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            setAvatarData(event.target.result);
        };
        reader.readAsDataURL(file);
    };

    const handleSave = (e) => {
        e.preventDefault();
        onSave();
    };

    return (
        <div className="max-w-xl mx-auto p-4 space-y-6">
            <div className="bg-white rounded-2xl shadow-sm border border-earth-200 p-6 space-y-6">
                <h2 className="text-xl font-bold flex items-center gap-2 text-earth-900 border-b border-earth-200 pb-2">
                    <SettingsIcon className="text-earth-800" />
                    アプリ設定
                </h2>

                <form onSubmit={handleSave} className="space-y-5">
                    {/* API Key */}
                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-earth-800">Gemini API キー (必須)</label>
                        <input
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            placeholder="AI studio で取得した API Key を入力"
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow"
                            required
                        />
                        <p className="text-xs text-earth-900/60 mt-1">※取得したキーはブラウザにのみ保存されます</p>
                    </div>

                    {/* AI Model Selection */}
                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-earth-800">AI モデル</label>
                        <select
                            value={aiModel}
                            onChange={(e) => setAiModel(e.target.value)}
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow appearance-none cursor-pointer"
                        >
                            {APP_CONFIG.availableModels.map(model => (
                                <option key={model.id} value={model.id}>
                                    {model.label}
                                </option>
                            ))}
                        </select>
                    </div>

                    {/* Avatar Image */}
                    <div className="space-y-2">
                        <label className="block text-sm font-semibold text-earth-800">AI キャラクター立ち絵</label>
                        <div className="flex items-center gap-4">
                            <div className="w-16 h-16 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                {avatarData ? (
                                    <img src={avatarData} alt="Avatar" className="w-full h-full object-cover" />
                                ) : (
                                    <ImagePlus className="text-earth-300" />
                                )}
                            </div>
                            <div className="flex-1">
                                <input
                                    type="file"
                                    accept="image/*"
                                    ref={fileInputRef}
                                    onChange={handleImageUpload}
                                    className="hidden"
                                />
                                <Button
                                    variant="secondary"
                                    onClick={() => fileInputRef.current?.click()}
                                    className="w-full sm:w-auto text-sm py-2"
                                >
                                    <ImagePlus size={16} /> 画像を選択
                                </Button>
                            </div>
                        </div>
                    </div>

                    {/* Prompt 1 */}
                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-earth-800">ミッション生成キャラクター設定</label>
                        <textarea
                            value={prompt1}
                            onChange={(e) => setPrompt1(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow text-sm"
                            required
                        />
                    </div>

                    {/* Prompt 2 */}
                    <div className="space-y-1">
                        <label className="block text-sm font-semibold text-earth-800">写真判定キャラクター設定</label>
                        <textarea
                            value={prompt2}
                            onChange={(e) => setPrompt2(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow text-sm"
                            required
                        />
                    </div>

                    <div className="pt-4 border-t border-earth-200">
                        <Button type="submit" className="w-full md:w-auto ml-auto">
                            <Save size={18} /> 設定を保存する
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}
