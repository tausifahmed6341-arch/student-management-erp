import React, { useState, useRef, useEffect } from 'react';
import Markdown from 'react-markdown';
import { useAuth } from '../../context/AuthContext';
import {
  Sparkles,
  X,
  Send,
  Bot,
  User as UserIcon,
  Maximize2,
  Minimize2,
  ChevronDown,
  BrainCircuit,
  Loader2,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  content: string;
  timestamp: string;
  source?: string;
}

export const AIChatWidget: React.FC = () => {
  const { token, user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome_msg',
      sender: 'assistant',
      content: `Hello **${user?.name || 'there'}**! I am your AI ERP Copilot. I have loaded your **${user?.role.toUpperCase()}** permissions and active university records. How can I help you today?`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      source: 'gemini-3.7-flash',
    },
  ]);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const getQuickChips = () => {
    if (user?.role === 'student') {
      return [
        'Why is my attendance low & what is my exam risk?',
        'Explain my GPA calculation and credit breakdown',
        'Check my timetable for upcoming laboratory classes',
        'Predict semester 5 syllabus completion timeline',
      ];
    }
    if (user?.role === 'faculty') {
      return [
        'Predict syllabus velocity & exam readiness date',
        'Check faculty timetable conflicts for upcoming week',
        'Draft a student absence reminder for low attendance',
        'Summarize class grading and assessment performance',
      ];
    }
    return [
      'Generate university attendance & retention diagnostic',
      'Check entire semester timetable for room collisions',
      'Audit outstanding fee balances across batches',
      'Simulate biometric check-in log ingestion pipeline',
    ];
  };

  const handleSend = async (textToSend?: string) => {
    const prompt = textToSend || input;
    if (!prompt.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `msg_user_${Date.now()}`,
      sender: 'user',
      content: prompt,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai/query', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt }),
      });

      if (res.ok) {
        const data = await res.json();
        const assistantMsg: ChatMessage = {
          id: `msg_ai_${Date.now()}`,
          sender: 'assistant',
          content: data.response || 'No response generated.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          source: data.source,
        };
        setMessages((prev) => [...prev, assistantMsg]);
      } else {
        const errorMsg: ChatMessage = {
          id: `msg_err_${Date.now()}`,
          sender: 'assistant',
          content: 'Unable to reach AI assistant. Please try again.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        };
        setMessages((prev) => [...prev, errorMsg]);
      }
    } catch (err) {
      console.error('AI Query failed:', err);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          id="erp_ai_chat_toggle_btn"
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 px-4 py-3 bg-black hover:bg-neutral-800 text-white rounded-full shadow-xl font-semibold text-xs tracking-wide transition-transform hover:scale-105 cursor-pointer border border-zinc-700"
        >
          <Sparkles className="w-4 h-4 text-white animate-spin-slow" />
          <span>AI Institutional Copilot</span>
          <span className="bg-zinc-800 text-[10px] px-2 py-0.5 rounded-full border border-zinc-700 font-mono">
            {user?.role}
          </span>
        </button>
      )}

      {/* Floating Chat Modal */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            id="erp_ai_chat_modal"
            className={`fixed z-50 bg-white border border-slate-300 shadow-2xl rounded-2xl flex flex-col overflow-hidden transition-all duration-300 ${
              isExpanded
                ? 'bottom-4 right-4 left-4 sm:left-auto sm:w-[680px] h-[85vh]'
                : 'bottom-6 right-6 w-[92vw] sm:w-[420px] h-[540px]'
            }`}
          >
            {/* Header */}
            <div className="bg-black text-white px-5 py-3.5 flex items-center justify-between border-b border-zinc-800">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg bg-zinc-800 border border-zinc-700 flex items-center justify-center font-bold text-white shadow-xs text-xs">
                  AI
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-xs font-bold text-white tracking-tight">Institutional Copilot</h3>
                    <span className="text-[9px] px-1.5 py-0.5 rounded bg-zinc-800 text-slate-300 font-mono border border-zinc-700">
                      Gemini 3.7
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    RBAC Context: <span className="text-white font-semibold uppercase">{user?.role}</span>
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-1">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                  title={isExpanded ? 'Minimize' : 'Expand'}
                >
                  {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded transition-colors cursor-pointer"
                  title="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Chat Body */}
            <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-[#F8FAFC] text-xs">
              {messages.map((m) => {
                const isUser = m.sender === 'user';
                return (
                  <div
                    key={m.id}
                    className={`flex items-start gap-2.5 ${isUser ? 'flex-row-reverse' : 'flex-row'}`}
                  >
                    <div
                      className={`w-6 h-6 rounded flex items-center justify-center shrink-0 text-white text-[10px] font-bold ${
                        isUser ? 'bg-black' : 'bg-slate-700'
                      }`}
                    >
                      {isUser ? 'U' : 'AI'}
                    </div>
                    <div
                      className={`max-w-[85%] rounded-xl px-3.5 py-2.5 leading-relaxed shadow-xs ${
                        isUser
                          ? 'bg-slate-200 text-slate-900 border border-slate-300 rounded-tr-none'
                          : 'bg-white text-slate-900 border border-slate-200 rounded-tl-none'
                      }`}
                    >
                      <div className="markdown-body prose prose-xs max-w-none text-xs text-slate-900">
                        <Markdown>{m.content}</Markdown>
                      </div>
                      <div className="flex items-center justify-end gap-1 mt-1 text-[9px] text-slate-400 font-mono">
                        <span>{m.timestamp}</span>
                      </div>
                    </div>
                  </div>
                );
              })}

              {isLoading && (
                <div className="flex items-center gap-2 text-slate-600 text-xs py-2">
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                  <span>Synthesizing live ERP records & academic diagnostic...</span>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompt Chips */}
            <div className="px-3 py-2 border-t border-slate-200 bg-white overflow-x-auto flex items-center gap-1.5 scrollbar-none">
              <span className="text-[10px] font-semibold text-slate-500 shrink-0">Prompts:</span>
              {getQuickChips().map((chip, i) => (
                <button
                  key={i}
                  onClick={() => handleSend(chip)}
                  disabled={isLoading}
                  className="shrink-0 px-2.5 py-1 rounded-full text-[11px] bg-slate-100 hover:bg-slate-200 hover:text-black text-slate-700 border border-slate-200 transition-colors cursor-pointer"
                >
                  {chip}
                </button>
              ))}
            </div>

            {/* Input Bar */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="p-3 border-t border-slate-200 bg-white flex items-center gap-2"
            >
              <input
                id="erp_ai_chat_input"
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder={`Ask ERP Copilot (${user?.role} perspective)...`}
                disabled={isLoading}
                className="flex-1 px-3.5 py-2 bg-slate-100 border border-slate-300 rounded-xl text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-black"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="p-2 bg-black hover:bg-neutral-800 disabled:opacity-50 text-white rounded-xl transition-colors cursor-pointer"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};
