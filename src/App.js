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
        <span key={i} style={{
          fontSize: 14,
          color: i <= Math.round(rating) ? '#D4900A' : '#ddd'
        }}>★</span>
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
  const searchBox = useRef(null);
  const mapRef = useRef(null);

  const onMapLoad = useCallback((map) => { mapRef.current = map; }, []);

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
    setSelectedApartment(apartment);
    setSummary('');
    setLoading(true);
    const service = new window.google.maps.places.PlacesService(mapRef.current);
    service.getDetails(
      { placeId: apartment.place_id, fields: ['reviews', 'name'] },
      async (place, status) => {
        if (status === window.google.maps.places.PlacesServiceStatus.OK && place.reviews) {
          const reviewText = place.reviews.map(r => r.text).join('\n\n');
          try {
            const response = await axios.post('http://localhost:3001/api/summarize', {
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
    scale: 1.8,
    anchor: new window.google.maps.Point(12, 22),
  });

  return (
    <LoadScript googleMapsApiKey="AIzaSyBGNDvvjBWtpAWZXtTnTEWgJ0sYigcrW0g" libraries={libraries}>
      <div style={{ position: 'relative', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>

        {/* Top Bar */}
        <div style={{
          position: 'absolute', top: 0, left: 0, right: 0,
          padding: '14px 16px', display: 'flex', alignItems: 'center',
          gap: 12, zIndex: 10
        }}>
          {/* Logo */}
          <div style={{
            background: 'white', borderRadius: 50, padding: '8px 16px',
            fontWeight: 600, fontSize: 15, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
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

          {/* Filter button */}
          <div style={{
            background: 'white', borderRadius: 50, padding: '10px 16px',
            fontSize: 13, fontWeight: 500, boxShadow: '0 2px 12px rgba(0,0,0,0.15)',
            cursor: 'pointer', whiteSpace: 'nowrap', color: '#1a1a1a'
          }}>
            ⚙ Filters
          </div>
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
          mapTypeId="hybrid"
          onLoad={onMapLoad}
          options={{
            disableDefaultUI: false,
            zoomControl: true,
            mapTypeControl: false,
            streetViewControl: false,
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
                fontSize: '11px',
                fontWeight: 'bold'
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
              options={{ maxWidth: 320 }}
            >
              <div style={{ padding: '4px 4px 8px', fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif' }}>
                {/* Card Header */}
                <div style={{ marginBottom: 10 }}>
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

                {/* Pros / Cons */}
                {loading ? (
                  <div style={{ textAlign: 'center', padding: '16px 0', color: '#888', fontSize: 13 }}>
                    ✨ Generating AI summary...
                  </div>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    {/* Pros */}
                    <div>
                      <div style={{ fontSize: 11, fontWeight: 600, color: '#2E9E68', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        ✓ Pros
                      </div>
                      {summary.split('\n')
.filter(l => l.trim().startsWith('•') && (summary.indexOf('CONS') > summary.indexOf(l)) === false
```

Hit **Ctrl + S**, then run:
```
git add .
git commit -m "fix build warnings"
git push
vercel --prod                          ? summary.split('PROS:')[1]?.split('CONS:')[0]?.includes(l)
                          : false
                        )
                        .slice(0, 3)
                        .map((line, i) => (
                          <div key={i} style={{ fontSize: 11, color: '#444', padding: '3px 0', borderBottom: '0.5px solid #f0f0f0', lineHeight: 1.4 }}>
                            {line.replace('•', '').trim()}
                          </div>
                        ))
                      }
                      <pre style={{
                        fontSize: 11, color: '#444', whiteSpace: 'pre-wrap',
                        fontFamily: 'inherit', margin: 0, lineHeight: 1.5,
                        display: summary.includes('PROS:') ? 'none' : 'block'
                      }}>
                        {summary}
                      </pre>
                      {summary.includes('PROS:') && (
                        <div style={{ fontSize: 11, color: '#444', lineHeight: 1.5 }}>
                          {summary.split('PROS:')[1]?.split('CONS:')[0]?.trim()}
                        </div>
                      )}
                    </div>

                    {/* Cons */}
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