import { GoogleMap, LoadScript, StandaloneSearchBox, Marker, InfoWindow } from '@react-google-maps/api';
import { useRef, useState, useCallback } from 'react';
import axios from 'axios';

const mapContainerStyle = { width: '100vw', height: '100vh' };
const defaultCenter = { lat: 34.0754, lng: -84.2941 };
const libraries = ["places"];

function getPinColor(rating) {
  if (!rating) return '#888888';
  if (rating >= 4.0) return '#2E9E68';
  if (rating >= 3.0) return '#D4900A';
  return '#C0392B';
}

function StarRating({ rating }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 14, color: i <= Math.round(rating) ? '#D4900A' : '#ddd' }}>★</span>
      ))}
      <span style={{ fontSize: 13, fontWeight: 500, color: '#333' }}>{rating}</span>
    </div>
  );
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
    const streetViewPanorama = map.getStreetView();
    streetViewPanorama.addListener('visible_changed', () => {
      setInStreetView(streetViewPanorama.getVisible());
    });
  }, []);
  const searchApartments = (location) => {
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.nearbySearch({
      location,
      radius: 5000,
      keyword: 'apartment complex'
    }, (results, status) => {
      if (status === window.google.maps.places.PlacesServiceStatus.OK) {
        setApartments(results);
      }
    });
  };
const searchCurrentArea = () => {
    if (!mapRef.current) return;
    const center = mapRef.current.getCenter();
    searchApartments(center);
  };  const onPlacesChanged = () => {
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
      { placeId: apartment.place_id, fields: ['reviews', 'name', 'photos'] },
      async (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place.reviews) {
          if (place.photos) setSelectedApartment(prev => ({ ...prev, photos: place.photos }));
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

  return (
    <LoadScript googleMapsApiKey="AIzaSyBGNDvvjBWtpAWZXtTnTEWgJ0sYigcrW0g" libraries={libraries}>
      <div style={{ position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

        {/* Top Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 16px', display: 'flex', alignItems: 'center',
          justifyContent: 'center', gap: 12, zIndex: 10
        }}>
          {/* Logo */}
          <div style={{
            background: 'white', borderRadius: 50, padding: '8px 16px',
            fontWeight: 600, fontSize: 22, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            whiteSpace: 'nowrap', color: '#1a1a1a'
          }}>
            Rate<span style={{ color: '#2E9E68' }}>My</span>Spot
          </div>

          {/* Search */}
          <StandaloneSearchBox
            onLoad={(ref) => (searchBox.current = ref)}
            onPlacesChanged={onPlacesChanged}
          >
            <input
              type="text"
              placeholder="Search a city or neighborhood..."
              style={{
                flex: 1, padding: '10px 18px', borderRadius: 50,
                border: 'none', boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
                fontSize: 14, outline: 'none', minWidth: 0, width: '100%'
              }}
            />
          </StandaloneSearchBox>

          {/* Map Type Toggle */}
          <div style={{ display: 'flex', background: 'white', borderRadius: 50, boxShadow: '0 2px 12px rgba(0,0,0,0.15)', overflow: 'hidden', WebkitTapHighlightColor: 'transparent' }}>
            {[['🛰', 'hybrid', 'Satellite'], ['🗺', 'roadmap', 'Map']].map(([icon, type, label]) => (
              <div
                key={type}
                onClick={() => setMapType(type)}
onTouchEnd={(e) => { e.preventDefault(); setMapType(type); }}
                style={{
                  padding: '10px 14px', fontSize: 13, fontWeight: 500,
                  cursor: 'pointer', whiteSpace: 'nowrap',
                  color: mapType === type ? '#2E9E68' : '#1a1a1a',
                  borderRight: type === 'hybrid' ? '0.5px solid #eee' : 'none',
                  background: mapType === type ? '#f0faf5' : 'white'
                }}>
                {icon} {label}
              </div>
            ))}
          </div>
        </div>
{inStreetView && (
  <div
    onClick={() => {
      const sv = mapRef.current.getStreetView();
      sv.setVisible(false);
      setInStreetView(false);
    }}
    style={{
      position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
      zIndex: 10, background: 'white', borderRadius: 50, padding: '10px 20px',
      boxShadow: '0 2px 12px rgba(0,0,0,0.2)', fontSize: 13, fontWeight: 500,
      cursor: 'pointer', color: '#1a1a1a', whiteSpace: 'nowrap'
    }}>
    ← Exit Street View
  </div>
)}

        {/* Search This Area Button */}
        <div
          onClick={searchCurrentArea}
          onTouchEnd={(e) => { e.preventDefault(); searchCurrentArea(); }}
          style={{
            position: 'absolute', top: 80, left: '50%', transform: 'translateX(-50%)',
            zIndex: 10, background: 'white', borderRadius: 50, padding: '10px 20px',
            boxShadow: '0 2px 12px rgba(0,0,0,0.2)', fontSize: 13, fontWeight: 500,
            cursor: 'pointer', color: '#1a1a1a', whiteSpace: 'nowrap'
          }}>
          🔍 Search This Area
        </div>
        {/* Legend */}
        <div style={{
          position: 'absolute', bottom: 24, left: 16, zIndex: 10,
          background: 'white', borderRadius: 12, padding: '10px 14px',
          boxShadow: '0 2px 12px rgba(0,0,0,0.15)', display: 'flex',
          flexDirection: 'column', gap: 6
        }}>
          {[['#2E9E68','4.0+ Great'],['#D4900A','3.0–3.9 Ok'],['#C0392B','Below 3 Poor']].map(([color, label]) => (
            <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: color }} />
              <span style={{ color: '#333' }}>{label}</span>
            </div>
          ))}
        </div>

        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={center}
          zoom={13}
          mapTypeId={mapType === 'streetview' ? 'roadmap' : mapType}
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
              options={{ maxWidth: 320, pixelOffset: new window.google.maps.Size(0, -40) }}
            >
              <div style={{ padding: '4px 4px 8px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                <div style={{ marginBottom: 10 }}>
                  {selectedApartment.photos && selectedApartment.photos[0] && (
                    <img
                      src={selectedApartment.photos[0].getUrl({ maxWidth: 320, maxHeight: 160 })}
                      alt={selectedApartment.name}
                      style={{ width: '100%', height: 140, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
                    />
                  )}
                  <div style={{ fontSize: 15, fontWeight: 600, color: '#1a1a1a', marginBottom: 4 }}>
                    {selectedApartment.name}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <StarRating rating={selectedApartment.rating} />
                    <span style={{
                      fontSize: 10, background: '#F0EBF9', color: '#7B5EA7',
                      borderRadius: 4, padding: '2px 7px', fontWeight: 500
                    }}>AI Summary</span>
                  </div>
                  {selectedApartment.vicinity && (
                    <div style={{ fontSize: 11, color: '#888', marginTop: 4 }}>
                      {selectedApartment.vicinity}
                    </div>
                  )}
                </div>

                <div style={{ height: '0.5px', background: '#eee', marginBottom: 10 }} />

                {loading ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#888', fontSize: 13 }}>
                    ✨ Generating AI summary...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#2E9E68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✓ Pros
                      </div>
                      {summary.includes('PROS:') ? (
                        <div style={{ fontSize: 11, color: '#444', lineHeight: 1.5 }}>
                          {summary.split('PROS:')[1]?.split('CONS:')[0]?.trim()}
                        </div>
                      ) : (
                        <pre style={{ whiteSpace: 'pre-wrap', fontFamily: 'inherit', fontSize: 11, color: '#444', margin: 0, lineHeight: 1.5 }}>
                          {summary}
                        </pre>
                      )}
                    </div>
                    {summary.includes('CONS:') && (
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 600, color: '#C0392B', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          ✗ Cons
                        </div>
                        <div style={{ fontSize: 11, color: '#444', lineHeight: 1.5 }}>
                          {summary.split('CONS:')[1]?.trim()}
                        </div>
                      </div>
                    )}
                  </div>
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