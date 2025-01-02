"use client";

import IParagonProperty from "@/types/IParagonProperty";
import { GoogleMap, InfoWindow, Polygon } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropertySearchResultCard from "../paragon/PropertySearchResultCard";
import { useGeocode } from "./GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import axios from "axios";
import { MarkerClusterer } from "@googlemaps/markerclusterer";

interface ILatLng {
  lat: number;
  lng: number;
}

interface BasicGeocodeData {
  location?: ILatLng;
  bounds?: {
    southwest: ILatLng;
    northeast: ILatLng;
  };
}

// Export the props interface
export interface SearchResultsMapProps {
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
  console.log("[SearchResultsMap] rendered with properties.length =", properties.length);

  // ------------------------------------------------------------------------
  // Global contexts
  // ------------------------------------------------------------------------
  const { geocodeData } = useGeocode();
  const { setBounds } = useBounds();

  // ------------------------------------------------------------------------
  // Internal state
  // ------------------------------------------------------------------------
  const [lastSnapSignature, setLastSnapSignature] = useState<string | null>(null);
  const [overpassPolygons, setOverpassPolygons] = useState<google.maps.LatLngLiteral[][]>([]);
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<IParagonProperty | null>(null);

  // NEW => track if map & clusterer are fully ready
  const [mapIsReady, setMapIsReady] = useState(false);

  // ------------------------------------------------------------------------
  // Memoized values
  // ------------------------------------------------------------------------
  const basicGeocodeData = useMemo<BasicGeocodeData>(() => {
    return {
      location: geocodeData?.location,
      bounds: geocodeData?.bounds,
    };
  }, [geocodeData?.location, geocodeData?.bounds]);

  const defaultCenter = useMemo(() => ({ lat: 43.0731, lng: -89.4012 }), []);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);

  // ------------------------------------------------------------------------
  // Refs
  // ------------------------------------------------------------------------
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerClusterRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // ------------------------------------------------------------------------
  // Helper => build a signature for bounding box or lat-lng
  // ------------------------------------------------------------------------
  function makeSnapSignature(data: BasicGeocodeData): string | null {
    if (data.bounds) {
      const sw = data.bounds.southwest;
      const ne = data.bounds.northeast;
      return `BBOX:${sw.lat},${sw.lng},${ne.lat},${ne.lng}`;
    } else if (data.location) {
      return `LOC:${data.location.lat},${data.location.lng}`;
    }
    return null;
  }

  // ------------------------------------------------------------------------
  // onMapLoad => create MarkerClusterer
  // ------------------------------------------------------------------------
  const onMapLoad = useCallback((map: google.maps.Map) => {
    mapRef.current = map;
    setLastSnapSignature(null);

    // Safely create the clusterer once the map is loaded
    try {
      markerClusterRef.current = new MarkerClusterer({ map, markers: [] });
      // Mark the map as “ready”
      setMapIsReady(true);
    } catch (err) {
      console.error("Error creating MarkerClusterer =>", err);
      markerClusterRef.current = null;
      setMapIsReady(false);
    }
  }, []);

  // ------------------------------------------------------------------------
  // handleMapDragEnd & handleMapZoomChanged => update global bounds
  // ------------------------------------------------------------------------
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

  // ------------------------------------------------------------------------
  // Marker click => show InfoWindow
  // ------------------------------------------------------------------------
  const handleMarkerClick = useCallback((property: IParagonProperty) => {
    setSelectedProperty(property);
    setInfoWindowShown(true);
  }, []);

  // Map click => close InfoWindow
  const handleMapClick = useCallback(() => {
    setInfoWindowShown(false);
    setSelectedProperty(null);
  }, []);

  // ------------------------------------------------------------------------
  // Overpass fetch => city boundary polygons
  // ------------------------------------------------------------------------
  async function fetchOverpassBoundary(cityName: string) {
    console.log("[SearchResultsMap] fetchOverpassBoundary => city:", cityName);
    try {
      const resp = await axios.get("/api/v1/overpass-boundary", {
        params: { place: cityName },
      });
      setOverpassPolygons(resp.data.polygons || []);
    } catch (err) {
      console.error("[SearchResultsMap] Overpass fetch error =>", err);
      setOverpassPolygons([]);
    }
  }

  // ------------------------------------------------------------------------
  // Snap to bounding box or location when geocode changes
  // ------------------------------------------------------------------------
  useEffect(() => {
    // Wait until the map & clusterer are ready
    if (!mapIsReady || !mapRef.current) return;

    // 1) If there's selectedGeometry => priority
    if (selectedGeometry?.bounds) {
      const geometrySig = `BBOX:${
        selectedGeometry.bounds.getSouthWest().lat()
      },${selectedGeometry.bounds.getSouthWest().lng()},${selectedGeometry.bounds
        .getNorthEast()
        .lat()},${selectedGeometry.bounds.getNorthEast().lng()}`;

      if (geometrySig !== lastSnapSignature) {
        console.log("[SearchResultsMap] snapping to selectedGeometry bounds");
        mapRef.current.setZoom(4);
        mapRef.current.fitBounds(selectedGeometry.bounds, 150);
        setLastSnapSignature(geometrySig);
        onSearchComplete?.();
      }
      return;
    }

    // 2) Otherwise, snap to bounding box or lat-lng from geocode
    const snapSig = makeSnapSignature(basicGeocodeData);
    if (!snapSig) {
      // If there's no geocode data => show default center
      if (lastSnapSignature !== "DEFAULT") {
        console.log("[SearchResultsMap] snapping to default =>", defaultCenter);
        mapRef.current.setCenter(defaultCenter);
        mapRef.current.setZoom(10);
        setLastSnapSignature("DEFAULT");
      }
      return;
    }

    // If we already snapped to this place, do nothing
    if (snapSig === lastSnapSignature) {
      return;
    }

    // bounding box scenario
    if (basicGeocodeData.bounds) {
      console.log("[SearchResultsMap] snapping to bounding box =>", basicGeocodeData.bounds);
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
      console.log("[SearchResultsMap] snapping to location =>", basicGeocodeData.location);
      mapRef.current.setZoom(12);
      mapRef.current.setCenter(basicGeocodeData.location);
      setLastSnapSignature(snapSig);
      onSearchComplete?.();
    }

    // 3) If there's a city => fetch Overpass boundary
    const comps = geocodeData?.address_components || [];
    const city = comps.find((c: any) => c.types.includes("locality"))?.long_name;
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
    mapIsReady, // watch for readiness
  ]);

  // ------------------------------------------------------------------------
  // Rebuild Markers (for clustering) when `properties` changes
  // ------------------------------------------------------------------------
  useEffect(() => {
    // If the map or markerCluster isn't ready, skip
    if (!mapIsReady || !mapRef.current || !markerClusterRef.current) {
      return;
    }

    // Attempt to clear existing markers
    try {
      markerClusterRef.current.clearMarkers();
    } catch (error) {
      console.error("Could not clear markers from clusterer:", error);
      // If clearing fails, bail out
      return;
    }

    // Remove from map if any leftover
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // 2) Create new markers from property lat/lng
    const newMarkers: google.maps.Marker[] = properties
      .filter((p) => p.Latitude && p.Longitude)
      .map((p) => {
        const marker = new google.maps.Marker({
          position: { lat: p.Latitude!, lng: p.Longitude! },
        });
        marker.addListener("click", () => handleMarkerClick(p));
        return marker;
      });

    markersRef.current = newMarkers;

    // 3) Add them to the cluster
    try {
      markerClusterRef.current.addMarkers(newMarkers);
    } catch (error) {
      console.error("Could not add markers to clusterer:", error);
    }
  }, [properties, handleMarkerClick, mapIsReady]);

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------
  const polygonCoords = selectedGeometry?.polygonCoords;

  return (
    <div style={{ width: "100%", height: "100%" }}>
      <GoogleMap
        mapContainerStyle={containerStyle}
        onLoad={onMapLoad}
        onClick={handleMapClick}
        onDragEnd={handleMapDragEnd}
        onZoomChanged={handleMapZoomChanged}
        options={{
          disableDefaultUI: true,
          draggable: true,
          gestureHandling: "greedy",
        }}
      >
        {/* MarkerClusterer manages markers => no <Marker> here */}

        {/* Overpass polygons => city boundary */}
        {overpassPolygons.map((coords, idx) => (
          <Polygon
            key={idx}
            paths={coords}
            options={{
              fillColor: "#22ccff",
              fillOpacity: 0.3,
              strokeColor: "#22ccff",
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
              fillColor: "#22ccff",
              fillOpacity: 0.2,
              strokeColor: "#1e89a1",
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
