import React from 'react';
import { X, Plus, MessageSquare, Trash2, Award, Play, StepForward, CheckCircle } from 'lucide-react';

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

    // 信頼度アニメーション用
    const [trustAnimClass, setTrustAnimClass] = React.useState('');
    const prevTrustScoreRef = React.useRef(trustScore);

    React.useEffect(() => {
        if (trustScore > prevTrustScoreRef.current) {
            setTrustAnimClass('animate-pop-bounce');
        } else if (trustScore < prevTrustScoreRef.current) {
            setTrustAnimClass('animate-pop-shake');
        }
        prevTrustScoreRef.current = trustScore;

        const timer = setTimeout(() => {
            setTrustAnimClass('');
        }, 1000);
        return () => clearTimeout(timer);
    }, [trustScore]);

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
                    <div className="flex justify-between items-center mb-2">
                        <div className="text-sm text-earth-300">最新の知見<br /> (合計: {fieldNotes.length}件)</div>
                        <button
                            onClick={() => setIsCollectionOpen(true)}
                            className="text-sm text-blue-400 hover:text-blue-300 underline flex items-center gap-1 py-1"
                        >
                            <Award size={16} />全知見を見る
                        </button>
                    </div>
                    <div className="flex flex-col gap-1 mb-3">
                        <span className="text-base font-bold bg-gradient-to-r from-yellow-400 to-amber-600 bg-clip-text text-transparent break-words leading-tight">
                            {latestInsight.title}
                        </span>
                    </div>
                    <div className="flex justify-between items-center text-base border-t border-earth-700/50 pt-3 mt-2">
                        <span className="text-earth-400">信頼度</span>
                        <div className="flex items-center gap-2">
                            <span className={`text-4xl inline-block ${trustAnimClass}`} title={`Score: ${trustScore}`}>
                                {getTrustEmoji(trustScore)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-4">
                    <button
                        onClick={() => { onNewSession(); onClose(); }}
                        className="w-full flex items-center justify-center gap-2 bg-earth-100 text-earth-900 py-4 rounded-xl font-bold hover:bg-white transition-colors shadow-sm text-lg"
                    >
                        <Plus size={24} /> 新しい調査を開始
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
                                    <div className="relative flex-shrink-0">
                                        <MessageSquare size={16} />
                                        {session.isCleared && (
                                            <CheckCircle size={12} className="absolute -bottom-1 -right-1 text-green-500 bg-earth-900 rounded-full" />
                                        )}
                                    </div>
                                    <div className="truncate flex-1 flex flex-col justify-center gap-0.5">
                                        <div className="flex items-center gap-2">
                                            <div className="text-base font-medium truncate">
                                                {session.title === '調査対象を選定中...' && session.currentMissionArea?.name
                                                    ? `📍${session.currentMissionArea.name}`
                                                    : (session.title || '調査対象を選定中...')}
                                            </div>
                                        </div>
                                        <div className="text-sm opacity-60 mt-0.5">{new Intl.DateTimeFormat('ja-JP').format(new Date(session.id))}</div>
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
                <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
                    {/* Leather Cover Wrapper */}
                    <div className="bg-[#4E342E] rounded-lg w-full max-w-md max-h-[85vh] flex flex-col shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden border-2 border-[#3E2723] relative">
                        {/* Stitched Border pseudo-element using a div */}
                        <div className="absolute inset-1.5 border border-dashed border-[#8D6E63]/40 rounded pointer-events-none z-0"></div>

                        <div className="p-4 pb-3 flex justify-between items-center relative z-10 text-amber-100/90 border-b border-[#3E2723]/50">
                            <h3 className="font-serif font-bold tracking-widest flex items-center gap-2 text-xl drop-shadow-md">
                                <Award size={20} className="text-yellow-500 drop-shadow" />
                                フィールドノート
                            </h3>
                            <button onClick={() => setIsCollectionOpen(false)} className="p-1.5 hover:bg-[#3E2723] rounded-full transition-colors" aria-label="閉じる"><X size={20} /></button>
                        </div>

                        {/* Paper Inside */}
                        <div className="flex-1 overflow-y-auto m-3 mt-1 p-4 space-y-4 bg-[#FDF5E6] rounded shadow-inner relative z-10">
                            {/* Subtle paper lines background */}
                            <div className="absolute inset-0 pointer-events-none" style={{ backgroundImage: 'repeating-linear-gradient(transparent, transparent 31px, rgba(139, 69, 19, 0.05) 31px, rgba(139, 69, 19, 0.05) 32px)', backgroundAttachment: 'local' }}></div>

                            <div className="relative z-10">
                                {fieldNotes.length === 0 ? (
                                    <div className="text-center text-amber-900/40 py-12 font-serif italic text-lg">
                                        <p>まだ知見が記録されていません…</p>
                                    </div>
                                ) : (
                                    fieldNotes.map((item, idx) => (
                                        <div key={idx} className="relative bg-[#FFFBF0] p-4 rounded-sm shadow-sm border border-amber-900/10 mb-4 transform transition-transform hover:-translate-y-0.5 hover:shadow-md">
                                            <div className="flex justify-between items-start mb-2">
                                                <div className="bg-earth-900 text-amber-100 font-bold text-sm px-2 py-1 rounded-sm shadow-sm font-serif border border-earth-800 tracking-widest leading-none">
                                                    {item.grade ? `${"★".repeat(item.grade)}${"☆".repeat(3 - item.grade)}` : "自発発見"}
                                                </div>
                                                <span className="text-sm text-amber-900/60 font-serif italic mt-1">
                                                    {new Intl.DateTimeFormat('ja-JP', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }).format(new Date(item.date))}
                                                </span>
                                            </div>
                                            <div className="font-bold text-lg text-earth-900 break-words mb-2 leading-tight font-serif pb-1 border-b border-amber-900/10">
                                                {item.title}
                                            </div>
                                            <div className="text-base font-serif text-earth-800/90 mb-3 whitespace-pre-wrap leading-relaxed line-clamp-none">
                                                {item.description}
                                            </div>
                                            <div className="flex justify-end text-sm text-amber-900/60 italic font-serif mt-2">
                                                <span>-- 📍 {item.location} --</span>
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    );
}
