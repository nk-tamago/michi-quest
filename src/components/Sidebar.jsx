import React from 'react';
import { X, Plus, MessageSquare, Trash2, Award, Play, StepForward } from 'lucide-react';

const getTrustEmoji = (score) => {
    if (score < 0) return "😡";
    if (score < 20) return "😒";
    if (score < 50) return "😐";
    if (score < 80) return "🙂";
    if (score < 100) return "😊";
    return "🥰";
};

export default function Sidebar({
    isOpen,
    onClose,
    sessions,
    currentSessionId,
    onSelectSession,
    onNewSession,
    onDeleteSession,
    onStartReplay,
    trustScore = 20,
    fieldNotes = []
}) {
    const [isCollectionOpen, setIsCollectionOpen] = React.useState(false);

    // 直近の知見を取得
    const latestInsight = fieldNotes.length > 0 ? fieldNotes[0] : { title: "まだ知見がありません" };
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
                    <h2 className="font-bold tracking-wide">調査記録</h2>
                    <button onClick={onClose} className="p-1 md:hidden hover:bg-earth-900/50 rounded-full" aria-label="閉じる">
                        <X size={20} />
                    </button>
                </div>

                <div className="p-4 bg-earth-900/30 border-b border-earth-900/50 relative">
                    <div className="flex justify-between items-center mb-1">
                        <div className="text-xs text-earth-300">最新の知見 (合計: {fieldNotes.length}件)</div>
                        <button
                            onClick={() => setIsCollectionOpen(true)}
                            className="text-xs text-blue-400 hover:text-blue-300 underline flex items-center gap-1"
                        >
                            <Award size={12} />全知見を見る
                        </button>
                    </div>
                    <div className="flex flex-col gap-1 mb-2">
                        <span className="text-sm font-bold bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent break-words leading-tight">
                            {latestInsight.title}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-sm border-t border-earth-700/50 pt-2 mt-2">
                        <span className="text-earth-400">信頼度</span>
                        <div className="flex items-center gap-2">
                            <span className="text-2xl" title={`Score: ${trustScore}`}>{getTrustEmoji(trustScore)}</span>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    <button
                        onClick={() => { onNewSession(); onClose(); }}
                        className="w-full flex items-center justify-center gap-2 bg-earth-100 text-earth-900 py-3 rounded-xl font-bold hover:bg-white transition-colors shadow-sm"
                    >
                        <Plus size={20} /> 新しい調査を開始
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
                                    <div className="truncate flex-1 flex flex-col justify-center gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="text-sm font-medium truncate">
                                                {session.title === '調査対象を選定中...' && session.currentMissionArea?.name
                                                    ? `📍${session.currentMissionArea.name}`
                                                    : (session.title || '調査対象を選定中...')}
                                            </div>
                                            {session.isCleared && (
                                                <span
                                                    className="text-[10px] font-black italic bg-gradient-to-r from-red-600 to-orange-500 text-white px-1.5 py-0.5 rounded shadow-sm border border-red-400/50 tracking-wider flex-shrink-0"
                                                    title="調査完了済み"
                                                    aria-label="クリア済み"
                                                >
                                                    CLEAR!
                                                </span>
                                            )}
                                        </div>
                                        <div className="text-xs opacity-60">{new Intl.DateTimeFormat('ja-JP').format(new Date(session.id))}</div>
                                    </div>
                                </button>
                                <div className="flex items-center gap-1 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onStartReplay) onStartReplay(session.id, false); // false = manual
                                        }}
                                        className="p-1.5 hover:text-green-400 hover:bg-earth-900 rounded-md transition-[color,background-color] flex-shrink-0"
                                        title="録画リプレイ（手動送り）を開始"
                                        aria-label="手動リプレイ"
                                    >
                                        <StepForward size={16} />
                                    </button>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (onStartReplay) onStartReplay(session.id, true); // true = auto
                                        }}
                                        className="p-1.5 hover:text-blue-400 hover:bg-earth-900 rounded-md transition-[color,background-color] flex-shrink-0"
                                        title="録画リプレイ（自動再生）を開始"
                                        aria-label="自動リプレイ"
                                    >
                                        <Play size={16} />
                                    </button>

                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            if (confirm('この履歴を削除しますか？')) {
                                                onDeleteSession(session.id);
                                            }
                                        }}
                                        className="p-1.5 hover:text-red-400 hover:bg-earth-900 rounded-md transition-[color,background-color] flex-shrink-0"
                                        title="削除"
                                        aria-label="履歴を削除"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Field Notes Modal */}
            {isCollectionOpen && (
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70">
                    <div className="bg-earth-100 rounded-2xl w-full max-w-md max-h-[80vh] flex flex-col shadow-2xl overflow-hidden border border-earth-300">
                        <div className="p-4 bg-earth-800 text-earth-100 flex justify-between items-center">
                            <h3 className="font-bold flex items-center gap-2"><Award size={20} className="text-yellow-500" /> フィールドノート</h3>
                            <button onClick={() => setIsCollectionOpen(false)} className="p-1 hover:bg-earth-700 rounded-full" aria-label="閉じる"><X size={20} /></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-earth-50">
                            {fieldNotes.length === 0 ? (
                                <div className="text-center text-earth-500 py-8">
                                    <p>まだ知見が蓄積されていません。</p>
                                    <p className="text-sm mt-2">調査を行ってフィールドノートを充実させましょう。</p>
                                </div>
                            ) : (
                                fieldNotes.map((item, idx) => (
                                    <div key={idx} className="bg-white p-3 rounded-xl shadow-sm border border-earth-200">
                                        <div className="flex justify-between items-start mb-1">
                                            <div className="bg-earth-800 text-white text-[10px] px-1.5 py-0.5 rounded">
                                                {item.grade ? `GRADE: ${item.grade}` : "GRADE: -"}
                                            </div>
                                            <span className="text-[10px] text-earth-400">
                                                {new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.date))}
                                            </span>
                                        </div>
                                        <div className="font-bold text-sm text-earth-900 break-words mb-2 leading-tight">
                                            {item.title}
                                        </div>
                                        <div className="text-xs text-earth-700 mb-2 whitespace-pre-wrap">
                                            {item.description}
                                        </div>
                                        <div className="flex justify-start text-[10px] text-earth-500">
                                            <span>📍{item.location}</span>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
