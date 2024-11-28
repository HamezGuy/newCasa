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

// Mock property data for testing
const mockProperties: Property[] = [
  {
    ListingId: '1',
    Latitude: 43.073051,
    Longitude: -89.40123,
    Address: '123 Main St, Madison, WI',
    Price: '$350,000',
  },
  {
    ListingId: '2',
    Latitude: 43.083051,
    Longitude: -89.41123,
    Address: '456 Elm St, Madison, WI',
    Price: '$450,000',
  },
];

const TestMapWithSearch = () => {
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [selectedProperty, setSelectedProperty] = useState<Property | null>(null);
  const [polygonCoords, setPolygonCoords] = useState<{ lat: number; lng: number }[] | null>(null);

  const autocompleteRef = useRef<google.maps.places.Autocomplete | null>(null);

  const mapContainerStyle = {
    width: '100%',
    height: '100vh',
  };

  const mapCenter = selectedLocation || { lat: 43.0731, lng: -89.4012 }; // Default to Madison, WI

  const polygonOptions = {
    fillColor: '#22ccff',
    fillOpacity: 0.2,
    strokeColor: '#1e89a1',
    strokeOpacity: 0.8,
    strokeWeight: 2,
  };

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

  const handleMarkerClick = useCallback((property: Property) => {
    setSelectedProperty(property);
  }, []);

  const handleMapClick = useCallback(() => {
    setSelectedProperty(null);
  }, []);

  return (
    <div style={{ height: '100vh', width: '100%' }}>
      <LoadScript
        googleMapsApiKey={GOOGLE_MAPS_API_KEY}
        libraries={['places']}
      >
        {/* Search Bar */}
        <div style={{ position: 'absolute', zIndex: 10, top: 10, left: 10, display: 'flex', alignItems: 'center' }}>
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
          {mockProperties.map((property) => (
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
