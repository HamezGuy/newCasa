'use client';

import IParagonProperty from '@/types/IParagonProperty';
import { Polygon } from '@react-google-maps/api';
import { APIProvider, InfoWindow, Map, Marker, useMap } from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useState } from 'react';
import PropertySearchResultCard from '../paragon/PropertySearchResultCard';
import { useGeocode } from './GeocodeContext';

const GOOGLE_MAPS_LIBRARIES = ['places']; // Define libraries as a static constant

export function SearchResultsMap({
  properties,
  selectedGeometry,
}: {
  properties: IParagonProperty[];
  selectedGeometry?: {
    bounds?: google.maps.LatLngBounds;
    polygonCoords?: google.maps.LatLngLiteral[];
  };
}) {
  const { geocodeData: selectedGeocodeData } = useGeocode(); // Access geocode data from context
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<IParagonProperty | null>(null);
  const [mapCenter, setMapCenter] = useState<{ lat: number; lng: number } | null>(null);
  const [hasCentered, setHasCentered] = useState(false); // Track if the map has already centered

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

  // Center the map only once when geometry or geocode data changes
  useEffect(() => {
    if (hasCentered) return; // Skip if the map has already centered

    if (selectedGeometry?.bounds) {
      console.log('Snapping map to geometry bounds:', selectedGeometry.bounds);
      const boundsCenter = selectedGeometry.bounds.getCenter().toJSON();
      setMapCenter(boundsCenter);
      setHasCentered(true); // Mark as centered
    } else if (selectedGeocodeData?.location) {
      console.log('Snapping map to geocode location:', selectedGeocodeData.location);
      setMapCenter({
        lat: selectedGeocodeData.location.lat,
        lng: selectedGeocodeData.location.lng,
      });
      setHasCentered(true); // Mark as centered
    } else {
      console.log('Using default center.');
      setMapCenter(defaultCenter);
    }
  }, [selectedGeometry, selectedGeocodeData, hasCentered]);

  const polygonCoords = selectedGeometry?.polygonCoords;

  console.log('Selected Geocode Data received by SearchResultsMap:', selectedGeocodeData);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY} libraries={GOOGLE_MAPS_LIBRARIES}>
      <Map
        center={mapCenter || defaultCenter}
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
}: {
  properties: IParagonProperty[];
  polygonCoords?: { lat: number; lng: number }[];
  onMarkerClick: (property: IParagonProperty) => void;
  infoWindowShown: boolean;
  selectedProperty: IParagonProperty | null;
  onCloseInfoWindow: () => void;
}) {
  const map = useMap();

  useEffect(() => {
    // Only fit bounds once when selectedGeometry changes
    if (!map) return;
    console.log('Map is ready for user interaction.');
  }, [map]);

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
