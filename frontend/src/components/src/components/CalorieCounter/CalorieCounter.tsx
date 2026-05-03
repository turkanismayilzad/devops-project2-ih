interface Props {
  calories: number;
}

const getColor = (cal: number) => {
  if (cal < 400) return '#2d6a4f';
  if (cal < 700) return '#e07c24';
  return '#e63946';
};

const getLabel = (cal: number) => {
  if (cal < 400) return 'Light meal 🥗';
  if (cal < 700) return 'Regular meal 🍔';
  return 'Hearty meal 🔥';
};

export const CalorieCounter = ({ calories }: Props) => {
  const max = 1000;
  const percent = Math.min((calories / max) * 100, 100);
  const color = getColor(calories);

  return (
    <div style={{
      background: '#fff',
      border: `2px solid ${color}`,
      borderRadius: '12px',
      padding: '14px 18px',
      margin: '12px 0',
      fontFamily: 'sans-serif'
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <span style={{ fontWeight: 600, fontSize: '14px', color: '#333' }}>
          🔥 Estimated Calories
        </span>
        <span style={{ fontWeight: 700, fontSize: '20px', color }}>
          {calories} kcal
        </span>
      </div>
      <div style={{ background: '#f0f0f0', borderRadius: '8px', height: '8px', overflow: 'hidden' }}>
        <div style={{
          width: `${percent}%`,
          height: '100%',
          background: color,
          borderRadius: '8px',
          transition: 'width 0.4s ease'
        }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px' }}>
        <span style={{ fontSize: '11px', color: '#999' }}>0</span>
        <span style={{ fontSize: '12px', color, fontWeight: 500 }}>{getLabel(calories)}</span>
        <span style={{ fontSize: '11px', color: '#999' }}>1000+</span>
      </div>
    </div>
  );
};

export default CalorieCounter;
