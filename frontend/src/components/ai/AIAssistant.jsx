import { useEffect, useRef, useState } from 'react';
import { TrashIcon, PaperAirplaneIcon } from '@heroicons/react/24/outline';

const AIAssistant = ({ messages, suggestions, processing, onSendMessage, onClear }) => {
    const messagesEndRef = useRef(null);
    const [inputValue, setInputValue] = useState('');

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = () => {
        if (!inputValue.trim() || processing) return;
        onSendMessage(inputValue);
        setInputValue('');
    };

    const formatTime = (date) => {
        return new Date(date).toLocaleTimeString('en-US', {
            hour: '2-digit',
            minute: '2-digit'
        });
    };

    return (
        <div className="bg-white rounded-3xl border border-gray-100 shadow-2xl overflow-hidden flex flex-col h-[700px]">
            {/* Header */}
            <div className="bg-gradient-to-r from-purple-600 to-indigo-600 p-6 flex justify-between items-center shadow-lg">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center shadow-lg">
                        <span className="text-2xl">🤖</span>
                    </div>
                    <div>
                        <h3 className="text-white font-black text-lg">AI Media Assistant</h3>
                        <p className="text-purple-100 text-[10px] font-bold uppercase tracking-widest">
                            {processing ? '⚡ Synchronizing...' : '✨ Ready to help'}
                        </p>
                    </div>
                </div>
                <button
                    onClick={onClear}
                    title="Clear Conversation"
                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl text-white transition-all active:scale-95"
                >
                    <TrashIcon className="w-5 h-5 text-white/80" />
                </button>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-gray-50/30">
                {messages.map((message, index) => (
                    <div
                        key={index}
                        className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'} animate-in fade-in slide-in-from-bottom-2 duration-500`}
                    >
                        <div className={`max-w-[85%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
                            <div className={`flex items-start gap-3 ${message.type === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                <div className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 shadow-md ${message.type === 'user'
                                    ? 'bg-gradient-to-br from-indigo-500 to-blue-600'
                                    : 'bg-gradient-to-br from-purple-500 to-indigo-600'
                                    }`}>
                                    <span className="text-white text-xs">
                                        {message.type === 'user' ? '👤' : '🤖'}
                                    </span>
                                </div>

                                <div>
                                    <div className={`rounded-2xl px-5 py-3 shadow-sm ${message.type === 'user'
                                        ? 'bg-gradient-to-br from-indigo-600 to-blue-700 text-white'
                                        : 'bg-white text-gray-800 border-2 border-gray-100'
                                        }`}>
                                        <p className="text-sm font-semibold leading-relaxed whitespace-pre-wrap">
                                            {message.text}
                                        </p>
                                    </div>
                                    <p className={`text-[9px] font-black text-gray-400 mt-2 uppercase tracking-widest ${message.type === 'user' ? 'text-right' : 'text-left'
                                        }`}>
                                        {formatTime(message.timestamp)}
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {processing && (
                    <div className="flex justify-start animate-fade-in">
                        <div className="flex items-start gap-3">
                            <div className="w-9 h-9 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full flex items-center justify-center shadow-md">
                                <span className="text-white text-xs">🤖</span>
                            </div>
                            <div className="bg-white rounded-2xl px-5 py-3 border-2 border-gray-100 shadow-sm">
                                <div className="flex items-center gap-2">
                                    <div className="flex gap-1.5">
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                        <div className="w-1.5 h-1.5 bg-indigo-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                    </div>
                                    <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Processing</span>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            {/* Suggestion Chips */}
            {suggestions && suggestions.length > 0 && !processing && (
                <div className="px-6 pb-4 bg-gray-50/30">
                    <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-3">Suggested Responses</p>
                    <div className="flex flex-wrap gap-2">
                        {suggestions.map((suggestion, index) => (
                            <button
                                key={index}
                                onClick={suggestion.action}
                                className="px-5 py-2.5 bg-white border-2 border-gray-100 text-gray-700 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-sm hover:shadow-xl hover:border-indigo-200 hover:text-indigo-600 transition-all active:scale-95"
                            >
                                {suggestion.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {/* Input Area */}
            <div className="p-6 bg-white border-t border-gray-100">
                <div className="flex gap-3 items-center">
                    <div className="flex-1 relative">
                        <input
                            type="text"
                            value={inputValue}
                            onChange={(e) => setInputValue(e.target.value)}
                            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message or ask for help..."
                            className="w-full pl-6 pr-14 py-4 bg-gray-50 border-2 border-gray-100 rounded-2xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all font-semibold text-sm placeholder:text-gray-400"
                        />
                        <button
                            onClick={handleSend}
                            disabled={!inputValue.trim() || processing}
                            className="absolute right-2 top-2 bottom-2 px-4 bg-indigo-600 text-white rounded-xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 disabled:opacity-30 disabled:shadow-none transition-all flex items-center justify-center group"
                        >
                            <PaperAirplaneIcon className="w-5 h-5 transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
