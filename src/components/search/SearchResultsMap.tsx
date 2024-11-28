'use client';

import IParagonProperty from '@/types/IParagonProperty';
import { Polygon } from '@react-google-maps/api';
import {
  AdvancedMarker,
  AdvancedMarkerProps,
  APIProvider,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { useCallback, useEffect, useState } from 'react';
import PropertySearchResultCard from '../paragon/PropertySearchResultCard';

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

export const AdvancedMarkerWithRef = (
  props: AdvancedMarkerProps & {
    onMarkerClick: (marker: google.maps.marker.AdvancedMarkerElement) => void;
  }
) => {
  const { children, onMarkerClick, ...advancedMarkerProps } = props;
  const [markerRef, marker] = useAdvancedMarkerRef();

  return (
    <AdvancedMarker
      onClick={() => {
        if (marker) {
          onMarkerClick(marker);
        }
      }}
      ref={markerRef}
      {...advancedMarkerProps}
    >
      {children}
    </AdvancedMarker>
  );
};

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
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] =
    useState<IParagonProperty | null>(null);
  const [selectedMarker, setSelectedMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const GOOGLE_MAPS_API_KEY = 'AIzaSyAhPp5mHXCLCKZI2QSolcIUONI3ceZ-Zcc';
  const defaultCenter = { lat: 43.0731, lng: -89.4012 }; // Example: Madison, WI

  const handleMarkerClick = useCallback(
    (propertyId: string, marker?: any) => {
      setSelectedProperty(
        properties.find((p) => p.ListingId === propertyId) ?? null
      );

      if (marker) {
        setSelectedMarker(marker);
      }

      if (propertyId !== selectedProperty?.ListingId) {
        setInfoWindowShown(true);
      } else {
        setInfoWindowShown((isShown) => !isShown);
      }
    },
    [selectedProperty, properties]
  );

  const onMapClick = useCallback(() => {
    setSelectedProperty(null);
    setInfoWindowShown(false);
  }, []);

  const mapCenter = selectedGeometry?.bounds
    ? {
        lat:
          (selectedGeometry.bounds.getNorthEast().lat() +
            selectedGeometry.bounds.getSouthWest().lat()) / 2,
        lng:
          (selectedGeometry.bounds.getNorthEast().lng() +
            selectedGeometry.bounds.getSouthWest().lng()) / 2,
      }
    : getMapCenter(properties, defaultCenter);

  useEffect(() => {
    if (mapCenter.lat === defaultCenter.lat && mapCenter.lng === defaultCenter.lng) {
      console.warn('Using fallback map center due to missing property data or bounds.');
    }
  }, [mapCenter]);

  return (
    <APIProvider apiKey={GOOGLE_MAPS_API_KEY}>
      <Map
        defaultCenter={mapCenter}
        defaultZoom={12}
        disableDefaultUI={true}
        onClick={onMapClick}
        mapId="8c1f1e07f191046d"
      >
        {/* Render Property Markers */}
        {properties.map((property) =>
          property.Latitude && property.Longitude ? (
            <AdvancedMarkerWithRef
              key={property.ListingId}
              position={{ lat: property.Latitude, lng: property.Longitude }}
              onMarkerClick={(marker) => handleMarkerClick(property.ListingId, marker)}
            >
              <Pin />
            </AdvancedMarkerWithRef>
          ) : null
        )}

        {/* Render Polygon for Location Outline */}
        {selectedGeometry?.polygonCoords && (
          <Polygon
            paths={selectedGeometry.polygonCoords}
            options={{
              fillColor: '#22ccff',
              fillOpacity: 0.2,
              strokeColor: '#1e89a1',
              strokeOpacity: 0.8,
              strokeWeight: 2,
            }}
          />
        )}

        {/* Render Info Window for Selected Property */}
        {infoWindowShown && selectedMarker && selectedProperty && (
          <InfoWindow
            position={{
              lat: selectedProperty.Latitude ?? 0,
              lng: selectedProperty.Longitude ?? 0,
            }}
            onCloseClick={() => setInfoWindowShown(false)}
            headerDisabled={true}
            style={{ maxWidth: 250 }}
          >
            <PropertySearchResultCard property={selectedProperty} size="sm" />
          </InfoWindow>
        )}
      </Map>
    </APIProvider>
  );
}
