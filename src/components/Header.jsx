import React from 'react';
import { Settings, Map, Menu } from 'lucide-react';

export default function Header({ currentTab, onChangeTab, onToggleSidebar }) {
    const tabs = [
        { id: 'chat', label: 'チャット', icon: <Map size={20} /> },
        { id: 'settings', label: '設定', icon: <Settings size={20} /> }
    ];

    return (
        <header className="bg-earth-800 text-earth-100 shadow-md sticky top-0 z-50">
            <div className="max-w-3xl mx-auto px-4">
                <div className="flex justify-between items-center h-16">
                    <div className="flex items-center gap-2">
                        <button
                            onClick={onToggleSidebar}
                            className="p-1 rounded-md hover:bg-earth-900/50 transition-colors md:hidden"
                        >
                            <Menu size={24} />
                        </button>
                        <h1 className="text-xl font-bold tracking-widest hidden sm:block">MichiQuest</h1>
                    </div>
                    <nav className="flex space-x-1 md:space-x-4">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                onClick={() => onChangeTab(tab.id)}
                                className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-colors
                  ${currentTab === tab.id
                                        ? 'bg-earth-900 text-white shadow-inner'
                                        : 'text-earth-200 hover:bg-earth-900/50 hover:text-white'
                                    }`}
                            >
                                {tab.icon}
                                <span className="hidden sm:inline">{tab.label}</span>
                            </button>
                        ))}
                    </nav>
                </div>
            </div>
        </header>
    );
}
