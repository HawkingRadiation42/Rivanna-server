import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, Sparkles, Lightbulb, Clock, Zap, Copy, CheckCircle2 } from 'lucide-react';
import { clusterAPI } from '../utils/api';
import type { ChatMessage, OptimizationResponse } from '../types';

const suggestedPrompts = [
  {
    icon: Lightbulb,
    title: 'Optimize my job',
    prompt: 'I need to run a job with 16 CPUs, 2 GPUs, and 64GB RAM for 24 hours. Which partition should I use and how can I optimize it?',
  },
  {
    icon: Clock,
    title: 'Estimate wait time',
    prompt: 'What is the current wait time for GPU jobs on the gpu-a40 partition?',
  },
  {
    icon: Zap,
    title: 'Cluster status',
    prompt: 'What is the current status of the cluster? Are there any bottlenecks?',
  },
];

export default function AIAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hello! I\'m RivannaAI, your HPC cluster assistant. I can help you optimize job submissions, estimate wait times, and understand cluster status. What would you like to know?',
      timestamp: new Date(),
    },
  ]);
  const [input, setInput] = useState('');
  const [placeholderText, setPlaceholderText] = useState('Ask me anything about the cluster...');
  const [isTyping, setIsTyping] = useState(false);
  const [lastRecommendation, setLastRecommendation] = useState<OptimizationResponse | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input,
      timestamp: new Date(),
    };

    const currentInput = input;
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setPlaceholderText('Ask me anything about the cluster...');
    setIsTyping(true);

    try {
      // Call the GPT-4 optimization endpoint
      const response = await clusterAPI.optimizeJob(currentInput, messages);

      if (response.success) {
        const aiResponse: ChatMessage = {
          role: 'assistant',
          content: response.natural_language,
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, aiResponse]);
        setLastRecommendation(response);
      } else {
        const errorResponse: ChatMessage = {
          role: 'assistant',
          content: response.error || 'Sorry, I encountered an error processing your request. Please try again.',
          timestamp: new Date(),
        };
        setMessages(prev => [...prev, errorResponse]);
      }
    } catch (error) {
      console.error('Failed to get AI response:', error);
      const errorResponse: ChatMessage = {
        role: 'assistant',
        content: 'Sorry, I\'m having trouble connecting to the AI service. Please ensure the backend is running and try again.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, errorResponse]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSuggestedPrompt = (prompt: string) => {
    setPlaceholderText(prompt);
  };

  return (
    <div className="h-screen flex flex-col bg-dark" style={{ backgroundColor: '#000000' }}>
      {/* Header */}
      <motion.div
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6 border-b border-dark-border/20 bg-dark"
      >
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 bg-[#D65737] rounded-lg flex items-center justify-center">
            <Bot className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-light text-text-primary flex items-center gap-2">
              AI Job Assistant
              <Sparkles className="w-5 h-5 text-[#D65737] animate-pulse" />
            </h1>
            <p className="text-sm text-text-secondary/70 font-light">Powered by Claude AI</p>
          </div>
        </div>
      </motion.div>

      {/* Suggested Prompts (shown when no messages) */}
      {messages.length <= 1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6"
        >
          <h3 className="text-sm font-light text-text-secondary/70 mb-4 uppercase">Suggested prompts:</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {suggestedPrompts.map((item, idx) => (
              <motion.button
                key={idx}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.1 }}
                onClick={() => handleSuggestedPrompt(item.prompt)}
                className="card-hover p-4 text-left group"
              >
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 bg-[#D65737]/10 rounded-lg flex items-center justify-center group-hover:bg-[#D65737]/20 transition-colors">
                    <item.icon className="w-5 h-5 text-[#D65737]" />
                  </div>
                  <div className="flex-1">
                    <h4 className="font-light text-text-primary mb-1 group-hover:text-[#D65737] transition-colors">
                      {item.title}
                    </h4>
                    <p className="text-xs text-text-secondary/70 line-clamp-2 font-light">{item.prompt}</p>
                  </div>
                </div>
              </motion.button>
            ))}
          </div>
        </motion.div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <AnimatePresence>
          {messages.map((message, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className={`flex gap-4 ${message.role === 'user' ? 'flex-row-reverse' : ''}`}
            >
              {/* Avatar */}
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
                message.role === 'user'
                  ? 'bg-[#D65737]'
                  : 'bg-gradient-to-br from-purple-500 to-blue-500'
              }`}>
                {message.role === 'user' ? (
                  <User className="w-5 h-5 text-white" />
                ) : (
                  <Bot className="w-5 h-5 text-white" />
                )}
              </div>

              {/* Message Content */}
              <div className={`flex-1 ${message.role === 'user' ? 'flex justify-end' : ''}`}>
                <div className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-[#D65737] text-white rounded-2xl rounded-tr-sm'
                    : 'bg-dark border border-dark-border/30 rounded-2xl rounded-tl-sm'
                } p-4`}>
                  <div className={`prose prose-sm ${message.role === 'assistant' ? 'prose-invert' : ''} max-w-none font-light`}>
                    {message.content.split('\n').map((line, i) => {
                      // Handle markdown-style bold
                      if (line.startsWith('**') && line.endsWith('**')) {
                        return (
                          <p key={i} className="font-medium my-2">
                            {line.replace(/\*\*/g, '')}
                          </p>
                        );
                      }
                      // Handle list items
                      if (line.match(/^\d+\./)) {
                        return (
                          <p key={i} className="ml-4 my-1 font-light">
                            {line}
                          </p>
                        );
                      }
                      // Regular paragraphs
                      return line ? <p key={i} className="my-2 font-light">{line}</p> : <br key={i} />;
                    })}
                  </div>
                  <div className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-white/50' : 'text-text-muted/70'
                  }`}>
                    {message.timestamp.toLocaleTimeString()}
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        {isTyping && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-4"
          >
            <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
              <Bot className="w-5 h-5 text-white" />
            </div>
            <div className="bg-dark border border-dark-border/30 rounded-2xl rounded-tl-sm p-4">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-[#D65737] rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-2 bg-[#D65737] rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-2 bg-[#D65737] rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Recommendation Display */}
        {lastRecommendation && lastRecommendation.recommendation && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-6"
          >
          <div className="bg-gradient-to-br from-[#D65737]/10 to-purple-500/10 border border-[#D65737]/30 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#D65737]" />
                Recommended Configuration
              </h3>
              <button
                onClick={() => {
                  const config = lastRecommendation.recommendation!;
                  const script = `#!/bin/bash
#SBATCH --partition=${config.partition}
${config.gpu_type ? `#SBATCH --gres=gpu:${config.gpu_type.toLowerCase()}:${config.gpu_count || 1}` : ''}
#SBATCH --cpus-per-task=${config.cpu_count}
#SBATCH --mem=${config.memory_gb}G
#SBATCH --time=${config.time_limit}

# Your job commands here`;
                  navigator.clipboard.writeText(script);
                }}
                className="btn-secondary text-xs px-3 py-1 flex items-center gap-1"
              >
                <Copy className="w-3 h-3" />
                Copy SLURM Script
              </button>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <div className="bg-dark/50 rounded p-2">
                <div className="text-xs text-text-secondary/70">Partition</div>
                <div className="text-sm font-medium text-text-primary">{lastRecommendation.recommendation.partition}</div>
              </div>
              {lastRecommendation.recommendation.gpu_type && (
                <div className="bg-dark/50 rounded p-2">
                  <div className="text-xs text-text-secondary/70">GPU Type</div>
                  <div className="text-sm font-medium text-text-primary">{lastRecommendation.recommendation.gpu_type} × {lastRecommendation.recommendation.gpu_count}</div>
                </div>
              )}
              <div className="bg-dark/50 rounded p-2">
                <div className="text-xs text-text-secondary/70">CPUs</div>
                <div className="text-sm font-medium text-text-primary">{lastRecommendation.recommendation.cpu_count}</div>
              </div>
              <div className="bg-dark/50 rounded p-2">
                <div className="text-xs text-text-secondary/70">Memory</div>
                <div className="text-sm font-medium text-text-primary">{lastRecommendation.recommendation.memory_gb} GB</div>
              </div>
              <div className="bg-dark/50 rounded p-2">
                <div className="text-xs text-text-secondary/70">Time Limit</div>
                <div className="text-sm font-medium text-text-primary">{lastRecommendation.recommendation.time_limit}</div>
              </div>
            </div>

            {lastRecommendation.recommendation.reasoning && (
              <div className="mt-3 pt-3 border-t border-dark-border/30">
                <div className="text-xs text-text-secondary/70 mb-1">Reasoning:</div>
                <div className="text-sm text-text-primary/90">{lastRecommendation.recommendation.reasoning}</div>
              </div>
            )}
          </div>
          </motion.div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="p-6 border-t border-dark-border/20 bg-dark"
      >
        <div className="flex gap-3">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSend()}
            placeholder={placeholderText}
            className="input flex-1"
            disabled={isTyping}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isTyping}
            className="btn-primary px-6 flex items-center gap-2"
          >
            <Send className="w-4 h-4" />
            Send
          </button>
        </div>
        <p className="text-xs text-text-muted/70 mt-3 text-center font-light">
          AI-powered assistance • Responses may take a few moments
        </p>
      </motion.div>
    </div>
  );
}
