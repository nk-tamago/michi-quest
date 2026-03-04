// メッセージをEmotionタグごとに分割するユーティリティ
export const splitMessageByEmotion = (text, baseId, role = 'ai') => {
    if (!text) return [];

    const parts = [];
    // Emotionタグを区切り文字としてキャプチャしつつ分割
    const tokens = text.split(/(\[Emotion:\s*[a-zA-Z]+[^\]]*(?:\]|\n|$))/i);

    let currentText = '';
    let lastSeenEmotion = '';

    for (let i = 0; i < tokens.length; i++) {
        const token = tokens[i];
        if (!token) continue;

        if (/^\[Emotion:/i.test(token)) {
            // [Emotion: xxx] タグが来た場合
            lastSeenEmotion = token.trim();

            if (currentText.trim()) {
                // 今まで溜まっていたテキストがあれば、確定して次へ
                parts.push({
                    id: baseId + parts.length * 0.001,
                    role: role,
                    type: 'text',
                    text: currentText.trim() + ' ' + lastSeenEmotion
                });
                currentText = ''; // リセット
            } else {
                // テキストが空でタグだけ来たパターン
                currentText = ' ' + lastSeenEmotion;
            }
        } else {
            // 通常のテキストブロック
            currentText += token;
        }
    }

    // 最後にテキストが残っている場合 (タグで終わらなかった場合)
    if (currentText.trim()) {
        const trimmed = currentText.trim();
        // すでに[Emotion: xxx]が含まれていればそのまま、なければ全体を通して最後に出た感情（あれば）を補完する
        if (/\[Emotion:/i.test(trimmed)) {
            parts.push({
                id: baseId + parts.length * 0.001,
                role: role,
                type: 'text',
                text: trimmed
            });
        } else {
            parts.push({
                id: baseId + parts.length * 0.001,
                role: role,
                type: 'text',
                text: trimmed + (lastSeenEmotion ? ' ' + lastSeenEmotion : '')
            });
        }
    }

    // Emotionタグが一切存在しない短い平文の場合はそのまま返す
    if (parts.length === 0) {
        return [{
            id: baseId,
            role: role,
            type: 'text',
            text: text.trim()
        }];
    }

    return parts;
};
