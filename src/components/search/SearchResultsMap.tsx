'use client';

import IParagonProperty from '@/types/IParagonProperty';
import { GoogleMap, InfoWindow, Marker, Polygon } from '@react-google-maps/api';
import { useCallback, useEffect, useRef, useState } from 'react';
import PropertySearchResultCard from '../paragon/PropertySearchResultCard';
import { useGeocode } from './GeocodeContext';
import { useBounds } from '@/components/search/boundscontext';
import axios from 'axios'; // used for Overpass fetch, etc.

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

  // Access geocode data + bounds context
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

  // Overpass polygons => “rough” city boundary from OSM (now **blue**)
  const [overpassPolygons, setOverpassPolygons] = useState<google.maps.LatLngLiteral[][]>([]);

  // InfoWindow logic
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<IParagonProperty | null>(null);

  // ---------------------------------------------
  // onMapLoad => store map ref, reset lastSnapSignature
  // ---------------------------------------------
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setLastSnapSignature(null);
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
        lat: googleBounds.getSouthWest().lat(),
        lng: googleBounds.getSouthWest().lng(),
      },
      northeast: {
        lat: googleBounds.getNorthEast().lat(),
        lng: googleBounds.getNorthEast().lng(),
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
        lat: googleBounds.getSouthWest().lat(),
        lng: googleBounds.getSouthWest().lng(),
      },
      northeast: {
        lat: googleBounds.getNorthEast().lat(),
        lng: googleBounds.getNorthEast().lng(),
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
    if (!snapSig) {
      if (lastSnapSignature !== 'DEFAULT') {
        console.log('[SearchResultsMap] snapping to default =>', defaultCenter);
        mapRef.current.setCenter(defaultCenter);
        setLastSnapSignature('DEFAULT');
      }
      return;
    }

    if (snapSig === lastSnapSignature) {
      return;
    }

    // bounding box
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

    } else if (basicGeocodeData.location) {
      // single location
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
        {/* Markers */}
        {properties.map((p) =>
          p.Latitude && p.Longitude ? (
            <Marker
              key={p.ListingId}
              position={{ lat: p.Latitude, lng: p.Longitude }}
              onClick={() => handleMarkerClick(p)}
            />
          ) : null
        )}

        {/* Overpass polygons => “rough” city boundary from OSM (BLUE now) */}
        {overpassPolygons.map((coords, idx) => (
          <Polygon
            key={idx}
            paths={coords}
            options={{
              fillColor: '#22ccff',  // <<-- BLUE
              fillOpacity: 0.3,
              strokeColor: '#22ccff',  // <<-- BLUE
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
