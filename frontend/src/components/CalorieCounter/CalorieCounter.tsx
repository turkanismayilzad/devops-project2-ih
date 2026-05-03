import { getCalories } from '../../utils/calorieData';

interface Layer {
  ingredientId: number;
  quantity: number;
}

interface Ingredient {
  id: number;
  name: string;
}

interface Props {
  calories: number;
  layers: Layer[];
  getIngredientById: (id: number) => Ingredient | undefined;
}

const getColor = (cal: number) => {
  if (cal < 400) return '#2d6a4f';
  if (cal < 700) return '#e07c24';
  return '#e63946';
};

const getBg = (cal: number) => {
  if (cal < 400) return 'linear-gradient(135deg, #d8f3dc, #b7e4c7)';
  if (cal < 700) return 'linear-gradient(135deg, #fff3e0, #ffe0b2)';
  return 'linear-gradient(135deg, #fdecea, #ffc8c8)';
};

const getLabel = (cal: number) => {
  if (cal < 400) return '🥗 Light meal';
  if (cal < 700) return '🍔 Regular meal';
  return '🔥 Hearty meal';
};

const getEmoji = (name: string) => {
  const n = name.toLowerCase();
  if (n.includes('bun')) return '🍞';
  if (n.includes('beef') || n.includes('patty')) return '🥩';
  if (n.includes('chicken')) return '🍗';
  if (n.includes('veggie')) return '🌱';
  if (n.includes('cheese')) return '🧀';
  if (n.includes('lettuce')) return '🥬';
  if (n.includes('tomato')) return '🍅';
  if (n.includes('onion')) return '🧅';
  if (n.includes('pickle')) return '🥒';
  if (n.includes('bacon')) return '🥓';
  if (n.includes('ketchup')) return '🍅';
  if (n.includes('mayo') || n.includes('mayonnaise')) return '🫙';
  if (n.includes('mustard')) return '💛';
  if (n.includes('bbq')) return '🔥';
  return '🍴';
};

export const CalorieCounter = ({ calories, layers, getIngredientById }: Props) => {
  const max = 1000;
  const percent = Math.min((calories / max) * 100, 100);
  const color = getColor(calories);
  const bg = getBg(calories);

  return (
    <div style={{
      background: bg,
      borderRadius: '14px',
      padding: '14px 16px',
      fontFamily: 'sans-serif',
      boxShadow: '0 2px 8px rgba(0,0,0,0.08)'
    }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
        <span style={{ fontWeight: 700, fontSize: '13px', color: '#444', letterSpacing: '0.5px' }}>
          🔥 ESTIMATED CALORIES
        </span>
        <span style={{ fontWeight: 800, fontSize: '22px', color }}>
          {calories} <span style={{ fontSize: '13px', fontWeight: 500 }}>kcal</span>
        </span>
      </div>

      {/* Progress bar */}
      <div style={{ background: 'rgba(255,255,255,0.6)', borderRadius: '8px', height: '10px', overflow: 'hidden', marginBottom: '6px' }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: color,
          borderRadius: '8px',
          transition: 'width 0.5s ease',
          boxShadow: `0 0 6px ${color}88`
        }} />
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <span style={{ fontSize: '11px', color: '#888' }}>0</span>
        <span style={{ fontSize: '12px', color, fontWeight: 700 }}>{getLabel(calories)}</span>
        <span style={{ fontSize: '11px', color: '#888' }}>1000+</span>
      </div>

      {/* Breakdown */}
      {layers.length > 0 && (
        <div style={{
          background: 'rgba(255,255,255,0.65)',
          borderRadius: '10px',
          padding: '10px 12px'
        }}>
          <p style={{ fontSize: '11px', color: '#888', margin: '0 0 8px', fontWeight: 700, letterSpacing: '0.8px' }}>
            BREAKDOWN
          </p>
          {layers.map((layer, i) => {
            const ingredient = getIngredientById(layer.ingredientId);
            if (!ingredient) return null;
            const cal = getCalories(ingredient.name) * layer.quantity;
            const barWidth = Math.min((cal / 500) * 100, 100);
            return (
              <div key={i} style={{ marginBottom: '8px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3px' }}>
                  <span style={{ fontSize: '13px', color: '#444' }}>
                    {getEmoji(ingredient.name)} {ingredient.name}
                    {layer.quantity > 1 && (
                      <span style={{
                        fontSize: '10px', color: '#fff',
                        background: color, borderRadius: '8px',
                        padding: '1px 6px', marginLeft: '6px'
                      }}>
                        x{layer.quantity}
                      </span>
                    )}
                  </span>
                  <span style={{ fontSize: '13px', fontWeight: 700, color }}>
                    {cal} kcal
                  </span>
                </div>
                <div style={{ background: 'rgba(0,0,0,0.08)', borderRadius: '4px', height: '4px' }}>
                  <div style={{
                    width: `${barWidth}%`,
                    height: '100%',
                    background: color,
                    borderRadius: '4px',
                    opacity: 0.6
                  }} />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default CalorieCounter;
