'use client';

import { useState, useRef, useEffect } from 'react';
import MessageBubble from './message-bubble';
import SQLViewer from './sql-viewer';
import ResultTable from './result-table';
import AutoChart from './auto-chart';
import QueryHistory from './query-history';

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sql?: string | null;
  results?: Record<string, unknown>[] | null;
  suggestedChart?: string | null;
  explanation?: string;
}

const EXAMPLES = [
  'Quantas conversas tivemos nos últimos 7 dias?',
  'Qual a categoria mais consultada este mês?',
  'Mostre os feedbacks com 1 estrela da última semana',
  'Qual o tempo médio de resposta por dia?',
  'Quais usuários mais utilizaram o sistema?',
];

export default function ChatInterface() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [queryLog, setQueryLog] = useState<
    { message: string; sql: string }[]
  >([]);
  const [showHistory, setShowHistory] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;

    const userMsg: ChatMessage = { role: 'user', content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const history = messages
        .filter((m) => m.role === 'user' || m.role === 'assistant')
        .map((m) => ({ role: m.role, content: m.content }));

      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, history }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessages((prev) => [
          ...prev,
          {
            role: 'assistant',
            content: data.error || 'Erro ao processar mensagem',
          },
        ]);
        return;
      }

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: data.explanation || 'Resultado:',
        sql: data.sql,
        results: data.results,
        suggestedChart: data.suggestedChart,
        explanation: data.explanation,
      };

      setMessages((prev) => [...prev, assistantMsg]);

      if (data.sql) {
        setQueryLog((prev) => [...prev, { message: text, sql: data.sql }]);
      }
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: 'assistant', content: 'Erro de conexão. Tente novamente.' },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex gap-4 h-[calc(100vh-140px)] overflow-hidden">
      <div className="flex-1 min-w-0 flex flex-col bg-white rounded-lg shadow">
        {/* Messages area */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-500 mb-4">
                Converse com a IA para gerar queries SQL customizadas.
              </p>
              <div className="space-y-2">
                {EXAMPLES.map((ex, i) => (
                  <button
                    key={i}
                    onClick={() => sendMessage(ex)}
                    className="block w-full text-left px-4 py-2 text-sm text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    {ex}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((msg, i) => (
            <div key={i}>
              <MessageBubble role={msg.role} content={msg.content} />
              {msg.sql && <SQLViewer sql={msg.sql} />}
              {msg.results && msg.results.length > 0 && (
                <>
                  {msg.suggestedChart && msg.suggestedChart !== 'table' && (
                    <div className="mt-2">
                      <AutoChart
                        data={msg.results}
                        chartType={msg.suggestedChart}
                      />
                    </div>
                  )}
                  <div className="mt-2">
                    <ResultTable data={msg.results} />
                  </div>
                </>
              )}
            </div>
          ))}

          {loading && (
            <div className="flex items-center gap-2 text-gray-400 text-sm">
              <div className="animate-spin w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full" />
              Pensando...
            </div>
          )}
          <div ref={endRef} />
        </div>

        {/* Input area */}
        <div className="border-t p-4">
          <div className="flex gap-2">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage(input)}
              placeholder="Faça uma pergunta sobre os dados..."
              className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={loading}
              autoFocus
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={loading || !input.trim()}
              className="px-4 py-2 bg-blue-600 text-white text-sm rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              Enviar
            </button>
            <button
              onClick={() => setShowHistory(!showHistory)}
              className="px-3 py-2 text-gray-500 border rounded-lg hover:bg-gray-50 text-sm"
              title="Histórico de queries"
            >
              H
            </button>
          </div>
        </div>
      </div>

      {/* Query History Panel */}
      {showHistory && (
        <QueryHistory
          queries={queryLog}
          onSelect={(q) => sendMessage(q.message)}
          onClose={() => setShowHistory(false)}
        />
      )}
    </div>
  );
}
