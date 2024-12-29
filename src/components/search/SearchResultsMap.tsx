'use client';

import IParagonProperty from '@/types/IParagonProperty';
import { GoogleMap, InfoWindow, Polygon } from '@react-google-maps/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import PropertySearchResultCard from '../paragon/PropertySearchResultCard';
import { useGeocode } from './GeocodeContext';
import { useBounds } from '@/components/search/boundscontext';
import axios from 'axios';
import { MarkerClusterer } from '@googlemaps/markerclusterer'; // NEW import

/**
 * Return a signature representing either bounding box or lat-lng.
 */
function makeSnapSignature(basicData: {
  location?: { lat: number; lng: number };
  bounds?: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
}): string | null {
  if (basicData.bounds) {
    const sw = basicData.bounds.southwest;
    const ne = basicData.bounds.northeast;
    return `BBOX:${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
  } else if (basicData.location) {
    return `LOC:${basicData.location.lat},${basicData.location.lng}`;
  }
  return null;
}

interface BasicGeocodeData {
  location?: { lat: number; lng: number };
  bounds?: {
    southwest: { lat: number; lng: number };
    northeast: { lat: number; lng: number };
  };
}

interface SearchResultsMapProps {
  properties: IParagonProperty[];
  selectedGeometry?: {
    bounds?: google.maps.LatLngBounds;
    polygonCoords?: google.maps.LatLngLiteral[];
  };
  onSearchComplete?: () => void;
}

export function SearchResultsMap({
  properties,
  selectedGeometry,
  onSearchComplete,
}: SearchResultsMapProps) {
  console.log('[SearchResultsMap] rendered with properties.length =', properties.length);

  const { geocodeData } = useGeocode();
  const { setBounds } = useBounds();

  // Keep track of the last bounding box or lat-lng we snapped to
  const [lastSnapSignature, setLastSnapSignature] = useState<string | null>(null);

  // Simplify geocode data
  const basicGeocodeData: BasicGeocodeData = {
    location: geocodeData?.location,
    bounds: geocodeData?.bounds,
  };

  // Default center if no location/bounds
  const defaultCenter = { lat: 43.0731, lng: -89.4012 };

  // Reference to the Google Map instance
  const mapRef = useRef<google.maps.Map | null>(null);

  // Container style for the map
  const containerStyle = { width: '100%', height: '100%' };

  // Overpass polygons => “rough” city boundary from OSM (blue)
  const [overpassPolygons, setOverpassPolygons] = useState<google.maps.LatLngLiteral[][]>([]);

  // InfoWindow logic
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<IParagonProperty | null>(null);

  // MarkerClusterer reference:
  const markerClusterRef = useRef<MarkerClusterer | null>(null);

  // We'll store the Google Markers in an array, so we can remove them or re-add them
  const markersRef = useRef<google.maps.Marker[]>([]);

  // ---------------------------------------------
  // onMapLoad => store map ref, reset lastSnapSignature
  // ---------------------------------------------
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setLastSnapSignature(null);

    // Create a clusterer now (empty markers list):
    markerClusterRef.current = new MarkerClusterer({
      map: mapRef.current,
      markers: [], // empty initially
    });
  }, []);

  // ---------------------------------------------
  // handleMapDragEnd => update global bounds
  // ---------------------------------------------
  const handleMapDragEnd = useCallback(() => {
    if (!mapRef.current) return;
    const googleBounds = mapRef.current.getBounds();
    if (!googleBounds) return;

    const newBounds = {
      southwest: {
        lat: googleBounds.getSouthWest()?.lat() ?? 0,
        lng: googleBounds.getSouthWest()?.lng() ?? 0,
      },
      northeast: {
        lat: googleBounds.getNorthEast()?.lat() ?? 0,
        lng: googleBounds.getNorthEast()?.lng() ?? 0,
      },
    };
    setBounds(newBounds);
  }, [setBounds]);

  // ---------------------------------------------
  // handleMapZoomChanged => update global bounds
  // ---------------------------------------------
  const handleMapZoomChanged = useCallback(() => {
    if (!mapRef.current) return;
    const googleBounds = mapRef.current.getBounds();
    if (!googleBounds) return;

    const newBounds = {
      southwest: {
        lat: googleBounds.getSouthWest()?.lat() ?? 0,
        lng: googleBounds.getSouthWest()?.lng() ?? 0,
      },
      northeast: {
        lat: googleBounds.getNorthEast()?.lat() ?? 0,
        lng: googleBounds.getNorthEast()?.lng() ?? 0,
      },
    };
    setBounds(newBounds);
  }, [setBounds]);

  // ---------------------------------------------
  // Marker click => show InfoWindow
  // ---------------------------------------------
  const handleMarkerClick = useCallback((property: IParagonProperty) => {
    setSelectedProperty(property);
    setInfoWindowShown(true);
  }, []);

  // Map click => close InfoWindow
  const handleMapClick = useCallback(() => {
    setInfoWindowShown(false);
    setSelectedProperty(null);
  }, []);

  // ---------------------------------------------
  // Overpass fetch => "real" city boundary
  // ---------------------------------------------
  async function fetchOverpassBoundary(cityName: string) {
    console.log('[SearchResultsMap] fetchOverpassBoundary => city:', cityName);
    try {
      const resp = await axios.get('/api/v1/overpass-boundary', {
        params: { place: cityName },
      });
      // resp.data => { polygons: LatLngLiteral[][] }
      setOverpassPolygons(resp.data.polygons || []);
    } catch (err) {
      console.error('[SearchResultsMap] Overpass fetch error =>', err);
      setOverpassPolygons([]);
    }
  }

  // ---------------------------------------------
  // useEffect => single-snap + Overpass if city
  // ---------------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;

    // 1) If there's selectedGeometry => priority
    if (selectedGeometry?.bounds) {
      const geometrySig = `BBOX:${
        selectedGeometry.bounds.getSouthWest().lat()
      },${selectedGeometry.bounds.getSouthWest().lng()},${selectedGeometry.bounds
        .getNorthEast()
        .lat()},${selectedGeometry.bounds.getNorthEast().lng()}`;

      if (geometrySig !== lastSnapSignature) {
        mapRef.current.setZoom(4);
        mapRef.current.fitBounds(selectedGeometry.bounds, 150);
        setLastSnapSignature(geometrySig);
        onSearchComplete?.();
      }
      return;
    }

    // 2) Snap to bounding box or location from geocode
    const snapSig = makeSnapSignature(basicGeocodeData);

    // If there's no geocode data => show default center
    if (!snapSig) {
      if (lastSnapSignature !== 'DEFAULT') {
        console.log('[SearchResultsMap] snapping to default =>', defaultCenter);
        mapRef.current.setCenter(defaultCenter);
        mapRef.current.setZoom(10);
        setLastSnapSignature('DEFAULT');
      }
      return;
    }

    // If we already snapped to the same place
    if (snapSig === lastSnapSignature) {
      return;
    }

    // bounding box scenario
    if (basicGeocodeData.bounds) {
      console.log('[SearchResultsMap] snapping to bounding box =>', basicGeocodeData.bounds);
      mapRef.current.setZoom(4);
      const literalBounds = new window.google.maps.LatLngBounds(
        basicGeocodeData.bounds.southwest,
        basicGeocodeData.bounds.northeast
      );
      mapRef.current.fitBounds(literalBounds, 150);

      setLastSnapSignature(snapSig);
      onSearchComplete?.();
    } 
    // single location scenario
    else if (basicGeocodeData.location) {
      console.log('[SearchResultsMap] snapping to location =>', basicGeocodeData.location);
      mapRef.current.setZoom(12);
      mapRef.current.setCenter(basicGeocodeData.location);

      setLastSnapSignature(snapSig);
      onSearchComplete?.();
    }

    // 3) If we see a city => fetch Overpass polygon
    const comps = geocodeData?.address_components || [];
    const city = comps.find((c: any) => c.types.includes('locality'))?.long_name;
    if (city) {
      fetchOverpassBoundary(city);
    } else {
      setOverpassPolygons([]);
    }
  }, [
    selectedGeometry,
    basicGeocodeData,
    geocodeData,
    onSearchComplete,
    lastSnapSignature,
    defaultCenter,
  ]);

  // ---------------------------------------------
  // useEffect => Rebuild Markers (for clustering) whenever `properties` changes
  // ---------------------------------------------
  useEffect(() => {
    if (!mapRef.current) return;
    if (!markerClusterRef.current) return;

    // 1) Clear any old markers from cluster
    markerClusterRef.current.clearMarkers();
    // also remove references from markersRef
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 2) Build new markers for each property
    const newMarkers: google.maps.Marker[] = properties
      .filter((p) => p.Latitude && p.Longitude)
      .map((p) => {
        const marker = new google.maps.Marker({
          position: { lat: p.Latitude!, lng: p.Longitude! },
        });
        // On click => show InfoWindow
        marker.addListener('click', () => handleMarkerClick(p));
        return marker;
      });

    markersRef.current = newMarkers;

    // 3) Add them to the cluster
    markerClusterRef.current.addMarkers(newMarkers);
  }, [properties, handleMarkerClick]);

  // If there's a selectedGeometry polygon
  const polygonCoords = selectedGeometry?.polygonCoords;

  return (
    <div style={{ width: '100%', height: '100%' }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        onDragEnd={handleMapDragEnd}
        onZoomChanged={handleMapZoomChanged}
        options={{
          disableDefaultUI: true,
          draggable: true,
          gestureHandling: 'greedy',
        }}
      >
        {/* We removed <Marker> elements from the JSX 
            because MarkerClusterer manages the markers. */}

        {/* Overpass polygons => city boundary */}
        {overpassPolygons.map((coords, idx) => (
          <Polygon
            key={idx}
            paths={coords}
            options={{
              fillColor: '#22ccff',
              fillOpacity: 0.3,
              strokeColor: '#22ccff',
              strokeOpacity: 1,
              strokeWeight: 2,
            }}
          />
        ))}

        {/* If there's a selectedGeometry polygon, show it */}
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

        {/* InfoWindow */}
        {infoWindowShown && selectedProperty && (
          <InfoWindow
            position={{
              lat: selectedProperty.Latitude ?? 0,
              lng: selectedProperty.Longitude ?? 0,
            }}
            onCloseClick={() => setInfoWindowShown(false)}
          >
            <PropertySearchResultCard property={selectedProperty} size="sm" />
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
