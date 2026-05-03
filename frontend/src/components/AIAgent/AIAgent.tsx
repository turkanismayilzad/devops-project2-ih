import { useState } from 'react';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

interface Props {
  ingredients: { id: number; name: string }[];
  onAddToCart: (ingredientId: number) => void;
}

export const AIAgent = ({ ingredients }: Props) => {
  const [open, setOpen] = useState(false);
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
      const endpoint = import.meta.env.VITE_AZURE_OPENAI_ENDPOINT;
      const apiKey = import.meta.env.VITE_AZURE_OPENAI_KEY;
      const url = `${endpoint}openai/deployments/gpt-4o-mini/chat/completions?api-version=2024-02-15-preview`;

      const menuList = ingredients.length > 0
        ? ingredients.map(i => i.name).join(', ')
        : 'classic burgers, veggie burgers, cheese burgers, chicken burgers, fries, drinks';

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'api-key': apiKey,
        },
        body: JSON.stringify({
          max_tokens: 200,
          messages: [
            {
              role: 'system',
              content: `You are a friendly AI assistant for Burger Builder restaurant. 
              Help customers choose and build their perfect burger order. 
              Available menu items: ${menuList}. 
              Keep responses short, friendly and helpful. Max 2-3 sentences.`
            },
            { role: 'user', content: text }
          ]
        }),
      });

      const data = await res.json() as {
        choices: { message: { content: string } }[]
      };
      const reply = data.choices[0].message.content;
      setMessages(prev => [...prev, { role: 'agent', text: reply }]);
    } catch {
      setMessages(prev => [...prev, { role: 'agent', text: 'Something went wrong, please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, fontFamily: 'sans-serif' }}>
      {/* Chat Window */}
      {open && (
        <div style={{
          width: '340px', background: '#fff', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          marginBottom: '12px'
        }}>
          {/* Header */}
          <div style={{
            background: '#e63946', padding: '14px 18px', color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <strong>🍔 Burger AI Agent</strong>
              <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.85 }}>Type your order</p>
            </div>
            <button
              onClick={() => setOpen(false)}
              style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer', lineHeight: 1 }}
            >×</button>
          </div>

          {/* Messages */}
          <div style={{ height: '280px', overflowY: 'auto', padding: '12px', background: '#f9f9f9' }}>
            {messages.map((msg, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start',
                marginBottom: '8px'
              }}>
                <div style={{
                  maxWidth: '80%', padding: '8px 12px', borderRadius: '12px',
                  background: msg.role === 'user' ? '#e63946' : '#fff',
                  color: msg.role === 'user' ? '#fff' : '#333',
                  fontSize: '13px', boxShadow: '0 1px 4px rgba(0,0,0,0.1)'
                }}>{msg.text}</div>
              </div>
            ))}
            {loading && (
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#999' }}>Thinking...</div>
            )}
          </div>

          {/* Input */}
          <div style={{ display: 'flex', padding: '10px', gap: '6px', borderTop: '1px solid #eee' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="E.g: two large burgers..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #ddd', fontSize: '13px', outline: 'none'
              }}
            />
            <button
              onClick={() => sendMessage(input)}
              style={{
                padding: '8px 12px', borderRadius: '8px',
                background: '#e63946', color: '#fff',
                border: 'none', cursor: 'pointer', fontSize: '13px'
              }}
            >→</button>
          </div>
        </div>
      )}

      {/* Floating Button */}
      <button
        onClick={() => setOpen(prev => !prev)}
        style={{
          width: '56px', height: '56px', borderRadius: '50%',
          background: '#e63946', color: '#fff', border: 'none',
          fontSize: '24px', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(230,57,70,0.4)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          transition: 'transform 0.2s',
        }}
        onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
        onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {open ? '×' : '🍔'}
      </button>
    </div>
  );
};

export default AIAgent;