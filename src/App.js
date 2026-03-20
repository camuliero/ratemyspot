import { GoogleMap, LoadScript, StandaloneSearchBox, Marker, InfoWindow } from '@react-google-maps/api';
import { useRef, useState, useCallback } from 'react';
import axios from 'axios';

const mapContainerStyle = { width: '100vw', height: '100vh' };
const defaultCenter = { lat: 34.0754, lng: -84.2941 };
const libraries = ["places"];

const GOOGLE_MAPS_API_KEY = "AIzaSyBGNDvvjBWtpAWZXtTnTEWgJ0sYigcrW0g";

function getPinColor(rating) {
  if (!rating) return '#888888';
  if (rating >= 4.0) return '#22c55e';
  if (rating >= 3.0) return '#f59e0b';
  return '#ef4444';
}

function App() {
  const [center, setCenter] = useState(defaultCenter);
  const [apartments, setApartments] = useState([]);
  const [selectedApartment, setSelectedApartment] = useState(null);
  const [summary, setSummary] = useState('');
  const [loading, setLoading] = useState(false);
  const [mapType, setMapType] = useState('hybrid');
  const [inStreetView, setInStreetView] = useState(false);
  const searchBox = useRef(null);
  const mapRef = useRef(null);

  const onMapLoad = useCallback((map) => {
    mapRef.current = map;
    map.setMapTypeId('hybrid');
    const streetViewPanorama = map.getStreetView();
    streetViewPanorama.addListener('visible_changed', () => {
      setInStreetView(streetViewPanorama.getVisible());
    });
  }, []);

 const searchApartments = (location) => {
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    let allResults = [];

    const handleResults = (results, status, pagination) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        allResults = [...allResults, ...results];
        setApartments([...allResults]);
        if (pagination && pagination.hasNextPage) {
          setTimeout(() => pagination.nextPage(), 500);
        }
      }
    };

    service.nearbySearch({
      location,
      radius: 8000,
      type: 'lodging',
      keyword: 'apartment'
    }, handleResults);

    service.nearbySearch({
      location,
      radius: 8000,
      keyword: 'apartment complex'
    }, handleResults);
  };

  const searchCurrentArea = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    searchApartments(center);
  };

  const onPlacesChanged = () => {
    const places = searchBox.current.getPlaces();
    if (places && places.length > 0) {
      const place = places[0];
      const newCenter = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };
      setCenter(newCenter);
      searchApartments(place.geometry.location);
    }
  };

  const handleMarkerClick = (apartment) => {
    setSelectedApartment({ ...apartment, photos: null });
    setSummary('');
    setLoading(true);
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.getDetails(
      { placeId: apartment.place_id, fields: ['reviews', 'name', 'photos', 'rating', 'user_ratings_total', 'website'] },
      async (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place.reviews) {
          if (place.photos) setSelectedApartment(prev => ({ ...prev, photos: place.photos }));
          setSelectedApartment(prev => ({
            ...prev,
            website: place.website,
            user_ratings_total: place.user_ratings_total,
            reviewBreakdown: place.reviews ? {
              5: place.reviews.filter(r => r.rating === 5).length,
              4: place.reviews.filter(r => r.rating === 4).length,
              3: place.reviews.filter(r => r.rating === 3).length,
              2: place.reviews.filter(r => r.rating === 2).length,
              1: place.reviews.filter(r => r.rating === 1).length,
            } : null
          }));
          const reviewText = place.reviews.map(r => r.text).join('\n\n');
          try {
            const response = await axios.post('https://ratemyspot-server.onrender.com/api/summarize', {
              reviews: reviewText,
              apartmentName: place.name
            });
            setSummary(response.data.summary);
          } catch {
            setSummary('Could not load summary.');
          }
        } else {
          setSummary('No reviews available for this location.');
        }
        setLoading(false);
      }
    );
  };

  const pinIcon = (rating) => ({
    path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z',
    fillColor: getPinColor(rating),
    fillOpacity: 1,
    strokeColor: '#ffffff',
    strokeWeight: 2,
    scale: 2,
    anchor: new window.google.maps.Point(12, 22),
    labelOrigin: new window.google.maps.Point(12, 9),
  });

  const glassStyle = {
    background: 'rgba(0,0,0,0.5)',
    backdropFilter: 'blur(16px)',
    WebkitBackdropFilter: 'blur(16px)',
    border: '1px solid rgba(255,255,255,0.12)',
  };

  return (
    <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={libraries}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Nunito:wght@700;800;900&display=swap');
        .rms-input::placeholder { color: rgba(255,255,255,0.35); }
        .rms-input:focus { outline: none; border-color: rgba(74,222,128,0.4); }
        .rms-toggle-btn:hover { background: rgba(255,255,255,0.06); }
        .rms-pin-btn:hover { background: rgba(255,255,255,0.08); }
      `}</style>

      <div style={{ position: 'relative', fontFamily: "'Nunito', sans-serif" }}>

        {/* Top Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 20px', display: 'flex', alignItems: 'center',
          justifyContent: 'space-between', gap: 12, zIndex: 10
        }}>
          {/* Logo */}
          <div style={{
            ...glassStyle,
            borderRadius: 50, padding: '8px 18px',
            fontSize: 22, fontWeight: 900, whiteSpace: 'nowrap',
            letterSpacing: '-0.5px'
          }}>
            <span style={{ color: '#4ade80' }}>rate</span>
            <span style={{ color: '#fff' }}>my</span>
            <span style={{
              background: '#4ade80', color: '#0a140d',
              borderRadius: 6, padding: '0 7px', marginLeft: 3
            }}>spot</span>
          </div>

          {/* Search */}
          <StandaloneSearchBox
            onLoad={(ref) => (searchBox.current = ref)}
            onPlacesChanged={onPlacesChanged}
          >
            <input
              type="text"
              placeholder="Search a city or neighborhood..."
              className="rms-input"
              style={{
                ...glassStyle,
                flex: 1, padding: '11px 18px', borderRadius: 50,
                fontSize: 14, color: '#fff', width: '100%',
                fontFamily: "'Nunito', sans-serif", fontWeight: 500,
              }}
            />
          </StandaloneSearchBox>

          {/* Map Toggle */}
          <div style={{ ...glassStyle, display: 'flex', borderRadius: 50, overflow: 'hidden' }}>
            {[['🛰', 'hybrid', 'Satellite'], ['🗺', 'roadmap', 'Map']].map(([icon, type, label]) => (
              <div
                key={type}
                className="rms-toggle-btn"
                onClick={() => {
                  const sv = mapRef.current?.getStreetView();
                  if (sv) sv.setVisible(false);
                  setMapType(type);
                  setInStreetView(false);
                }}
                onTouchEnd={(e) => {
                  e.preventDefault();
                  const sv = mapRef.current?.getStreetView();
                  if (sv) sv.setVisible(false);
                  setMapType(type);
                  setInStreetView(false);
                }}
                style={{
                  padding: '10px 16px', fontSize: 12, fontWeight: 700,
                  cursor: 'pointer', whiteSpace: 'nowrap', transition: 'all 0.2s',
                  color: mapType === type ? '#4ade80' : 'rgba(255,255,255,0.5)',
                  background: mapType === type ? 'rgba(74,222,128,0.12)' : 'transparent',
                  borderRight: type === 'hybrid' ? '1px solid rgba(255,255,255,0.1)' : 'none',
                  fontFamily: "'Nunito', sans-serif",
                }}>
                {icon} {label}
              </div>
            ))}
          </div>
        </div>

        {/* Search This Area */}
        <div
          onClick={searchCurrentArea}
          onTouchEnd={(e) => { e.preventDefault(); searchCurrentArea(); }}
          style={{
            ...glassStyle,
            position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, borderRadius: 50, padding: '9px 20px',
            fontSize: 12, fontWeight: 700, cursor: 'pointer',
            color: '#fff', whiteSpace: 'nowrap',
            fontFamily: "'Nunito', sans-serif",
            letterSpacing: '0.3px',
          }}>
          🔍 Search This Area
        </div>

        {/* Exit Street View */}
        {inStreetView && (
          <div
            onClick={() => {
              const sv = mapRef.current.getStreetView();
              sv.setVisible(false);
              setInStreetView(false);
              mapRef.current.setMapTypeId(mapType);
            }}
            onTouchEnd={(e) => {
              e.preventDefault();
              const sv = mapRef.current.getStreetView();
              sv.setVisible(false);
              setInStreetView(false);
              mapRef.current.setMapTypeId(mapType);
            }}
            style={{
              ...glassStyle,
              position: 'absolute', top: 76, left: '50%', transform: 'translateX(-50%)',
              zIndex: 10, borderRadius: 50, padding: '9px 20px',
              fontSize: 12, fontWeight: 700, cursor: 'pointer',
              color: '#4ade80', whiteSpace: 'nowrap',
              fontFamily: "'Nunito', sans-serif",
            }}>
            ← Exit Street View
          </div>
        )}

        {/* Legend */}
        <div style={{
          ...glassStyle,
          position: 'absolute', bottom: 24, left: 16, zIndex: 10,
          borderRadius: 14, padding: '10px 14px',
          display: 'flex', flexDirection: 'column', gap: 7
        }}>
          {[['#22c55e','4.0+ Great'],['#f59e0b','3.0–3.9 Ok'],['#ef4444','Below 3 Poor']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11, fontWeight: 600 }}>
              <div style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
              <span style={{ color: 'rgba(255,255,255,0.6)' }}>{label}</span>
            </div>
          ))}
        </div>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          mapTypeId={mapType}
          onLoad={onMapLoad}
          options={{
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: true,
            fullscreenControl: false,
          }}
        >
          {apartments.map((apt) => (
            <Marker
              key={apt.place_id}
              position={{
                lat: apt.geometry.location.lat(),
                lng: apt.geometry.location.lng()
              }}
              icon={pinIcon(apt.rating)}
              label={{
                text: apt.rating ? `${apt.rating}` : '?',
                color: 'white',
                fontSize: '10px',
                fontWeight: 'bold',
              }}
              onClick={() => handleMarkerClick(apt)}
            />
          ))}

          {selectedApartment && (
            <InfoWindow
              position={{
                lat: selectedApartment.geometry.location.lat(),
                lng: selectedApartment.geometry.location.lng()
              }}
              onCloseClick={() => { setSelectedApartment(null); setSummary(''); }}
              options={{ maxWidth: 340, pixelOffset: new window.google.maps.Size(0, -40) }}
            >
<div style={{ fontFamily: "'Nunito', sans-serif", padding: '4px 4px 8px' }}>
  {/* Property Photo */}
  {selectedApartment.photos && selectedApartment.photos[0] && (
    <img
      src={selectedApartment.photos[0].getUrl({ maxWidth: 340, maxHeight: 160 })}
      alt={selectedApartment.name}
      style={{ width: '100%', height: 150, objectFit: 'cover', borderRadius: 8, marginBottom: 10, display: 'block' }}
    />
  )}

  {/* Header */}
  <div style={{ marginBottom: 10 }}>
    <div style={{ fontSize: 16, fontWeight: 900, color: '#1a1a1a', marginBottom: 5, letterSpacing: '-0.3px' }}>
      {selectedApartment.name}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
        {[1,2,3,4,5].map(i => (
          <span key={i} style={{ fontSize: 13, color: i <= Math.round(selectedApartment.rating) ? '#f59e0b' : '#ddd' }}>★</span>
        ))}
        <span style={{ fontSize: 13, fontWeight: 700, color: '#1a1a1a', marginLeft: 2 }}>{selectedApartment.rating}</span>
      </div>
      <span style={{
        fontSize: 10, background: '#F0EBF9', color: '#7B5EA7',
        borderRadius: 50, padding: '3px 10px', fontWeight: 700,
        border: '1px solid rgba(123,94,167,0.2)', letterSpacing: '0.3px'
      }}>✦ AI Summary</span>
    </div>

    {selectedApartment.user_ratings_total && (
      <div style={{ fontSize: 11, color: '#888', marginTop: 4, fontWeight: 600 }}>
        {selectedApartment.user_ratings_total} total reviews
      </div>
    )}

    {selectedApartment.reviewBreakdown && (
      <div style={{ marginTop: 8 }}>
        {[5,4,3,2,1].map(star => (
          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
            <span style={{ fontSize: 10, color: '#f59e0b', minWidth: 16, fontWeight: 700 }}>{star}★</span>
            <div style={{ flex: 1, height: 3, background: '#f0f0f0', borderRadius: 2 }}>
              <div style={{
                height: 3, borderRadius: 2, background: '#2E9E68',
                width: `${(selectedApartment.reviewBreakdown[star] / Object.values(selectedApartment.reviewBreakdown).reduce((a,b) => a+b, 0)) * 100}%`
              }} />
            </div>
            <span style={{ fontSize: 10, color: '#888', minWidth: 12, fontWeight: 600 }}>{selectedApartment.reviewBreakdown[star]}</span>
          </div>
        ))}
      </div>
    )}

    {selectedApartment.vicinity && (
      <div style={{ fontSize: 11, color: '#888', marginTop: 6, fontWeight: 600 }}>
        📍 {selectedApartment.vicinity}
      </div>
    )}
  </div>

  <div style={{ height: '1px', background: '#eee', marginBottom: 12 }} />

  {/* Pros / Cons */}
  {loading ? (
    <div style={{ textAlign: 'center', padding: '16px 0', color: '#888', fontSize: 13, fontWeight: 600 }}>
      ✨ Generating AI summary...
    </div>
  ) : (
    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
      <div>
        <div style={{ fontSize: 10, fontWeight: 800, color: '#2E9E68', marginBottom: 6, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
          ✓ Pros
        </div>
        {summary.includes('PROS:') ? (
          <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6, fontWeight: 500 }}>
            {summary.split('PROS:')[1]?.split('CONS:')[0]?.trim()}
          </div>
        ) : (
          <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 11, color: '#444', margin: 0, lineHeight: 1.6 }}>
            {summary}
          </pre>
        )}
      </div>
      {summary.includes('CONS:') && (
        <div>
          <div style={{ fontSize: 10, fontWeight: 800, color: '#ef4444', marginBottom: 6, letterSpacing: '0.8px', textTransform: 'uppercase' }}>
            ✗ Cons
          </div>
          <div style={{ fontSize: 11, color: '#444', lineHeight: 1.6, fontWeight: 500 }}>
            {summary.split('CONS:')[1]?.trim()}
          </div>
        </div>
      )}
    </div>
  )}

  {/* Website */}
  {selectedApartment.website && (
    <a href={selectedApartment.website} target="_blank" rel="noreferrer" style={{
      display: 'block', marginTop: 12, fontSize: 11, color: '#2E9E68',
      textDecoration: 'none', fontWeight: 700, letterSpacing: '0.3px'
    }}>
      🌐 Visit Website →
    </a>
  )}
</div>
</InfoWindow>
          )}
        </GoogleMap>
      </div>
    </LoadScript>
  );
}

export default App;