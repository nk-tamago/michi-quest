import React from 'react';
import { X, Plus, MessageSquare, Trash2, Award } from 'lucide-react';

const getRank = (score) => {
    if (score < 100) return "初心者ライダー";
    if (score < 500) return "週末ツアラー";
    if (score < 1000) return "道探求者";
    if (score < 3000) return "ベテラン探索者";
    return "MichiQuestマスター";
};

export default function Sidebar({
    isOpen,
    onClose,
    sessions,
    currentSessionId,
    onSelectSession,
    onNewSession,
    onDeleteSession,
    totalScore = 0
}) {
    return (
        <>
            {/* Overlay for mobile */}
            {isOpen ? (
                <button
                    className="fixed inset-0 bg-black/50 z-40 md:hidden w-full cursor-default"
                    onClick={onClose}
                    aria-label="メニューを閉じる"
                />
            ) : null}

            {/* Sidebar drawer */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-earth-800 text-earth-100 transform transition-transform duration-300 ease-in-out flex flex-col pt-safe-top
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:relative md:translate-x-0 md:h-full`}
            >
                <div className="p-4 flex justify-between items-center border-b border-earth-900/50">
                    <h2 className="font-bold tracking-wide">ツーリング履歴</h2>
                    <button onClick={onClose} className="p-1 md:hidden hover:bg-earth-900/50 rounded-full" aria-label="閉じる">
                        <X size={20} />
                    </button>
                </div>

                {/* スコア・称号表示エリア */}
                <div className="p-4 bg-earth-900/30 border-b border-earth-900/50">
                    <div className="text-xs text-earth-300 mb-1">現在の称号</div>
                    <div className="flex items-end gap-2 mb-2">
                        <span className="text-xl font-bold bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent">
                            {getRank(totalScore)}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm">
                        <span className="text-earth-400">累計スコア</span>
                        <span className="font-mono font-bold text-earth-100">{totalScore} pt</span>
                    </div>
                </div>

                <div className="p-4">
                    <button
                        onClick={() => { onNewSession(); onClose(); }}
                        className="w-full flex items-center justify-center gap-2 bg-earth-100 text-earth-900 py-3 rounded-xl font-bold hover:bg-white transition-colors shadow-sm"
                    >
                        <Plus size={20} /> 新しいツーリングへ
                    </button>
                </div>

                <div className="flex-1 overflow-y-auto px-2 pb-4 space-y-1">
                    {sessions.length === 0 ? (
                        <p className="text-earth-300 text-sm text-center mt-4">履歴がありません</p>
                    ) : (
                        sessions.map(session => (
                            <div
                                key={session.id}
                                className={`flex items-center justify-between p-3 rounded-lg cursor-pointer transition-colors group
                                    ${currentSessionId === session.id ? 'bg-earth-900 text-white shadow-inner' : 'hover:bg-earth-900/40 text-earth-200'}`}
                            >
                                <button
                                    className="flex items-center gap-2 flex-1 min-w-0 text-left outline-none focus-visible:ring-2 focus-visible:ring-earth-800 focus-visible:ring-inset rounded"
                                    onClick={() => { onSelectSession(session.id); onClose(); }}
                                >
                                    <MessageSquare size={16} className="flex-shrink-0" />
                                    <div className="truncate">
                                        <div className="text-sm font-medium truncate">{session.title || 'ミッション開始前'}</div>
                                        <div className="text-xs opacity-60">{new Intl.DateTimeFormat('ja-JP').format(new Date(session.id))}</div>
                                    </div>
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('この履歴を削除しますか？')) {
                                            onDeleteSession(session.id);
                                        }
                                    }}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-earth-900 rounded-md transition-[opacity,color,background-color] flex-shrink-0"
                                    title="削除"
                                    aria-label="履歴を削除"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </>
    );
}
