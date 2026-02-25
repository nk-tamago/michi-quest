import React, { useRef } from 'react';
import Button from '../components/Button';
import { Settings as SettingsIcon, ImagePlus, Save } from 'lucide-react';
import { resizeImage } from '../utils/imageUtils';
import { APP_CONFIG } from '../config';

export default function SettingsPath({
    apiKey, setApiKey,
    aiModel, setAiModel,
    avatarData, setAvatarData,
    avatarAngry, setAvatarAngry,
    avatarJoy, setAvatarJoy,
    avatarDisgust, setAvatarDisgust,
    prompt1, setPrompt1,
    prompt2, setPrompt2,
    onSave
}) {
    const defaultInputRef = useRef(null);
    const angryInputRef = useRef(null);
    const joyInputRef = useRef(null);
    const disgustInputRef = useRef(null);

    const handleImageUpload = async (e, setter) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // アバター画像なので小さめ(256px)にリサイズして保存容量を節約
            const resizedBase64 = await resizeImage(file, 256);
            setter(resizedBase64);
        } catch (err) {
            console.error("画像リサイズエラー:", err);
            alert("画像の処理に失敗しました。");
        }
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
                        <label htmlFor="geminiApiKey" className="block text-sm font-semibold text-earth-800">Gemini API キー (必須)</label>
                        <input
                            id="geminiApiKey"
                            name="geminiApiKey"
                            autoComplete="off"
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
                        <label htmlFor="aiModel" className="block text-sm font-semibold text-earth-800">AI モデル</label>
                        <select
                            id="aiModel"
                            name="aiModel"
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

                    {/* Avatar Images section */}
                    <div className="space-y-4">
                        <label className="block text-sm font-semibold text-earth-800 border-b border-earth-300 pb-1">AI キャラクター立ち絵 (感情別)</label>
                        <p className="text-xs text-earth-900/60 mb-2">※未設定の感情は「通常」の画像が使われます</p>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            {/* 通常 */}
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarData ? <img src={avatarData} alt="Normal" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1">通常 (デフォルト)</div>
                                    <input type="file" accept="image/*" ref={defaultInputRef} onChange={(e) => handleImageUpload(e, setAvatarData)} className="hidden" />
                                    <Button variant="secondary" onClick={(e) => { e.preventDefault(); defaultInputRef.current?.click(); }} className="w-full text-xs py-1 px-2">選択</Button>
                                </div>
                            </div>

                            {/* 怒り */}
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarAngry ? <img src={avatarAngry} alt="Angry" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1">怒り / 罵倒</div>
                                    <input type="file" accept="image/*" ref={angryInputRef} onChange={(e) => handleImageUpload(e, setAvatarAngry)} className="hidden" />
                                    <Button variant="secondary" onClick={(e) => { e.preventDefault(); angryInputRef.current?.click(); }} className="w-full text-xs py-1 px-2">選択</Button>
                                </div>
                            </div>

                            {/* 喜び */}
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarJoy ? <img src={avatarJoy} alt="Joy" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1">喜び / 褒める</div>
                                    <input type="file" accept="image/*" ref={joyInputRef} onChange={(e) => handleImageUpload(e, setAvatarJoy)} className="hidden" />
                                    <Button variant="secondary" onClick={(e) => { e.preventDefault(); joyInputRef.current?.click(); }} className="w-full text-xs py-1 px-2">選択</Button>
                                </div>
                            </div>

                            {/* 呆れ */}
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarDisgust ? <img src={avatarDisgust} alt="Disgust" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1">呆れ / ツッコミ</div>
                                    <input type="file" accept="image/*" ref={disgustInputRef} onChange={(e) => handleImageUpload(e, setAvatarDisgust)} className="hidden" />
                                    <Button variant="secondary" onClick={(e) => { e.preventDefault(); disgustInputRef.current?.click(); }} className="w-full text-xs py-1 px-2">選択</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Prompt 1 */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <label htmlFor="prompt1" className="block text-sm font-semibold text-earth-800">ミッション生成キャラクター設定</label>
                            <button type="button" onClick={() => setPrompt1(APP_CONFIG.defaultPrompt1)} className="text-xs text-blue-600 underline">デフォルトに戻す</button>
                        </div>
                        <textarea
                            id="prompt1"
                            name="prompt1"
                            value={prompt1}
                            onChange={(e) => setPrompt1(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow text-sm"
                            required
                        />
                    </div>

                    {/* Prompt 2 */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <label htmlFor="prompt2" className="block text-sm font-semibold text-earth-800">写真判定キャラクター設定</label>
                            <button type="button" onClick={() => setPrompt2(APP_CONFIG.defaultPrompt2)} className="text-xs text-blue-600 underline">デフォルトに戻す</button>
                        </div>
                        <textarea
                            id="prompt2"
                            name="prompt2"
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
