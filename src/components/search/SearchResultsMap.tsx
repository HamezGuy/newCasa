'use client';
import IParagonProperty from '@/types/IParagonProperty';
import {
  AdvancedMarker,
  AdvancedMarkerProps,
  APIProvider,
  InfoWindow,
  Map,
  Pin,
  useAdvancedMarkerRef,
} from '@vis.gl/react-google-maps';
import { useCallback, useState } from 'react';
import PropertySearchResultCard from '../paragon/PropertySearchResultCard';

function getMapCenter(properties: IParagonProperty[]) {
  let nMarkers = 0;
  let sumLat = 0;
  let sumLng = 0;

  for (const property of properties) {
    if (property.Latitude && property.Longitude) {
      sumLat += property.Latitude;
      sumLng += property.Longitude;
      nMarkers++;
    }
  }

  if (nMarkers == 0) {
    console.error('could not locate map center');
    return undefined;
  }

  return { lat: sumLat / nMarkers, lng: sumLng / nMarkers };
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

  // TODO: fix possible infinte loop
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

  return properties.map((property, index) => {
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
          background={selectedId === id ? '#22ccff' : null}
          borderColor={selectedId === id ? '#1e89a1' : null}
          glyphColor={selectedId === id ? '#0f677a' : null}
        />
      </AdvancedMarkerWithRef>
    );
  });
}

export function ResultsMap({ properties }: { properties: IParagonProperty[] }) {
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] =
    useState<IParagonProperty | null>(null);
  const [selectedMarker, setSelectedMarker] =
    useState<google.maps.marker.AdvancedMarkerElement | null>(null);

  const handleMarkerClick = useCallback(
    (propertyId: string, marker?: any) => {
      setSelectedProperty(
        properties.find((p) => p.ListingId == propertyId) ?? null
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

  if (!process.env.NEXT_PUBLIC_GOOGLE_MAPS_API)
    return <p>No Google Maps API Key found</p>;

  const mapCenter = getMapCenter(properties);

  return (
    <>
      <APIProvider apiKey={process.env.NEXT_PUBLIC_GOOGLE_MAPS_API}>
        <Map
          defaultCenter={mapCenter}
          defaultZoom={15}
          disableDefaultUI={true}
          onClick={onMapClick}
          mapId={'8c1f1e07f191046d'}
        >
          <ResultMarkers
            properties={properties}
            onMarkerClick={handleMarkerClick}
          />
          {infoWindowShown && selectedMarker && selectedProperty && (
            <InfoWindow
              anchor={selectedMarker}
              headerDisabled={true}
              style={{ maxWidth: 250 }}
            >
              <PropertySearchResultCard property={selectedProperty} size="sm" />
            </InfoWindow>
          )}
        </Map>
      </APIProvider>
    </>
  );
}
