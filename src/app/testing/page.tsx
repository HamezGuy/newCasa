'use client';

import {
  Autocomplete,
  GoogleMap,
  InfoWindow,
  LoadScript,
  Marker,
  Polygon,
} from '@react-google-maps/api';
import { useCallback, useRef, useState } from 'react';

const GOOGLE_MAPS_API_KEY = 'AIzaSyAhPp5mHXCLCKZI2QSolcIUONI3ceZ-Zcc'; // Replace with your actual API key

interface Property {
  ListingId: string;
  Latitude: number;
  Longitude: number;
  Address: string;
  Price: string;
}

const TestMapWithSearch = () => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(
    null
  );
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [polygonCoords, setPolygonCoords] = useState<{ lat: number; lng: number }[] | null>(null);
  const [properties, setProperties] = useState<Property[]>([]);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const mapContainerStyle = {
    width: '100%',
    height: '100vh',
  };

  // Default to Madison, WI
  const mapCenter = selectedLocation || { lat: 43.0731, lng: -89.4012 };

  const polygonOptions = {
    fillColor: '#22ccff',
    fillOpacity: 0.2,
    strokeColor: '#1e89a1',
    strokeOpacity: 0.8,
    strokeWeight: 2,
  };

  // --------------------------------------------------
  // Handle user-typed search in the Autocomplete bar
  // --------------------------------------------------
  const handleSearch = useCallback(() => {
    if (autocompleteRef.current) {
      const place = autocompleteRef.current.getPlace();

      if (place?.geometry?.location) {
        const location = place.geometry.location;
        if (location) {
          setSelectedLocation({
            lat: location.lat(),
            lng: location.lng(),
          });
        } else {
          console.error('Location is undefined.');
        }

        const viewport = place.geometry.viewport;
        if (viewport) {
          const ne = viewport.getNorthEast();
          const sw = viewport.getSouthWest();
          setPolygonCoords([
            { lat: sw.lat(), lng: sw.lng() },
            { lat: sw.lat(), lng: ne.lng() },
            { lat: ne.lat(), lng: ne.lng() },
            { lat: ne.lat(), lng: sw.lng() },
          ]);
        }
      } else {
        console.error('Place geometry or location is undefined.');
      }
    }
  }, []);

  // --------------------------------------------------
  // (Optional) Single call to fetch properties w/ certain queries
  // --------------------------------------------------
  const fetchProperties = async (queryParams: string) => {
    try {
      const response = await fetch(`/api/v1/listings?${queryParams}`);
      const data = await response.json();

      if (response.ok) {
        console.log('Fetched properties:', data);
        setProperties(data);
      } else {
        console.error('Failed to fetch properties:', data.message);
        setProperties([]);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
      setProperties([]);
    }
  };

  // --------------------------------------------------
  // Test multiple queries, including city=Madison
  // --------------------------------------------------
  const testQueries = async () => {
    const queries = [
      { name: 'zipCode=53713', query: 'zipCode=53713' },
      { name: 'streetName=Monroe', query: 'streetName=Monroe' },

      // NEW: city-based test
      { name: 'city=Madison', query: 'city=Madison' },

      // (Optional) county-based test (e.g. "Dane" if your data supports it):
      { name: 'county=Dane', query: 'county=Dane' },

      // all properties => no query param
      { name: 'all properties', query: '' },
    ];

    for (const { name, query } of queries) {
      console.log(`Fetching properties for ${name}...`);
      try {
        const response = await fetch(`/api/v1/listings?${query}`);
        const data = await response.json();

        if (response.ok) {
          console.log(`Successfully fetched ${data.length} properties for ${name}.`);
        } else {
          console.error(
            `Error for ${name}: ${response.status} - ${data.message || 'Unknown error'}`
          );
        }
      } catch (error) {
        console.error(`Error for ${name}:`, error);
      }
    }
  };

  // --------------------------------------------------
  // Marker logic
  // --------------------------------------------------
  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedProperty(null);
  }, []);

  // --------------------------------------------------
  // Render
  // --------------------------------------------------
  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <LoadScript googleMapsApiKey={GOOGLE_MAPS_API_KEY} libraries={['places']}>
        {/* Search Bar */}
        <div
          style={{
            position: 'absolute',
            zIndex: 10,
            top: 10,
            left: 10,
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <Autocomplete onLoad={(ref) => (autocompleteRef.current = ref)}>
            <input
              type="text"
              placeholder="Search for a location"
              style={{
                width: '300px',
                height: '40px',
                fontSize: '16px',
                padding: '0 10px',
              }}
            />
          </Autocomplete>
          <button
            onClick={handleSearch}
            style={{
              marginLeft: '10px',
              height: '40px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Search
          </button>
          <button
            onClick={testQueries}
            style={{
              marginLeft: '10px',
              height: '40px',
              fontSize: '16px',
              cursor: 'pointer',
            }}
          >
            Test API
          </button>
        </div>

        {/* Google Map */}
        <GoogleMap
          mapContainerStyle={mapContainerStyle}
          center={mapCenter}
          zoom={12}
          onClick={handleMapClick}
        >
          {/* Render Polygon */}
          {polygonCoords && <Polygon paths={polygonCoords} options={polygonOptions} />}

          {/* Render Property Markers */}
          {properties.map((property) => (
            <Marker
              key={property.ListingId}
              position={{ lat: property.Latitude, lng: property.Longitude }}
              onClick={() => handleMarkerClick(property)}
            />
          ))}

          {/* Render InfoWindow for selected property */}
          {selectedProperty && (
            <InfoWindow
              position={{
                lat: selectedProperty.Latitude,
                lng: selectedProperty.Longitude,
              }}
              onCloseClick={handleMapClick}
            >
              <div>
                <h3>{selectedProperty.Address}</h3>
                <p>Price: {selectedProperty.Price}</p>
              </div>
            </InfoWindow>
          )}
        </GoogleMap>
      </LoadScript>
    </div>
  );
};

export default TestMapWithSearch;
