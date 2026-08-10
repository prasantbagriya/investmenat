import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { MessageSquare, X, Send, Bot, User, Sparkles, Loader2 } from 'lucide-react';
import { proxyFetch } from '../../utils/proxyFetch';
import { PhysicalAsset, BankAccount, Transaction } from '../../types';
import ReactMarkdown from 'react-markdown';

interface ChatAssistantProps {
  bankAccounts: BankAccount[];
  transactions: Transaction[];
  physicalAssets: PhysicalAsset[];
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
}

export default function ChatAssistant({ bankAccounts, transactions, physicalAssets }: ChatAssistantProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([{
    role: 'assistant',
    content: "Hi! I'm your InvestMant AI Assistant. Ask me anything about your finances, budgets, or investments!"
  }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setIsLoading(true);

    try {
      // Build context
      const balances = bankAccounts.map(b => `${b.bankName}: ₹${b.currentBalance}`).join(', ');
      const assetsTotal = physicalAssets.reduce((sum, a) => sum + a.currentValue, 0);
      const recentTransactions = transactions.slice(0, 10).map(t => `${t.date}: ${t.type === 'expense' ? '-' : '+'}₹${t.amount} (${t.category} - ${t.notes || ''})`).join('\n');

      const contextStr = `Bank Balances: ${balances}\nTotal Physical Assets Value: ₹${assetsTotal}\nRecent Transactions:\n${recentTransactions}`;

      const res = await proxyFetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: userMessage, context: contextStr })
      });

      if (!res.ok) throw new Error('Failed to get response');
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply || "Sorry, I couldn't understand that." }]);
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: "⚠️ Sorry, an error occurred while connecting to my brain." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 p-4 bg-slate-900 text-white rounded-full shadow-md hover:bg-slate-950 transition-colors flex items-center justify-center group"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            className="fixed bottom-6 right-6 z-50 w-full max-w-[350px] h-[450px] max-h-[80vh] bg-white rounded-lg shadow-lg border border-gray-200 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="px-4 py-3 bg-slate-900 text-white flex justify-between items-center shrink-0">
              <div className="flex items-center gap-2">
                <Bot className="w-5 h-5" />
                <h3 className="font-semibold text-sm">InvestMant Assistant</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="p-1 hover:bg-slate-950 rounded transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Messages Area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                  <div className={`shrink-0 w-6 h-6 rounded-full flex items-center justify-center text-xs ${msg.role === 'user' ? 'bg-slate-200 text-slate-900' : 'bg-gray-200 text-gray-600'}`}>
                    {msg.role === 'user' ? <User className="w-3 h-3" /> : <Bot className="w-3 h-3" />}
                  </div>
                  <div className={`max-w-[80%] px-3 py-2 text-sm rounded-lg ${msg.role === 'user' ? 'bg-slate-900 text-white' : 'bg-white border border-gray-200 text-gray-800'}`}>
                    {msg.role === 'user' ? (
                      msg.content
                    ) : (
                      <div className="prose prose-sm prose-p:my-1">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    )}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex items-end gap-2">
                  <div className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center bg-gray-200 text-gray-600">
                    <Bot className="w-3 h-3" />
                  </div>
                  <div className="bg-white border border-gray-200 px-3 py-2 rounded-lg">
                    <Loader2 className="w-4 h-4 text-slate-500 animate-spin" />
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-gray-200 shrink-0">
              <form onSubmit={handleSend} className="flex items-center gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Type a message..."
                  className="flex-1 bg-gray-50 border border-gray-300 rounded text-sm px-3 py-2 focus:outline-none focus:border-slate-500"
                  disabled={isLoading}
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="p-2 bg-slate-900 text-white rounded hover:bg-slate-950 disabled:opacity-50 transition-colors"
                >
                  <Send className="w-4 h-4" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
