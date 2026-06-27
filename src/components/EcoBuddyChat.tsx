import React, { useState, useEffect, useRef } from "react";
import { motion } from "motion/react";
import { Send, Sparkles, Bot, Trash2 } from "lucide-react";

interface Message {
  role: "user" | "model";
  parts: { text: string }[];
}

interface EcoBuddyChatProps {
  currentUserId: string;
  onRewardXP?: (xpAmount: number) => void;
}

export default function EcoBuddyChat({ currentUserId, onRewardXP }: EcoBuddyChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "model",
      parts: [{ text: "Hello! I'm Eco-Buddy, your AI cleanliness and recycling companion. 🌟 Ask me anything about how to segregate trash, composting, local civic guidelines, or how to keep our cities clean!" }]
    }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [xpClaimed, setXpClaimed] = useState(false);
  const [interactions, setInteractions] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  const sendMessage = async (textToSend?: string) => {
    const text = (textToSend || input).trim();
    if (!text) return;

    if (!textToSend) {
      setInput("");
    }

    const newUserMessage: Message = {
      role: "user",
      parts: [{ text }]
    };

    const updatedMessages = [...messages, newUserMessage];
    setMessages(updatedMessages);
    setLoading(true);

    try {
      const apiHistory = updatedMessages.slice(-15);
      
      const response = await fetch("/api/arcade/chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ history: apiHistory })
      });

      if (!response.ok) {
        throw new Error("Failed to get response from Eco-Buddy");
      }

      const data = await response.json();
      
      setMessages(prev => [
        ...prev,
        {
          role: "model",
          parts: [{ text: data.text || "I'm sorry, I couldn't process that. Could you ask in another way?" }]
        }
      ]);

      const newCount = interactions + 1;
      setInteractions(newCount);

      if (newCount === 2 && !xpClaimed) {
        setXpClaimed(true);
        try {
          const rewardResponse = await fetch(`/api/arcade/reward`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json"
            },
            body: JSON.stringify({ xp: 25 })
          });
          if (rewardResponse.ok) {
            if (onRewardXP) onRewardXP(25);
          }
        } catch (e) {
          console.error("Failed to reward chatbot XP:", e);
        }
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [
        ...prev,
        {
          role: "model",
          parts: [{ text: "🚨 Oops! I seem to be having a small communication hiccup. Please try asking again in a moment." }]
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        role: "model",
        parts: [{ text: "Hello! I'm Eco-Buddy, your AI cleanliness and recycling companion. 🌟 Ask me anything about how to segregate trash, composting, local civic guidelines, or how to keep our cities clean!" }]
      }
    ]);
  };

  const suggestionChips = [
    "What goes in the Blue bin?",
    "Tell me a composting tip!",
    "Where should I throw old batteries?",
    "Why is segregation important?"
  ];

  return (
    <div className="bg-white rounded-3xl border border-slate-200 p-6 shadow-sm space-y-4 flex flex-col min-h-[500px]">
      
      {/* HEADER */}
      <div className="flex items-center justify-between border-b border-slate-150 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center border border-emerald-200 relative">
            <Bot className="w-5 h-5" />
            <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 rounded-full border-2 border-white animate-pulse" />
          </div>
          <div>
            <h3 className="text-sm font-black text-slate-800 flex items-center gap-1.5 leading-none">
              Eco-Buddy AI
              <span className="text-[9px] font-black uppercase tracking-wider bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded">ONLINE</span>
            </h3>
            <p className="text-[11px] text-slate-400 font-semibold mt-1">
              Your municipal recycling & composting advisor
            </p>
          </div>
        </div>

        <button
          onClick={clearChat}
          title="Clear Conversation"
          className="p-2 text-slate-400 hover:text-rose-600 rounded-xl hover:bg-rose-50 transition cursor-pointer"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* CHAT MESSAGES PANEL */}
      <div 
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3.5 pr-1 max-h-[350px] min-h-[250px] scrollbar-thin scrollbar-thumb-slate-200 scrollbar-track-transparent"
      >
        {messages.map((msg, index) => {
          const isModel = msg.role === "model";
          return (
            <div
              key={index}
              className={`flex items-start gap-2.5 ${isModel ? "justify-start" : "justify-end"}`}
            >
              {isModel && (
                <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 text-xs">
                  🤖
                </div>
              )}
              
              <div
                className={`max-w-[85%] p-3 px-4 rounded-2xl text-xs md:text-sm font-semibold leading-relaxed ${
                  isModel 
                    ? "bg-slate-50 border border-slate-100 text-slate-700 rounded-tl-xs" 
                    : "bg-teal-600 text-white rounded-tr-xs shadow-xs"
                }`}
              >
                {msg.parts[0].text}
              </div>

              {!isModel && (
                <div className="w-7 h-7 rounded-lg bg-teal-50 text-teal-600 border border-teal-100 flex items-center justify-center shrink-0 text-xs">
                  👤
                </div>
              )}
            </div>
          );
        })}

        {/* LOADING INDICATOR */}
        {loading && (
          <div className="flex items-start gap-2.5 justify-start">
            <div className="w-7 h-7 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100 flex items-center justify-center shrink-0 text-xs">
              🤖
            </div>
            <div className="bg-slate-50 border border-slate-100 p-3 px-4 rounded-2xl text-xs rounded-tl-xs flex items-center gap-1.5 text-slate-400 font-bold">
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
              <span className="w-1.5 h-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
            </div>
          </div>
        )}
      </div>

      {/* DISCOVERY BONUS CLAIMED ALERTER */}
      {xpClaimed && (
        <motion.div
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-emerald-50 border border-emerald-200/50 p-2.5 px-4 rounded-xl flex items-center justify-between text-emerald-950 font-bold text-xs"
        >
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-emerald-600 animate-pulse shrink-0" />
            <span>Bonus Unlocked! <b>+25 XP</b> earned for consulting Eco-Buddy!</span>
          </div>
          <span className="text-[10px] uppercase font-black tracking-widest bg-emerald-200/50 text-emerald-800 px-2 py-0.5 rounded">CLAIMED</span>
        </motion.div>
      )}

      {/* SUGGESTIONS CHIPS */}
      <div className="space-y-1.5">
        <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Quick Suggestions</span>
        <div className="flex flex-wrap gap-1.5">
          {suggestionChips.map((chip, idx) => (
            <button
              key={idx}
              disabled={loading}
              onClick={() => sendMessage(chip)}
              className="bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 text-[11px] font-bold py-1.5 px-3 rounded-lg transition cursor-pointer disabled:opacity-50"
            >
              {chip}
            </button>
          ))}
        </div>
      </div>

      {/* INPUT FORM */}
      <form 
        onSubmit={(e) => {
          e.preventDefault();
          sendMessage();
        }}
        className="flex gap-2"
      >
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask how to dispose of batteries, medicine, composting tips..."
          disabled={loading}
          className="flex-1 bg-slate-50 hover:bg-slate-100/50 focus:bg-white border-2 border-slate-200 focus:border-teal-500 rounded-xl px-4 py-2.5 text-xs font-bold text-slate-700 outline-hidden transition placeholder:text-slate-400"
        />
        <button
          type="submit"
          disabled={!input.trim() || loading}
          className="bg-teal-600 hover:bg-teal-700 disabled:opacity-50 text-white p-2.5 px-4 rounded-xl font-black text-xs transition flex items-center justify-center gap-1.5 cursor-pointer"
        >
          <Send className="w-3.5 h-3.5" />
          <span>Send</span>
        </button>
      </form>
    </div>
  );
}
