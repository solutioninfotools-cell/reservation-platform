import { useCallback, useEffect, useState } from 'react';
import { assistantApi } from '../api/public.api';

export type AssistantMessage = { role: 'user' | 'assistant'; content: string };

const ACCUEIL: Record<'public' | 'pro', string> = {
  public: "Bonjour 👋 Posez-moi une question sur les services, les horaires, l'adresse ou la prise de rendez-vous.",
  pro: "Bonjour 👋 Je peux résumer votre agenda, retrouver un client ou faire le point sur votre activité.",
};

/**
 * Discussion avec l'Assistant IA.
 *
 * Il n'y a volontairement **pas** de paramètre `professionnelId` : le backend
 * refuse qu'un appelant désigne lui-même le professionnel dont il veut les
 * données. En mode `public`, le serveur résout le professionnel de l'espace ;
 * en mode `pro`, il le déduit du jeton de session. Un identifiant envoyé depuis
 * le navigateur serait ignoré — autant ne pas en donner l'illusion.
 */
export function useAssistant(mode: 'public' | 'pro' = 'public', accueil?: string) {
  const premier = (): AssistantMessage[] => [{ role: 'assistant', content: accueil || ACCUEIL[mode] }];

  const [messages, setMessages] = useState<AssistantMessage[]>(premier);
  const [loading, setLoading] = useState(false);

  // L'accueil peut arriver après coup — le prénom du professionnel n'est connu
  // qu'une fois son profil chargé. Tant que personne n'a écrit, on le remplace ;
  // dès qu'une conversation existe, on n'y touche plus.
  useEffect(() => {
    if (!accueil) return;
    setMessages((m) => (m.length === 1 && m[0].role === 'assistant' ? [{ role: 'assistant', content: accueil }] : m));
  }, [accueil]);

  const send = useCallback(
    async (question: string) => {
      const q = question.trim();
      if (!q || loading) return;

      setMessages((m) => [...m, { role: 'user', content: q }]);
      setLoading(true);
      try {
        const { answer } = mode === 'pro' ? await assistantApi.askPro(q) : await assistantApi.ask(q);
        setMessages((m) => [...m, { role: 'assistant', content: answer }]);
      } catch (err: any) {
        // Le backend retombe déjà sur son moteur local en cas de panne de l'IA :
        // arriver ici signifie que la requête elle-même n'a pas abouti.
        const statut = err?.response?.status;
        setMessages((m) => [
          ...m,
          {
            role: 'assistant',
            content:
              statut === 401 || statut === 403
                ? 'Votre session a expiré. Reconnectez-vous pour continuer.'
                : "L'assistant est momentanément indisponible. Réessayez dans un instant.",
          },
        ]);
      } finally {
        setLoading(false);
      }
    },
    [mode, loading],
  );

  const reset = useCallback(() => setMessages(premier()), [mode, accueil]);

  return { messages, send, reset, loading };
}
