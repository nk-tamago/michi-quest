import React from 'react';

export default function ChatBubble({
    message,
    avatarUrl,
    avatarAngry,
    avatarJoy,
    avatarDisgust,
    isUser = false
}) {
    // 感情タグを抽出し、対応するアバター画像を決定する
    let displayMessage = message;
    let displayAvatar = avatarUrl; // デフォルト (Normal)

    if (!isUser) {
        const emotionMatch = message.match(/\[Emotion:\s*(angry|joy|disgust|normal)\]/i);
        if (emotionMatch) {
            const emotion = emotionMatch[1].toLowerCase();
            if (emotion === 'angry' && avatarAngry) displayAvatar = avatarAngry;
            else if (emotion === 'joy' && avatarJoy) displayAvatar = avatarJoy;
            else if (emotion === 'disgust' && avatarDisgust) displayAvatar = avatarDisgust;

            // メッセージ本文から感情タグを取り除く
            displayMessage = message.replace(/\[Emotion:\s*(angry|joy|disgust|normal)\]/i, '').trim();
        }
    }

    return (
        <div className={`flex w-full mt-4 space-x-3 max-w-xl mx-auto p-2 animate-chat-appear ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser && (
                <div className="flex-shrink-0">
                    <img
                        className="h-12 w-12 rounded-full border-2 border-earth-300 object-cover bg-earth-200"
                        src={displayAvatar || './pwa-192x192.png'}
                        alt="AI Avatar"
                    />
                </div>
            )}

            <div className={`relative px-5 py-4 text-base md:text-lg shadow-sm
        ${isUser
                    ? 'bg-earth-800 text-earth-100 rounded-2xl rounded-tr-none'
                    : 'bg-white text-earth-900 rounded-2xl rounded-tl-none border border-earth-200'
                }`}>
                {/* Simple triangle tail for the speech bubble */}
                <div className={`absolute top-0 w-3 h-3 
          ${isUser
                        ? '-right-1.5 bg-earth-800 clip-triangle-right'
                        : '-left-1.5 bg-white border-l border-t border-earth-200 clip-triangle-left'
                    }`}>
                </div>
                <p className="whitespace-pre-wrap leading-relaxed">{displayMessage}</p>
            </div>
        </div>
    );
}
