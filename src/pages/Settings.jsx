import React, { useRef, useState } from 'react';
import Button from '../components/Button';
import { Settings as SettingsIcon, ImagePlus, Save, Download, Upload } from 'lucide-react';
import { APP_CONFIG } from '../config';
import ImageCropper from '../components/ImageCropper';
import { exportData, importData, validateImportData, hasExistingData } from '../utils/backupUtils';

export default function SettingsPath({
    apiKey, setApiKey,
    aiModel, setAiModel,
    avatarData, setAvatarData,
    avatarAngry, setAvatarAngry,
    avatarJoy, setAvatarJoy,
    avatarDisgust, setAvatarDisgust,
    basePrompt, setBasePrompt,
    prompt1, setPrompt1,
    prompt2, setPrompt2,
    prompt3, setPrompt3,
    destinationList, setDestinationList,
    onSave,
    onClearData
}) {
    const defaultInputRef = useRef(null);
    const angryInputRef = useRef(null);
    const joyInputRef = useRef(null);
    const disgustInputRef = useRef(null);

    // 画像クロップ用ステート
    const [isCropping, setIsCropping] = useState(false);
    const [cropImageUrl, setCropImageUrl] = useState(null);
    const [currentSetter, setCurrentSetter] = useState(null);

    // インポート用ファイルinputの参照
    const importInputRef = useRef(null);

    const handleImageUpload = (e, setter) => {
        const file = e.target.files[0];
        if (!file) return;

        try {
            // ファイルをURLとして読み込み、クロップモーダルへ渡す
            const imageUrl = URL.createObjectURL(file);
            setCropImageUrl(imageUrl);
            setCurrentSetter(() => setter);
            setIsCropping(true);
        } catch (err) {
            console.error("画像読み込みエラー:", err);
            alert("画像の読み込みに失敗しました。");
        }
        // Inputをリセット（同じファイルを再度選べるように）
        e.target.value = '';
    };

    const handleAdjustImage = (currentImageSource, setter) => {
        if (!currentImageSource) return;
        setCropImageUrl(currentImageSource);
        setCurrentSetter(() => setter);
        setIsCropping(true);
    };

    const handleCropComplete = (croppedBase64) => {
        if (currentSetter) {
            currentSetter(croppedBase64);
        }
        setIsCropping(false);
        setCropImageUrl(null);
        setCurrentSetter(null);
    };

    const handleCropCancel = () => {
        setIsCropping(false);
        setCropImageUrl(null);
        setCurrentSetter(null);
    };

    const handleSave = (e) => {
        e.preventDefault();
        onSave();
    };

    const handleExport = () => {
        const result = exportData();
        if (result.success) {
            alert('エクスポートが完了しました。');
        } else {
            alert(result.error);
        }
    };

    const handleImportFileChange = (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            try {
                const jsonObj = JSON.parse(event.target.result);

                // バリデーション検証
                const validation = validateImportData(jsonObj);
                if (!validation.isValid) {
                    alert('エラー: ' + validation.error);
                    return;
                }

                // 既存データの有無チェックと警告画面表示
                const exists = hasExistingData();
                if (exists) {
                    const confirmOverwrite = window.confirm("現在のデータはすべて消去され、インポートしたデータに差し替えられます。この操作は取り消せません。よろしいですか？");
                    if (!confirmOverwrite) {
                        return; // キャンセルした場合は処理を中断
                    }
                }

                // インポート処理実行
                const result = importData(jsonObj);
                if (result.success) {
                    alert('データのインポートが完了しました。画面を再読み込みします。');
                    window.location.reload();
                } else {
                    alert(result.error);
                }
            } catch (err) {
                console.error("Import processing error", err);
                alert("ファイルの読み込み中にエラーが発生しました。不正なJSONファイルである可能性があります。");
            } finally {
                // ファイル選択をリセットして同じファイルを再度選べるようにする
                e.target.value = '';
            }
        };
        reader.readAsText(file);
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
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200 relative">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarData ? <img src={avatarData} alt="Normal" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1 flex justify-between items-center">
                                        <span>通常 (デフォルト)</span>
                                        {avatarData !== APP_CONFIG.defaultAvatarNormal && (
                                            <button type="button" onClick={() => setAvatarData(APP_CONFIG.defaultAvatarNormal)} className="text-[10px] text-blue-600 underline">デフォルトに戻す</button>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" ref={defaultInputRef} onChange={(e) => handleImageUpload(e, setAvatarData)} className="hidden" />
                                    <div className="flex gap-1.5 w-full">
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); handleAdjustImage(avatarData || APP_CONFIG.defaultAvatarNormal, setAvatarData); }} className="flex-1 text-xs py-1 px-1">画像を調整</Button>
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); defaultInputRef.current?.click(); }} className="flex-1 text-xs py-1 px-1">画像を変更</Button>
                                    </div>
                                </div>
                            </div>

                            {/* 怒り */}
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200 relative">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarAngry ? <img src={avatarAngry} alt="Angry" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1 flex justify-between items-center">
                                        <span>怒り / 罵倒</span>
                                        {avatarAngry !== APP_CONFIG.defaultAvatarAngry && (
                                            <button type="button" onClick={() => setAvatarAngry(APP_CONFIG.defaultAvatarAngry)} className="text-[10px] text-blue-600 underline">デフォルトに戻す</button>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" ref={angryInputRef} onChange={(e) => handleImageUpload(e, setAvatarAngry)} className="hidden" />
                                    <div className="flex gap-1.5 w-full">
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); handleAdjustImage(avatarAngry || APP_CONFIG.defaultAvatarAngry, setAvatarAngry); }} className="flex-1 text-xs py-1 px-1">画像を調整</Button>
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); angryInputRef.current?.click(); }} className="flex-1 text-xs py-1 px-1">画像を変更</Button>
                                    </div>
                                </div>
                            </div>

                            {/* 喜び */}
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200 relative">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarJoy ? <img src={avatarJoy} alt="Joy" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1 flex justify-between items-center">
                                        <span>喜び / 褒める</span>
                                        {avatarJoy !== APP_CONFIG.defaultAvatarJoy && (
                                            <button type="button" onClick={() => setAvatarJoy(APP_CONFIG.defaultAvatarJoy)} className="text-[10px] text-blue-600 underline">デフォルトに戻す</button>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" ref={joyInputRef} onChange={(e) => handleImageUpload(e, setAvatarJoy)} className="hidden" />
                                    <div className="flex gap-1.5 w-full">
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); handleAdjustImage(avatarJoy || APP_CONFIG.defaultAvatarJoy, setAvatarJoy); }} className="flex-1 text-xs py-1 px-1">画像を調整</Button>
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); joyInputRef.current?.click(); }} className="flex-1 text-xs py-1 px-1">画像を変更</Button>
                                    </div>
                                </div>
                            </div>

                            {/* 呆れ */}
                            <div className="flex items-center gap-3 bg-earth-100 p-2 rounded-lg border border-earth-200 relative">
                                <div className="w-12 h-12 rounded-full bg-earth-200 border-2 border-dashed border-earth-300 flex items-center justify-center overflow-hidden flex-shrink-0">
                                    {avatarDisgust ? <img src={avatarDisgust} alt="Disgust" className="w-full h-full object-cover" width={48} height={48} /> : <ImagePlus className="text-earth-300 w-5 h-5" />}
                                </div>
                                <div className="flex-1">
                                    <div className="text-xs font-bold text-earth-800 mb-1 flex justify-between items-center">
                                        <span>呆れ / ツッコミ</span>
                                        {avatarDisgust !== APP_CONFIG.defaultAvatarDisgust && (
                                            <button type="button" onClick={() => setAvatarDisgust(APP_CONFIG.defaultAvatarDisgust)} className="text-[10px] text-blue-600 underline">デフォルトに戻す</button>
                                        )}
                                    </div>
                                    <input type="file" accept="image/*" ref={disgustInputRef} onChange={(e) => handleImageUpload(e, setAvatarDisgust)} className="hidden" />
                                    <div className="flex gap-1.5 w-full">
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); handleAdjustImage(avatarDisgust || APP_CONFIG.defaultAvatarDisgust, setAvatarDisgust); }} className="flex-1 text-xs py-1 px-1">画像を調整</Button>
                                        <Button variant="secondary" onClick={(e) => { e.preventDefault(); disgustInputRef.current?.click(); }} className="flex-1 text-xs py-1 px-1">画像を変更</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Base Prompt */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <label htmlFor="basePrompt" className="block text-sm font-semibold text-earth-800">共通キャラクター設定</label>
                            <button type="button" onClick={() => setBasePrompt(APP_CONFIG.baseCharacterPrompt)} className="text-xs text-blue-600 underline">デフォルトに戻す</button>
                        </div>
                        <textarea
                            id="basePrompt"
                            name="basePrompt"
                            value={basePrompt}
                            onChange={(e) => setBasePrompt(e.target.value)}
                            rows={8}
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow text-sm"
                            required
                        />
                    </div>

                    {/* Prompt 1 */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <label htmlFor="prompt1" className="block text-sm font-semibold text-earth-800">調査依頼ルール (Role 1)</label>
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
                            <label htmlFor="prompt2" className="block text-sm font-semibold text-earth-800">写真判定ルール (Role 2)</label>
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

                    {/* Prompt 3 */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <label htmlFor="prompt3" className="block text-sm font-semibold text-earth-800">オペレータ対応ルール (Role 3)</label>
                            <button type="button" onClick={() => setPrompt3(APP_CONFIG.defaultPrompt3)} className="text-xs text-blue-600 underline">デフォルトに戻す</button>
                        </div>
                        <textarea
                            id="prompt3"
                            name="prompt3"
                            value={prompt3}
                            onChange={(e) => setPrompt3(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow text-sm"
                            required
                        />
                    </div>

                    {/* Destination List (Hallucination Prevention) */}
                    <div className="space-y-1">
                        <div className="flex justify-between items-end">
                            <label htmlFor="destinationList" className="block text-sm font-semibold text-earth-800">目的地候補リスト (実在確認用)</label>
                            <button type="button" onClick={() => setDestinationList(APP_CONFIG.defaultDestinationList)} className="text-xs text-blue-600 underline">デフォルトに戻す</button>
                        </div>
                        <p className="text-xs text-earth-600 mb-2">AIが実在しない地名を作成するのを防ぐため、ここに入力されたリストの中から調査の目的地を生成します。改行区切りで入力してください。</p>
                        <textarea
                            id="destinationList"
                            name="destinationList"
                            value={destinationList}
                            onChange={(e) => setDestinationList(e.target.value)}
                            rows={4}
                            className="w-full px-4 py-2 bg-earth-100 border border-earth-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-earth-800 transition-shadow text-sm"
                            placeholder="道の駅○○&#10;○○展望台&#10;..."
                        />
                    </div>

                    <div className="pt-4 border-t border-earth-200">
                        <Button type="submit" className="w-full md:w-auto ml-auto">
                            <Save size={18} /> 設定を保存する
                        </Button>
                    </div>
                </form>
            </div>

            {/* Data Management Section */}
            <div className="bg-white rounded-2xl shadow-sm border border-red-200 p-6 space-y-4">
                <h3 className="text-lg font-bold text-red-800 border-b border-red-200 pb-2">データ管理</h3>

                {/* バックアップと復元 */}
                <div className="space-y-3 pb-4 border-b border-red-100">
                    <p className="text-sm font-semibold text-earth-800">バックアップと復元</p>
                    <p className="text-xs text-earth-700">現在の調査記録や設定用データをファイルとして書き出したり、過去に書き出したデータを読み込んで差し替えたりできます。</p>
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={handleExport} className="flex-1">
                            <Download size={16} className="mr-2" /> データのエクスポート
                        </Button>
                        <Button variant="secondary" onClick={() => importInputRef.current?.click()} className="flex-1">
                            <Upload size={16} className="mr-2" /> データのインポート
                        </Button>
                        <input
                            type="file"
                            accept=".json"
                            ref={importInputRef}
                            onChange={handleImportFileChange}
                            className="hidden"
                        />
                    </div>
                </div>

                {/* データの初期化 */}
                <div className="space-y-3 pt-2">
                    <p className="text-sm font-semibold text-red-700">データの初期化 (Danger Zone)</p>
                    <p className="text-xs text-earth-700">これまで獲得した「フィールドノートの知見」と「信頼度スコア」のデータを初期化します。この操作は取り消せません。</p>
                    <div className="flex justify-start">
                        <button
                            type="button"
                            className="px-4 py-2 bg-red-100 text-red-700 font-bold rounded-lg border border-red-300 hover:bg-red-200 transition-colors"
                            onClick={() => {
                                if (window.confirm("本当にフィールドノート記録と信頼度データを初期化しますか？\n（この操作は元に戻せません）")) {
                                    onClearData();
                                }
                            }}
                        >
                            データを初期化する
                        </button>
                    </div>
                </div>
            </div>

            {/* クロップ用モーダル */}
            {isCropping && cropImageUrl && (
                <ImageCropper
                    imageSrc={cropImageUrl}
                    onCropComplete={handleCropComplete}
                    onCancel={handleCropCancel}
                />
            )}
        </div>
    );
}
