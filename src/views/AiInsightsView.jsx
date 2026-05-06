import React, { useState, useRef, useEffect } from 'react';
import { Send, Trash2 } from 'lucide-react';
import { generateAiResponse } from '../utils.js';

const PROMPT_CHIPS = [
  'Summarize my spending',
  'How can I save more?',
  "What's my top expense?",
  'Compare last two months',
];

function AiMessage({ msg }) {
  const isUser = msg.role === 'user';
  const time = new Intl.DateTimeFormat('en-IN', { hour: '2-digit', minute: '2-digit' }).format(new Date(msg.timestamp));
  return (
    <div className={`flex gap-2 mb-4 ${isUser ? 'flex-row-reverse' : ''}`}>
      {!isUser && (
        <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0 mt-0.5">✨</div>
      )}
      <div className={`max-w-[80%] flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
        <div className={`px-4 py-2.5 rounded-2xl text-sm whitespace-pre-wrap ${isUser ? 'bg-[#6C63FF] text-white rounded-br-sm' : 'bg-white border border-gray-100 text-gray-800 rounded-bl-sm shadow-sm ss-card ss-text'}`}>
          {msg.text}
        </div>
        <span className="text-[10px] text-gray-300 mt-1 px-1">{time}</span>
      </div>
    </div>
  );
}

function TypingIndicator() {
  return (
    <div className="flex gap-2 mb-4">
      <div className="w-7 h-7 rounded-full bg-indigo-100 flex items-center justify-center text-sm flex-shrink-0">✨</div>
      <div className="bg-white border border-gray-100 rounded-2xl rounded-bl-sm px-4 py-3 shadow-sm flex items-center gap-1 ss-card">
        {[0, 0.2, 0.4].map((d, i) => (
          <div key={i} className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-dot-bounce" style={{ animationDelay: `${d}s` }} />
        ))}
      </div>
    </div>
  );
}

export default function AiInsightsView({ expenses, lendings, settings }) {
  const [chatInput, setChatInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [chatHistory, setChatHistory] = useState([{
    id: 'welcome',
    role: 'ai',
    text: 'Hi! I can analyze your SpendSense data. Ask me anything about your spending, lendings, or savings goals!',
    timestamp: new Date().toISOString(),
  }]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory, isTyping]);

  const send = (overrideText) => {
    const text = typeof overrideText === 'string' ? overrideText.trim() : chatInput.trim();
    if (!text) return;
    if (isTyping) return;
    setChatHistory(h => [...h, { id: Math.random().toString(36).slice(2), role: 'user', text, timestamp: new Date().toISOString() }]);
    setChatInput('');
    setIsTyping(true);
    setTimeout(() => {
      const reply = generateAiResponse(text, expenses, lendings, settings);
      setChatHistory(h => [...h, { id: Math.random().toString(36).slice(2), role: 'ai', text: reply, timestamp: new Date().toISOString() }]);
      setIsTyping(false);
    }, 1200);
  };

  const clearChat = () => {
    setChatHistory([{
      id: 'welcome',
      role: 'ai',
      text: 'Hi! I can analyze your SpendSense data. Ask me anything about your spending, lendings, or savings goals!',
      timestamp: new Date().toISOString(),
    }]);
    setChatInput('');
  };

  return (
    <div className="flex flex-col h-full animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-white flex-shrink-0 ss-card ss-divider">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-indigo-100 flex items-center justify-center text-base">✨</div>
          <div>
            <p className="text-sm font-semibold text-gray-900 ss-text">SpendSense AI</p>
            <p className="text-[10px] text-green-500 font-medium">● Always available</p>
          </div>
        </div>
        <button
          onClick={clearChat}
          aria-label="Clear chat"
          className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-400 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"
        >
          <Trash2 size={16} />
        </button>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 scrollbar-hide">
        {chatHistory.map(m => <AiMessage key={m.id} msg={m} />)}

        {/* Prompt chips — shown only when chatHistory.length === 1 (just the welcome message) */}
        {chatHistory.length === 1 && (
          <div className="flex flex-wrap gap-2 mb-4 ml-9">
            <button onClick={() => send('Summarize my spending')}
              className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-3 py-1.5 font-medium active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500">
              📊 Summarize my spending
            </button>
            <button onClick={() => send('How can I save more?')}
              className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-3 py-1.5 font-medium active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500">
              💡 How can I save more?
            </button>
            <button onClick={() => send("What's my top expense?")}
              className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-3 py-1.5 font-medium active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500">
              🏆 What's my top expense?
            </button>
            <button onClick={() => send('Compare last two months')}
              className="text-xs bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-full px-3 py-1.5 font-medium active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500">
              📅 Compare last two months
            </button>
          </div>
        )}

        {isTyping && <TypingIndicator />}
        <div ref={messagesEndRef} />
      </div>

      {/* Input — always in DOM, never conditionally hidden */}
      <div className="flex-shrink-0 bg-white border-t border-gray-100 px-4 py-3 flex gap-2 ss-card ss-divider">
        <input
          type="text"
          value={chatInput}
          onChange={e => setChatInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && send()}
          placeholder="Ask about your spending..."
          aria-label="Chat message input"
          disabled={isTyping}
          className="flex-1 bg-gray-50 rounded-full px-4 py-2.5 text-sm outline-none border border-gray-100 focus-visible:ring-2 focus-visible:ring-indigo-500 ss-input disabled:opacity-50"
        />
        <button
          onClick={() => send()}
          aria-label="Send message"
          disabled={isTyping}
          className="w-10 h-10 rounded-full bg-[#6C63FF] text-white flex items-center justify-center active:scale-95 transition-transform disabled:opacity-50 disabled:pointer-events-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
}
