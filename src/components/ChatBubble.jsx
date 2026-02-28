import React from 'react';

export default function ChatBubble({
    message,
    avatarUrl,
    avatarAngry,
    avatarJoy,
    avatarDisgust,
    isUser = false,
    timestamp = null
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
            displayMessage = message.replace(/\[Emotion:\s*(angry|joy|disgust|normal)\]/i, '');
        }

        // メッセージ本文からAREAタグを取り除く
        displayMessage = displayMessage.replace(/\[AREA:[\s\S]*?\]/ig, '').trim();
    }

    return (
        <div className={`flex w-full mt-4 space-x-3 md:space-x-4 max-w-xl mx-auto p-2 animate-chat-appear items-start ${isUser ? 'justify-end' : 'justify-start'}`}>
            {!isUser ? (
                <div className="flex-shrink-0 flex flex-col items-center gap-1">
                    <img
                        className="h-28 w-28 md:h-32 md:w-32 rounded-full border-4 border-earth-300 object-cover bg-earth-200 shadow-sm"
                        src={displayAvatar || './pwa-192x192.png'}
                        alt="AI Avatar"
                        width={128}
                        height={128}
                    />
                    <span className="text-xs md:text-sm font-bold text-earth-700 bg-earth-200 px-2 py-0.5 rounded-full border border-earth-300 shadow-sm whitespace-nowrap">
                        ミチ・ノマ
                    </span>
                </div>
            ) : null}

            <div className="flex flex-col gap-1 max-w-[calc(100%-120px)] md:max-w-[calc(100%-140px)]">
                <div className={`relative px-5 py-4 text-lg md:text-xl shadow-sm
            ${isUser
                        ? 'bg-earth-800 text-earth-100 rounded-2xl rounded-tr-none'
                        : 'bg-white text-earth-900 rounded-2xl rounded-tl-none border border-earth-200'
                    }`}>
                    {/* 吹き出しのしっぽ */}
                    {isUser ? (
                        <svg aria-hidden="true" className="absolute top-0 -right-[7px] w-[8px] h-[12px]" viewBox="0 0 8 12" fill="none">
                            <path d="M0 0 L8 0 L0 12 Z" fill="currentColor" className="text-earth-800" />
                        </svg>
                    ) : (
                        <svg aria-hidden="true" className="absolute top-[-1px] -left-[8px] w-[8px] h-[13px]" viewBox="0 0 8 13" fill="none">
                            <path d="M8 1 L0 1 L8 13 Z" fill="white" />
                            <path d="M8 1 L0 1 L8 13" stroke="currentColor" strokeWidth="1" className="text-earth-200" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    )}
                    <p className="whitespace-pre-wrap leading-relaxed break-words">{displayMessage}</p>
                </div>
                {/* Timestamp */}
                {timestamp && (
                    <div className={`text-xs text-earth-500/70 font-mono mt-1 ${isUser ? 'text-right mr-1' : 'text-left ml-1'}`}>
                        {new Intl.DateTimeFormat('ja-JP', { hour: '2-digit', minute: '2-digit' }).format(new Date(timestamp))}
                    </div>
                )}
            </div>
        </div>
    );
}
