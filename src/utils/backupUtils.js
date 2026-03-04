export const exportData = () => {
    try {
        const keysToExport = [
            'chatSessions',
            'michi-field-notes',
            'michi-trust-score',
            'aiAvatarData',
            'aiAvatarAngry',
            'aiAvatarJoy',
            'aiAvatarDisgust',
            'aiAvatarBlush',
            'aiAvatarSparkle',
            'aiAvatarStare',
            'aiAvatarSad',
            'aiBasePrompt',
            'aiPrompt1',
            'aiPrompt2',
            'aiPrompt3',
            'destinationList',
            'geminiApiKey',
            'geminiAiModel'
        ];

        const exportObj = {};
        for (const key of keysToExport) {
            const data = localStorage.getItem(key);
            if (data) {
                exportObj[key] = JSON.parse(data);
            }
        }

        const dataStr = JSON.stringify(exportObj, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);

        const now = new Date();
        const yy = String(now.getFullYear());
        const mm = String(now.getMonth() + 1).padStart(2, '0');
        const dd = String(now.getDate()).padStart(2, '0');
        const hh = String(now.getHours()).padStart(2, '0');
        const min = String(now.getMinutes()).padStart(2, '0');
        const ss = String(now.getSeconds()).padStart(2, '0');

        const filename = `michiquest-backup-${yy}${mm}${dd}_${hh}${min}${ss}.json`;

        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);

        return { success: true };
    } catch (error) {
        console.error('Export failed:', error);
        return { success: false, error: 'エクスポートに失敗しました。' };
    }
};

export const validateImportData = (dataObj) => {
    // 必須キーのいずれかが存在するかチェック
    const requiredKeys = ['chatSessions', 'michi-field-notes', 'michi-trust-score', 'geminiApiKey'];
    const hasAnyKey = requiredKeys.some(key => Object.prototype.hasOwnProperty.call(dataObj, key));
    if (!hasAnyKey) {
        return { isValid: false, error: 'MichiQuestのバックアップデータではありません。' };
    }

    // データ形式の簡易チェック
    if (dataObj['chatSessions'] && !Array.isArray(dataObj['chatSessions'])) {
        return { isValid: false, error: '調査履歴のデータ形式が不正です。' };
    }

    return { isValid: true };
};

export const hasExistingData = () => {
    const keysToCheck = ['chatSessions', 'michi-field-notes', 'michi-trust-score'];
    for (const key of keysToCheck) {
        const data = localStorage.getItem(key);
        // dataが存在し、空配列や空オブジェクトでない場合を既存データありとみなす
        if (data && data !== '[]' && data !== '{}') {
            return true;
        }
    }
    return false;
};

export const importData = (dataObj) => {
    try {
        const keysToImport = [
            'chatSessions',
            'michi-field-notes',
            'michi-trust-score',
            'aiAvatarData',
            'aiAvatarAngry',
            'aiAvatarJoy',
            'aiAvatarDisgust',
            'aiAvatarBlush',
            'aiAvatarSparkle',
            'aiAvatarStare',
            'aiAvatarSad',
            'aiBasePrompt',
            'aiPrompt1',
            'aiPrompt2',
            'aiPrompt3',
            'destinationList',
            'geminiApiKey',
            'geminiAiModel'
        ];

        for (const key of keysToImport) {
            if (Object.prototype.hasOwnProperty.call(dataObj, key)) {
                localStorage.setItem(key, JSON.stringify(dataObj[key]));
            } else {
                // インポートデータに含まれないキーは初期化する(完全な差し替えのため)
                localStorage.removeItem(key);
            }
        }
        return { success: true };
    } catch (error) {
        console.error('Import failed:', error);
        return { success: false, error: 'インポート処理に失敗しました。' };
    }
};
