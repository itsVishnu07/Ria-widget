import React, { useState, useEffect, useRef } from 'react';

const STORAGE_KEY = 'ria_wellness_session';

const RiaChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  
  const textareaRef = useRef(null);
  const scrollRef = useRef(null);

  // 1. Persistence: Restore from localStorage
  useEffect(() => {
    const savedData = localStorage.getItem(STORAGE_KEY);
    if (savedData) {
      try {
        const parsed = JSON.parse(savedData);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setMessages(parsed);
          return;
        }
      } catch (e) { console.warn("Session restore failed."); }
    }
    // Default product opening message
    setMessages([{
      role: 'assistant',
      content: "Hi there. I'm Ria. I'm here to help you find a bit of balance today—whether you're looking for a workout, a moment of mindfulness, or just a healthy tip. How are you feeling in your body right now?",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      confidence: 1
    }]);
  }, []);

  // 2. Persistence: Save to localStorage (Exclude errors/loading)
  useEffect(() => {
    if (messages.length > 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(messages));
    }
    scrollRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading, error]);

  const handleSend = async (retryText = null) => {
    const textContent = retryText || input;
    if (!textContent.trim() || isLoading) return;

    const userMsg = {
      role: 'user',
      content: textContent,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      // Mock API expects full history
      const history = messages.concat(userMsg).map(({role, content}) => ({role, content}));
      const reply = await window.sendMessage(history);

      setMessages(prev => [...prev, {
        role: 'assistant',
        content: reply.text,
        confidence: reply.confidence,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      
      // Auto-refocus after reply
      setTimeout(() => textareaRef.current?.focus(), 50);
    } catch (err) {
      setError(textContent); // Store for retry
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans">
      {/* Floating Toggle (Desktop Only) */}
      {!isOpen && (
        <button 
          onClick={() => setIsOpen(true)}
          className="hidden md:flex w-16 h-16 rounded-full bg-[var(--primary)] text-white items-center justify-center shadow-lg hover:scale-105 transition-all"
        >
          <span className="text-2xl">🌿</span>
        </button>
      )}

      {/* Main UI */}
      {(isOpen || window.innerWidth < 768) && (
        <div className={`
          ria-glass-panel flex flex-col
          fixed inset-0 md:relative md:inset-auto md:w-[380px] md:h-[520px] md:rounded-[24px] overflow-hidden
        `}>
          {/* Header */}
          <div className="px-6 py-4 border-b border-black/5 flex justify-between items-center">
            <div>
              <h1 className="text-[var(--fg-chat)] font-bold text-lg leading-tight">Ria</h1>
              <p className="text-[10px] text-[var(--primary)] uppercase font-semibold tracking-widest">Wellness Space</p>
            </div>
            <button onClick={() => setIsOpen(false)} className="md:block hidden text-[var(--fg-chat)] opacity-30 hover:opacity-100">✕</button>
          </div>

          {/* Message List */}
          <div className="flex-1 overflow-y-auto px-5 py-6 space-y-6">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex flex-col message-appear ${msg.role === 'user' ? 'items-end' : 'items-start'}`}>
                <span className="text-[10px] opacity-40 mb-1 mx-2 uppercase tracking-tighter">
                  {msg.role === 'user' ? 'You' : 'Ria'} • {msg.timestamp}
                </span>
                <div className={`
                  max-w-[88%] px-4 py-3 rounded-[16px] text-sm leading-relaxed
                  ${msg.role === 'user' 
                    ? 'bg-[var(--bubble-user)] rounded-tr-none' 
                    : 'bg-[var(--bubble-ria)] text-[var(--fg-chat)] border border-slate-100 rounded-tl-none'}
                `}>
                  <p className={msg.confidence < 0.5 ? 'italic opacity-60' : ''}>{msg.content}</p>
                  {msg.role === 'assistant' && msg.confidence < 0.5 && (
                    <div className="mt-2 pt-2 border-t border-black/5 text-[10px] opacity-50 flex items-center gap-1">
                      <span>✨</span> <i>Softly suggested for your well-being</i>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center space-x-2 px-2 animate-pulse">
                <div className="w-1.5 h-1.5 bg-[var(--primary)] rounded-full breathing-dot"></div>
                <span className="text-[11px] italic text-[var(--fg-chat)] opacity-40 font-medium">Ria is listening...</span>
              </div>
            )}

            {error && (
              <div className="flex flex-col items-end gap-2 pr-2">
                <p className="text-[11px] text-rose-500 font-medium">Something went wrong. Please try again.</p>
                <button 
                  onClick={() => handleSend(error)}
                  className="text-[11px] px-3 py-1 bg-rose-50 text-rose-600 rounded-full border border-rose-100 hover:bg-rose-100"
                >
                  Retry
                </button>
              </div>
            )}
            <div ref={scrollRef} />
          </div>

          {/* Input Area */}
          <div className="p-6 bg-white/20 border-t border-black/5">
            <div className="flex items-end gap-2 bg-[var(--muted)] rounded-[20px] p-2 pr-3 focus-within:ring-1 focus-within:ring-[var(--primary)] transition-all">
              <textarea
                ref={textareaRef}
                dir="auto"
                rows="1"
                disabled={isLoading}
                value={input}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
                onChange={(e) => setInput(e.target.value)}
                onInput={(e) => {
                  e.target.style.height = 'auto';
                  e.target.style.height = Math.min(e.target.scrollHeight, 100) + 'px';
                }}
                placeholder="Share your thoughts..."
                className="flex-1 bg-transparent border-none focus:ring-0 text-sm text-[var(--fg-chat)] py-2 px-3 resize-none min-h-[40px] max-h-[100px] disabled:opacity-40"
              />
              <button 
                onClick={() => handleSend()}
                disabled={isLoading || !input.trim()}
                className="w-10 h-10 rounded-full bg-[var(--primary)] text-white flex items-center justify-center shadow-md disabled:opacity-20 transition-all hover:scale-105 active:scale-95"
              >
                <svg width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.5" viewBox="0 0 24 24">
                  <path d="M5 12h14M12 5l7 7-7 7"/>
                </svg>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RiaChat;