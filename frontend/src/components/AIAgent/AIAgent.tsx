import { useState, useEffect, useRef } from 'react';
import * as SpeechSDK from 'microsoft-cognitiveservices-speech-sdk';

interface Message {
  role: 'user' | 'agent';
  text: string;
}

interface Props {
  ingredients: { id: number; name: string }[];
  onAddToCart: (ingredientId: number) => void;
}

export const AIAgent = ({ ingredients }: Props) => {
  const [open, setOpen] = useState(true);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'agent', text: 'Hello! I am Burger AI 🍔 Say your order or type below!' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [listening, setListening] = useState(false);
  const [voiceMode, setVoiceMode] = useState(true);

  const recognizerRef = useRef<SpeechSDK.SpeechRecognizer | null>(null);
  const synthesizerRef = useRef<SpeechSDK.SpeechSynthesizer | null>(null);
  const autoStartedRef = useRef(false);
  const voiceModeRef = useRef(true); // <-- əsl fix budur

  const speechKey = import.meta.env.VITE_AZURE_SPEECH_KEY;
  const speechRegion = import.meta.env.VITE_AZURE_SPEECH_REGION;

  const speak = (text: string, onDone?: () => void) => {
    if (!voiceModeRef.current) { onDone?.(); return; }
    if (synthesizerRef.current) {
      synthesizerRef.current.close();
      synthesizerRef.current = null;
    }
    const config = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    config.speechSynthesisVoiceName = 'en-US-JennyNeural';
    const synthesizer = new SpeechSDK.SpeechSynthesizer(config);
    synthesizerRef.current = synthesizer;
    synthesizer.speakTextAsync(text, () => {
      synthesizer.close();
      synthesizerRef.current = null;
      onDone?.();
    });
  };

  const startListening = () => {
    if (!voiceModeRef.current) return;
    if (recognizerRef.current) return;
    const config = SpeechSDK.SpeechConfig.fromSubscription(speechKey, speechRegion);
    config.speechRecognitionLanguage = 'en-US';
    const audioConfig = SpeechSDK.AudioConfig.fromDefaultMicrophoneInput();
    const recognizer = new SpeechSDK.SpeechRecognizer(config, audioConfig);
    recognizerRef.current = recognizer;
    setListening(true);

    recognizer.recognizeOnceAsync(result => {
      recognizerRef.current = null;
      setListening(false);
      if (result.reason === SpeechSDK.ResultReason.RecognizedSpeech && result.text.trim()) {
        sendMessage(result.text);
      } else {
        if (voiceModeRef.current) {
          speak('I did not catch that. Please try again.', () => startListening());
        }
      }
      recognizer.close();
    });
  };

  const stopAll = () => {
    recognizerRef.current?.close();
    recognizerRef.current = null;
    synthesizerRef.current?.close();
    synthesizerRef.current = null;
    setListening(false);
  };

  const toggleVoiceMode = () => {
    const next = !voiceModeRef.current;
    voiceModeRef.current = next;
    setVoiceMode(next);
    if (!next) {
      stopAll();
    }
  };

  useEffect(() => {
    if (autoStartedRef.current) return;
    autoStartedRef.current = true;
    setTimeout(() => {
      speak(
        'Hello! Welcome to Burger Builder. I am your AI assistant. Please say your order and I will build it for you!',
        () => startListening()
      );
    }, 800);
  }, []);

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
        : 'Sesame Bun, Whole Wheat Bun, Beef Patty, Chicken Patty, Veggie Patty, Lettuce, Tomato, Cheese, Pickles, Ketchup, Mayo, BBQ Sauce';

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
              content: `You are a friendly AI voice assistant for Burger Builder restaurant.
              Help customers choose and build their perfect burger order.
              Available menu items: ${menuList}.
              Keep responses very short and friendly — max 2 sentences. Speak naturally as if talking.`
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

      speak(reply, () => {
        if (voiceModeRef.current) startListening();
      });

    } catch {
      setMessages(prev => [...prev, { role: 'agent', text: 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', bottom: '24px', right: '24px', zIndex: 1000, fontFamily: 'sans-serif' }}>
      {open && (
        <div style={{
          width: '340px', background: '#fff', borderRadius: '16px',
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column', overflow: 'hidden',
          marginBottom: '12px'
        }}>
          <div style={{
            background: '#e63946', padding: '14px 18px', color: '#fff',
            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
          }}>
            <div>
              <strong>🍔 Burger AI Agent</strong>
              <p style={{ margin: '2px 0 0', fontSize: '12px', opacity: 0.85 }}>
                {listening ? '🎤 Listening...' : voiceMode ? '🔊 Voice mode ON' : '⌨️ Type your order'}
              </p>
            </div>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button
                onClick={toggleVoiceMode}
                title={voiceMode ? 'Turn off voice mode' : 'Turn on voice mode'}
                style={{
                  background: voiceMode ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.2)',
                  border: '1px solid rgba(255,255,255,0.4)',
                  borderRadius: '8px', color: '#fff',
                  fontSize: '14px', padding: '4px 10px',
                  cursor: 'pointer', fontWeight: 600
                }}
              >
                {voiceMode ? '🔊 ON' : '🔇 OFF'}
              </button>
              <button
                onClick={() => { stopAll(); setOpen(false); }}
                style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px', cursor: 'pointer' }}
              >×</button>
            </div>
          </div>

          <div style={{ height: '260px', overflowY: 'auto', padding: '12px', background: '#f9f9f9' }}>
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
              <div style={{ textAlign: 'center', fontSize: '12px', color: '#999', padding: '8px' }}>
                Thinking...
              </div>
            )}
            {listening && (
              <div style={{ textAlign: 'center', fontSize: '13px', color: '#e63946', fontWeight: 600, padding: '8px' }}>
                🎤 Listening... speak now
              </div>
            )}
          </div>

          <div style={{ display: 'flex', padding: '10px', gap: '6px', borderTop: '1px solid #eee' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && sendMessage(input)}
              placeholder="Type your order..."
              style={{
                flex: 1, padding: '8px 12px', borderRadius: '8px',
                border: '1px solid #ddd', fontSize: '13px', outline: 'none'
              }}
            />
            <button
              onClick={listening ? stopAll : startListening}
              style={{
                padding: '8px 10px', borderRadius: '8px',
                background: listening ? '#e63946' : '#f0f0f0',
                border: 'none', cursor: 'pointer', fontSize: '16px',
                boxShadow: listening ? '0 0 0 3px rgba(230,57,70,0.3)' : 'none',
                transition: 'all 0.2s'
              }}
            >🎤</button>
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

      {!open && (
        <button
          onClick={() => setOpen(true)}
          style={{
            width: '56px', height: '56px', borderRadius: '50%',
            background: '#e63946', color: '#fff', border: 'none',
            fontSize: '24px', cursor: 'pointer',
            boxShadow: '0 4px 16px rgba(230,57,70,0.4)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            transition: 'transform 0.2s'
          }}
          onMouseEnter={e => (e.currentTarget.style.transform = 'scale(1.1)')}
          onMouseLeave={e => (e.currentTarget.style.transform = 'scale(1)')}
        >
          🍔
        </button>
      )}
    </div>
  );
};

export default AIAgent;
