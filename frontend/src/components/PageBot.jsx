import React, { useState, useRef, useEffect } from 'react';

const PageBot = ({ isOpen, onClose }) => {
    const [messages, setMessages] = useState([
        {
            type: 'bot',
            text: "Hey there! 👋 I'm PageBot, your friendly Connectify AI assistant! Need help finding cool content, discovering new friends, or just want to chat? I'm here for you!",
            timestamp: new Date()
        }
    ]);
    const [inputMessage, setInputMessage] = useState('');
    const [isTyping, setIsTyping] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const getBotResponse = (userMessage) => {
        const msg = userMessage.toLowerCase();

        // Greeting responses
        if (msg.match(/\b(hi|hello|hey|sup|yo)\b/)) {
            return "Hey! 😊 What brings you to Connectify today? Looking for trending posts, new friends, or just exploring?";
        }

        // Help requests
        if (msg.match(/\b(help|how|what|guide)\b/)) {
            return "I can help you with:\n✨ Finding trending content\n👥 Discovering new people to follow\n🔥 Exploring hashtags\n📰 Latest news\n💬 Tips for engaging posts\n\nWhat would you like to know more about?";
        }

        // Trending/popular content
        if (msg.match(/\b(trending|popular|hot|viral)\b/)) {
            return "Check out the 🔥 Trending section on the right sidebar! You'll find the hottest hashtags and topics everyone's talking about. Don't forget to join the conversation!";
        }

        // Finding friends/users
        if (msg.match(/\b(friend|follow|user|people|connect)\b/)) {
            return "Head to the 'Suggested for you' section! We've handpicked awesome people you might vibe with. Give them a follow and start building your community! 🤝";
        }

        // Hashtags
        if (msg.match(/\b(hashtag|tag|#)\b/)) {
            return "Hashtags are your best friend for discovery! 🏷️ Click any trending hashtag to explore related posts, or add them to your own posts to reach more people!";
        }

        // News
        if (msg.match(/\b(news|article|read)\b/)) {
            return "Stay informed with our News section! 📰 We've got fresh stories from tech, sports, entertainment, and more. Tap the news icon in the navigation to dive in!";
        }

        // Posting tips
        if (msg.match(/\b(post|share|upload|create)\b/)) {
            return "Ready to share? 🎨 Click the + button to create a post! Pro tip: Use hashtags, add location tags, and engage with comments to boost your reach. You got this!";
        }

        // Stories
        if (msg.match(/\b(story|stories)\b/)) {
            return "Stories are perfect for sharing quick moments! ⚡ They disappear after 24 hours, so feel free to be spontaneous. Tap the story icon to create one!";
        }

        // Messages/chat
        if (msg.match(/\b(message|chat|dm|inbox)\b/)) {
            return "Want to chat privately? 💬 Click the messages icon to slide into someone's DMs! Keep it friendly and respectful, and you'll make great connections!";
        }

        // Features
        if (msg.match(/\b(feature|can i|able to)\b/)) {
            return "Connectify AI has tons of cool features! 🚀 Posts, Stories, Messages, News, AI captions, location tags, and more! What specific feature are you curious about?";
        }

        // Thanks
        if (msg.match(/\b(thank|thanks|thx)\b/)) {
            return "You're welcome! 😊 I'm always here if you need me. Happy exploring! 🎉";
        }

        // Goodbye
        if (msg.match(/\b(bye|goodbye|see you|later)\b/)) {
            return "Catch you later! 👋 Remember, I'm just a click away if you need anything. Have an awesome time on Connectify!";
        }

        // Default response
        return "Hmm, I'm not sure about that one! 🤔 But the Connectify team might know! Try exploring the platform or checking out trending posts. Need help with something specific?";
    };

    const handleSendMessage = () => {
        if (!inputMessage.trim()) return;

        // Add user message
        const userMsg = {
            type: 'user',
            text: inputMessage,
            timestamp: new Date()
        };
        setMessages(prev => [...prev, userMsg]);
        setInputMessage('');

        // Show typing indicator
        setIsTyping(true);

        // Simulate bot thinking time
        setTimeout(() => {
            const botResponse = getBotResponse(inputMessage);
            const botMsg = {
                type: 'bot',
                text: botResponse,
                timestamp: new Date()
            };
            setMessages(prev => [...prev, botMsg]);
            setIsTyping(false);
        }, 800);
    };

    const handleKeyPress = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            handleSendMessage();
        }
    };

    const quickActions = [
        { icon: '🔥', text: 'Trending', action: 'Show me trending content' },
        { icon: '👥', text: 'Find Friends', action: 'Help me find people to follow' },
        { icon: '📰', text: 'News', action: 'Show me the latest news' },
        { icon: '💡', text: 'Tips', action: 'Give me posting tips' }
    ];

    const handleQuickAction = (action) => {
        setInputMessage(action);
        setTimeout(() => handleSendMessage(), 100);
    };

    return (
        <>
            {/* Chat Window */}
            {isOpen && (
                <div
                    style={{
                        position: 'fixed',
                        bottom: '30px',
                        right: '30px',
                        zIndex: 1000,
                        width: '380px',
                        height: '600px',
                        borderRadius: '24px',
                        background: 'white',
                        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden',
                        border: '1px solid rgba(102, 126, 234, 0.2)',
                    }}
                >
                    {/* Header */}
                    <div
                        style={{
                            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                            padding: '20px',
                            color: 'white',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ fontSize: '32px' }}>🤖</div>
                            <div>
                                <div style={{ fontWeight: 'bold', fontSize: '18px' }}>PageBot</div>
                                <div style={{ fontSize: '12px', opacity: 0.9 }}>Your Connectify Assistant</div>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                background: 'rgba(255, 255, 255, 0.2)',
                                border: 'none',
                                borderRadius: '50%',
                                width: '32px',
                                height: '32px',
                                cursor: 'pointer',
                                fontSize: '18px',
                                color: 'white',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                            }}
                        >
                            ×
                        </button>
                    </div>

                    {/* Messages */}
                    <div
                        style={{
                            flex: 1,
                            overflowY: 'auto',
                            padding: '20px',
                            background: '#f7f9fc',
                        }}
                    >
                        {messages.map((msg, index) => (
                            <div
                                key={index}
                                style={{
                                    marginBottom: '16px',
                                    display: 'flex',
                                    justifyContent: msg.type === 'user' ? 'flex-end' : 'flex-start',
                                }}
                            >
                                <div
                                    style={{
                                        maxWidth: '75%',
                                        padding: '12px 16px',
                                        borderRadius: msg.type === 'user' ? '18px 18px 4px 18px' : '18px 18px 18px 4px',
                                        background: msg.type === 'user'
                                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                            : 'white',
                                        color: msg.type === 'user' ? 'white' : '#333',
                                        fontSize: '14px',
                                        lineHeight: '1.5',
                                        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
                                        whiteSpace: 'pre-line',
                                    }}
                                >
                                    {msg.text}
                                </div>
                            </div>
                        ))}

                        {isTyping && (
                            <div style={{ display: 'flex', gap: '4px', padding: '12px' }}>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#667eea', animation: 'bounce 1s infinite' }}></div>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#667eea', animation: 'bounce 1s infinite 0.2s' }}></div>
                                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#667eea', animation: 'bounce 1s infinite 0.4s' }}></div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    {/* Quick Actions */}
                    {messages.length <= 2 && (
                        <div style={{ padding: '12px 20px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
                            <div style={{ fontSize: '11px', color: '#666', marginBottom: '8px', fontWeight: '600' }}>Quick Actions:</div>
                            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                                {quickActions.map((qa, index) => (
                                    <button
                                        key={index}
                                        onClick={() => handleQuickAction(qa.action)}
                                        style={{
                                            padding: '6px 12px',
                                            borderRadius: '16px',
                                            border: '1px solid #e5e7eb',
                                            background: 'white',
                                            cursor: 'pointer',
                                            fontSize: '12px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '4px',
                                            transition: 'all 0.2s',
                                        }}
                                        onMouseEnter={(e) => {
                                            e.currentTarget.style.background = '#f3f4f6';
                                            e.currentTarget.style.borderColor = '#667eea';
                                        }}
                                        onMouseLeave={(e) => {
                                            e.currentTarget.style.background = 'white';
                                            e.currentTarget.style.borderColor = '#e5e7eb';
                                        }}
                                    >
                                        <span>{qa.icon}</span>
                                        <span>{qa.text}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Input */}
                    <div style={{ padding: '16px 20px', background: 'white', borderTop: '1px solid #e5e7eb' }}>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <input
                                type="text"
                                value={inputMessage}
                                onChange={(e) => setInputMessage(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder="Ask me anything..."
                                style={{
                                    flex: 1,
                                    padding: '12px 16px',
                                    borderRadius: '24px',
                                    border: '1px solid #e5e7eb',
                                    fontSize: '14px',
                                    outline: 'none',
                                    transition: 'border-color 0.2s',
                                }}
                                onFocus={(e) => e.currentTarget.style.borderColor = '#667eea'}
                                onBlur={(e) => e.currentTarget.style.borderColor = '#e5e7eb'}
                            />
                            <button
                                onClick={handleSendMessage}
                                disabled={!inputMessage.trim()}
                                style={{
                                    width: '44px',
                                    height: '44px',
                                    borderRadius: '50%',
                                    border: 'none',
                                    background: inputMessage.trim()
                                        ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                                        : '#e5e7eb',
                                    color: 'white',
                                    cursor: inputMessage.trim() ? 'pointer' : 'not-allowed',
                                    fontSize: '18px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    transition: 'all 0.2s',
                                }}
                            >
                                ➤
                            </button>
                        </div>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% { box-shadow: 0 8px 24px rgba(102, 126, 234, 0.4); }
          50% { box-shadow: 0 8px 32px rgba(102, 126, 234, 0.6); }
        }
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-8px); }
        }
      `}</style>
        </>
    );
};

export default PageBot;
