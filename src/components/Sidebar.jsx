import React from 'react';
import { X, Plus, MessageSquare, Trash2 } from 'lucide-react';

export default function Sidebar({
    isOpen,
    onClose,
    sessions,
    currentSessionId,
    onSelectSession,
    onNewSession,
    onDeleteSession
}) {
    return (
        <>
            {/* Overlay for mobile */}
            {isOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-40 md:hidden"
                    onClick={onClose}
                />
            )}

            {/* Sidebar drawer */}
            <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-earth-800 text-earth-100 transform transition-transform duration-300 ease-in-out flex flex-col pt-safe-top
                ${isOpen ? 'translate-x-0' : '-translate-x-full'} 
                md:relative md:translate-x-0 md:h-full`}
            >
                <div className="p-4 flex justify-between items-center border-b border-earth-900/50">
                    <h2 className="font-bold tracking-wide">ツーリング履歴</h2>
                    <button onClick={onClose} className="p-1 md:hidden hover:bg-earth-900/50 rounded-full">
                        <X size={20} />
                    </button>
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
                                <div
                                    className="flex items-center gap-2 flex-1 min-w-0"
                                    onClick={() => { onSelectSession(session.id); onClose(); }}
                                >
                                    <MessageSquare size={16} className="flex-shrink-0" />
                                    <div className="truncate">
                                        <div className="text-sm font-medium truncate">{session.title || 'ミッション開始前'}</div>
                                        <div className="text-xs opacity-60">{new Date(session.id).toLocaleDateString()}</div>
                                    </div>
                                </div>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        if (confirm('この履歴を削除しますか？')) {
                                            onDeleteSession(session.id);
                                        }
                                    }}
                                    className="p-1.5 opacity-0 group-hover:opacity-100 hover:text-red-400 hover:bg-earth-900 rounded-md transition-all flex-shrink-0"
                                    title="削除"
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
