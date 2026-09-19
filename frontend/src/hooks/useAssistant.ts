import { useState, useCallback } from 'react';
import { assistantApi } from '../api/public.api';

export type AssistantMessage = { role: 'user' | 'assistant'; content: string };

export function useAssistant(professionnelId?: string, mode: 'public' | 'pro' = 'public') {
  const [messages, setMessages] = useState<AssistantMessage[]>([
    { role: 'assistant', content: "Bonjour 👋 Comment puis-je vous aider aujourd'hui ?" },
  ]);
  const [loading, setLoading] = useState(false);

  const send = useCallback(async (question: string) => {
    if (!question.trim()) return;
    setMessages((m) => [...m, { role: 'user', content: question }]);
    setLoading(true);
    try {
      const { answer } = await assistantApi.ask(question, professionnelId, mode);
      setMessages((m) => [...m, { role: 'assistant', content: answer }]);
    } catch {
      setMessages((m) => [...m, { role: 'assistant', content: 'Désolé, une erreur est survenue.' }]);
    } finally {
      setLoading(false);
    }
  }, [professionnelId, mode]);

  return { messages, send, loading };
}