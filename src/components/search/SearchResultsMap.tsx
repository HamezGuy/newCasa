'use client';

import IParagonProperty from '@/types/IParagonProperty';
import { Polygon } from '@react-google-maps/api'; // Ensure the correct library is used
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

function getMapCenter(properties: IParagonProperty[]) {
  const validProperties = properties.filter(
    (property) => property.Latitude !== undefined && property.Longitude !== undefined
  );

  if (validProperties.length === 0) {
    console.warn('Could not locate map center. Defaulting to fallback center.');
    return { lat: 43.0731, lng: -89.4012 }; // Example: Madison, WI
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

function ResultMarkers({
  properties,
  onMarkerClick,
}: {
  properties: IParagonProperty[];
  onMarkerClick?: (
    property: string,
    marker: google.maps.marker.AdvancedMarkerElement
  ) => void;
}) {
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const markerClickHandler = useCallback(
    (propertyId: string, marker?: any) => {
      setSelectedId(propertyId);

      if (onMarkerClick && marker) {
        onMarkerClick(propertyId, marker);
      }
    },
    [onMarkerClick]
  );

  if (!properties) return null;

  return (
    <>
      {properties.map((property, index) => {
        if (!property.Latitude || !property.Longitude) {
          console.log(`Property ${property.ListingId} is missing geocoding`);
          return null;
        }

        const id = property.ListingId;

        return (
          <AdvancedMarkerWithRef
            key={index}
            position={{ lat: property.Latitude, lng: property.Longitude }}
            onMarkerClick={(marker) => markerClickHandler(id, marker)}
          >
            <Pin
              background={selectedId === id ? '#22ccff' : undefined}
              borderColor={selectedId === id ? '#1e89a1' : undefined}
              glyphColor={selectedId === id ? '#0f677a' : undefined}
            />
          </AdvancedMarkerWithRef>
        );
      })}
    </>
  );
}

export function ResultsMap({
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
    : getMapCenter(properties);

  useEffect(() => {
    if (mapCenter.lat === defaultCenter.lat && mapCenter.lng === defaultCenter.lng) {
      console.warn('Using fallback map center due to missing property data.');
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
        <ResultMarkers properties={properties} onMarkerClick={handleMarkerClick} />

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
