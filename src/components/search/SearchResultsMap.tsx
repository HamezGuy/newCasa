'use client';

import IParagonProperty from '@/types/IParagonProperty';
import { Polygon } from '@react-google-maps/api';
import { APIProvider, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useState } from 'react';
import PropertySearchResultCard from '../paragon/PropertySearchResultCard';

// Helper function to calculate map center
function getMapCenter(properties: IParagonProperty[], fallback: { lat: number; lng: number }) {
  const validProperties = properties.filter(
    (property) => property.Latitude !== undefined && property.Longitude !== undefined
  );

  if (validProperties.length === 0) {
    console.warn('Could not locate map center. Defaulting to fallback center.');
    return fallback;
  }

  const sumLat = validProperties.reduce((acc, property) => acc + property.Latitude!, 0);
  const sumLng = validProperties.reduce((acc, property) => acc + property.Longitude!, 0);

  return { lat: sumLat / validProperties.length, lng: sumLng / validProperties.length };
}

export function SearchResultsMap({
  properties,
  selectedGeocodeData,
}: {
  properties: IParagonProperty[];
  selectedGeocodeData?: any;
}) {
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<IParagonProperty | null>(null);

  const GOOGLE_MAPS_API_KEY = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API;

  if (!GOOGLE_MAPS_API_KEY) {
    console.error('Google Maps API key is missing. Check your .env.local configuration.');
    return <p>Error: Google Maps API key is not provided.</p>;
  }

  const defaultCenter = { lat: 43.0731, lng: -89.4012 };

  const handleMarkerClick = useCallback(
    (property: IParagonProperty) => {
      setSelectedProperty(property);
      setInfoWindowShown(true);
    },
    []
  );

  const onMapClick = useCallback(() => {
    setSelectedProperty(null);
    setInfoWindowShown(false);
  }, []);

  const mapCenter = properties.length > 0
    ? getMapCenter(properties, defaultCenter)
    : defaultCenter;

  const polygonCoords = selectedGeocodeData?.bounds
    ? [
        { lat: selectedGeocodeData.bounds.northeast.lat, lng: selectedGeocodeData.bounds.northeast.lng },
        { lat: selectedGeocodeData.bounds.southwest.lat, lng: selectedGeocodeData.bounds.northeast.lng },
        { lat: selectedGeocodeData.bounds.southwest.lat, lng: selectedGeocodeData.bounds.southwest.lng },
        { lat: selectedGeocodeData.bounds.northeast.lat, lng: selectedGeocodeData.bounds.southwest.lng },
      ]
    : undefined;

  // Logging selected geocode data
  console.log('Selected Geocode Data received by SearchResultsMap:', selectedGeocodeData);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        center={mapCenter}
        defaultZoom={12}
        disableDefaultUI={true}
        onClick={onMapClick}
        mapId="8c1f1e07f191046d"
        style={{ minHeight: '400px', minWidth: '100%' }}
      >
        <MapContent
          properties={properties}
          polygonCoords={polygonCoords}
          onMarkerClick={handleMarkerClick}
          infoWindowShown={infoWindowShown}
          selectedProperty={selectedProperty}
          onCloseInfoWindow={() => setInfoWindowShown(false)}
          selectedGeocodeData={selectedGeocodeData}
        />
      </Map>
    </APIProvider>
  );
}

function MapContent({
  properties,
  polygonCoords,
  onMarkerClick,
  infoWindowShown,
  selectedProperty,
  onCloseInfoWindow,
  selectedGeocodeData,
}: {
  properties: IParagonProperty[];
  polygonCoords?: { lat: number; lng: number }[];
  onMarkerClick: (property: IParagonProperty) => void;
  infoWindowShown: boolean;
  selectedProperty: IParagonProperty | null;
  onCloseInfoWindow: () => void;
  selectedGeocodeData?: any;
}) {
  const map = useMap();

  useEffect(() => {
    if (!map) return;

    if (selectedGeocodeData?.bounds) {
      console.log('Fitting map to bounds in search map location:', selectedGeocodeData.bounds);
      const bounds = new google.maps.LatLngBounds(
        selectedGeocodeData.bounds.southwest,
        selectedGeocodeData.bounds.northeast
      );
      map.fitBounds(bounds);
    } else if (selectedGeocodeData?.location) {
      const location = new google.maps.LatLng(
        selectedGeocodeData.location.lat,
        selectedGeocodeData.location.lng
      );
      console.log('Panning to location:', location);
      map.panTo(location);
      map.setZoom(14);
    } else {
      console.log('No bounds or location available in selectedGeocodeData.');
    }
  }, [map, selectedGeocodeData]);

  console.log('MapContent Props:');
  console.log('Polygon Coords:', polygonCoords);
  console.log('Selected Geocode Data:', selectedGeocodeData);

  return (
    <>
      {properties.map(
        (property) =>
          property.Latitude &&
          property.Longitude && (
            <Marker
              key={property.ListingId}
              position={{ lat: property.Latitude, lng: property.Longitude }}
              onClick={() => onMarkerClick(property)}
            />
          )
      )}

      {polygonCoords && (
        <Polygon
          paths={polygonCoords}
          options={{
            fillColor: '#22ccff',
            fillOpacity: 0.2,
            strokeColor: '#1e89a1',
            strokeOpacity: 0.8,
            strokeWeight: 2,
          }}
        />
      )}

      {infoWindowShown && selectedProperty && (
        <InfoWindow
          position={{
            lat: selectedProperty.Latitude ?? 0,
            lng: selectedProperty.Longitude ?? 0,
          }}
          onCloseClick={onCloseInfoWindow}
        >
          <PropertySearchResultCard property={selectedProperty} size="sm" />
        </InfoWindow>
      )}
    </>
  );
}
