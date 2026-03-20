import { StandaloneSearchBox } from '@react-google-maps/api';
import { useRef } from 'react';

function Splash({ onSearch }) {
  const searchBox = useRef(null);

  const handleSearch = () => {
    const places = searchBox.current?.getPlaces();
    if (places && places.length > 0) {
      onSearch(places[0]);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearch();
  };

  return (
    <div style={{
      width: '100vw', height: '100vh',
      background: '#0d1f12',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: "'Nunito', sans-serif",
      position: 'relative', overflow: 'hidden'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@400;600;700;800;900&display=swap');
        .splash-input::placeholder { color: rgba(255,255,255,0.3); }
        .splash-input:focus { outline: none; border-color: rgba(74,222,128,0.5); }
        .splash-btn:hover { background: #22c55e; transform: scale(1.05); }
        .splash-btn { transition: all 0.2s; }
      `}</style>

      {/* Background circles */}
      <div style={{
        position: 'absolute', width: 600, height: 600,
        borderRadius: '50%', background: 'rgba(74,222,128,0.06)',
        top: -200, left: -150, pointerEvents: 'none'
      }} />
      <div style={{
        position: 'absolute', width: 400, height: 400,
        borderRadius: '50%', background: 'rgba(74,222,128,0.06)',
        bottom: -150, right: -100, pointerEvents: 'none'
      }} />

      {/* Logo */}
      <div style={{ marginBottom: 16 }}>
        <span style={{ fontSize: 52, fontWeight: 900, letterSpacing: -1 }}>
          <span style={{ color: '#4ade80' }}>rate</span>
          <span style={{ color: '#fff' }}>my</span>
          <span style={{
            background: '#4ade80', color: '#0a140d',
            borderRadius: 10, padding: '0 12px', marginLeft: 4
          }}>spot</span>
        </span>
      </div>

      {/* Tagline */}
      <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.5)', fontWeight: 600, marginBottom: 40 }}>
        Search smarter. <span style={{ color: '#4ade80' }}>Rent happier.</span>
      </div>

      {/* Search Bar */}
<div style={{ position: 'relative', width: '90%', maxWidth: 460 }}>
        <StandaloneSearchBox
          onLoad={(ref) => (searchBox.current = ref)}
          onPlacesChanged={handleSearch}
        >
          <input
            type="text"
            placeholder="Search a city or neighborhood..."
            className="splash-input"
            onKeyDown={handleKeyDown}
            style={{
              width: '100%', padding: '16px 64px 16px 24px',
              borderRadius: 50, border: '1.5px solid rgba(255,255,255,0.15)',
              background: 'rgba(255,255,255,0.07)', fontSize: 15,
              color: '#fff', fontFamily: "'Nunito', sans-serif",
              fontWeight: 600, boxSizing: 'border-box',
            }}
          />
        </StandaloneSearchBox>
        <button
          className="splash-btn"
          onClick={handleSearch}
          style={{
            position: 'absolute', right: 8, top: '50%',
            transform: 'translateY(-50%)', background: '#4ade80',
            border: 'none', borderRadius: 50, width: 42, height: 42,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            cursor: 'pointer', fontSize: 18, color: '#0a140d', fontWeight: 900,
            zIndex: 10,
          }}>
          →
        </button>
      </div>
      

      <div style={{ marginTop: 14, fontSize: 12, color: 'rgba(255,255,255,0.2)', fontWeight: 600, letterSpacing: '0.5px' }}>
        Press Enter to explore
      </div>

      {/* Stats */}
      <div style={{ display: 'flex', gap: 40, marginTop: 48 }}>
        {[['50K+', 'Complexes Rated'], ['AI', 'Powered Summaries'], ['100%', 'Resident Reviews']].map(([num, label]) => (
          <div key={label} style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 24, fontWeight: 900, color: '#4ade80' }}>{num}</div>
            <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600, letterSpacing: '0.5px', textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default Splash;