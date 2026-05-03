import { useState } from 'react';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

interface Props {
  ingredients: { id: number; name: string }[];
  onAddToCart: (ingredientId: number) => void;
}

export const AIAgent = ({ ingredients, onAddToCart }: Props) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Hello! I am Burger AI 🍔 Tell me what you want and I will build your order!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);

  const sendMessage = async (text: string) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setLoading(true);
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text, menuItems: ingredients }),
      });
      const data = await res.json() as { reply: string };
      setMessages(prev => [...prev, { role: 'agent', text: data.reply }]);
      ingredients.forEach(ing => {
        if (data.reply.toLowerCase().includes(ing.name.toLowerCase())) {
          onAddToCart(ing.id);
        }
      });
    } catch {
      setMessages(prev => [...prev, { role: 'agent', text: 'Something went wrong, please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', bottom: '24px', right: '24px', width: '340px',
      background: '#fff', borderRadius: '16px',
      boxShadow: '0 8px 32px rgba(0,0,0,0.15)',
      display: 'flex', flexDirection: 'column', overflow: 'hidden',
      fontFamily: 'sans-serif', zIndex: 1000
    }}>
      <div style={{ background: '#e63946', padding: '14px 18px', color: '#fff' }}>
        <strong>🍔 Burger AI Agent</strong>
        <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.85 }}>Type your order</p>
      </div>
      <div style={{ height: '280px', overflowY: 'auto', padding: '12px', background: '#f9f9f9' }}>
        {messages.map((msg, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start', marginBottom: '8px' }}>
            <div style={{
              maxWidth: '80%', padding: '8px 12px', borderRadius: '12px',
              background: msg.role === 'user' ? '#e63946' : '#fff',
              color: msg.role === 'user' ? '#fff' : '#333',
              fontSize: '13px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
            }}>{msg.text}</div>
          </div>
        ))}
        {loading && <div style={{ textAlign: 'center', fontSize: '12px', color: '#999' }}>Thinking...</div>}
      </div>
      <div style={{ display: 'flex', padding: '10px', gap: '6px', borderTop: '1px solid #eee' }}>
        <input
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
          placeholder="E.g: two large burgers..."
          style={{ flex: 1, padding: '8px 12px', borderRadius: '8px', border: '1px solid #ddd', fontSize: '13px', outline: 'none' }}
        />
        <button
          onClick={() => sendMessage(input)}
          style={{ padding: '8px 12px', borderRadius: '8px', background: '#e63946', color: '#fff', border: 'none', cursor: 'pointer', fontSize: '13px' }}
        >→</button>
      </div>
    </div>
  );
};

export default AIAgent;