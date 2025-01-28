"use client";

import IParagonProperty from "@/types/IParagonProperty";
import { GoogleMap, InfoWindow } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropertySearchResultCard from "../paragon/PropertySearchResultCard";
import { useGeocode } from "./GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import axios from "axios";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Button } from "@mantine/core"; // or any UI library

// ----------------------------------------------
// Types
// ----------------------------------------------
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

export interface SearchResultsMapProps {
  properties: IParagonProperty[];
  selectedGeometry?: {
    bounds?: google.maps.LatLngBounds;
    polygonCoords?: google.maps.LatLngLiteral[];
  };
  onSearchComplete?: () => void;
  isPropertiesLoading?: boolean; // indicates an API fetch is ongoing
}

export function SearchResultsMap({
  properties,
  selectedGeometry,
  onSearchComplete,
  isPropertiesLoading = false,
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

  // We keep Overpass polygons in state, but won't render them
  const [overpassPolygons, setOverpassPolygons] = useState<google.maps.LatLngLiteral[][]>([]);

  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<IParagonProperty | null>(null);

  // Track if map & clusterer are fully ready
  const [mapIsReady, setMapIsReady] = useState(false);

  // Overpass boundary loading
  const [isBoundaryLoading, setIsBoundaryLoading] = useState(false);

  // Combine => if the map isn't ready OR Overpass boundary is loading OR parent's fetch => show overlay
  const isLoading = !mapIsReady || isBoundaryLoading || isPropertiesLoading;

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
    console.log("[SearchResultsMap] onMapLoad => map loaded, creating clusterer...");
    mapRef.current = map;
    setLastSnapSignature(null);

    try {
      markerClusterRef.current = new MarkerClusterer({ map, markers: [] });
      console.log("[SearchResultsMap] MarkerClusterer created successfully");
      setMapIsReady(true);
    } catch (err) {
      console.error("[SearchResultsMap] Error creating MarkerClusterer =>", err);
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
    setIsBoundaryLoading(true);
    try {
      const resp = await axios.get("/api/v1/overpass-boundary", {
        params: { place: cityName },
      });
      setOverpassPolygons(resp.data.polygons || []);
    } catch (err) {
      console.error("[SearchResultsMap] Overpass fetch error =>", err);
      setOverpassPolygons([]);
    } finally {
      setIsBoundaryLoading(false);
    }
  }

  // ------------------------------------------------------------------------
  // Snap to bounding box or location when geocode changes
  // ------------------------------------------------------------------------
  useEffect(() => {
    if (!mapIsReady || !mapRef.current) return;

    // 1) If there's selectedGeometry => priority
    if (selectedGeometry?.bounds) {
      const geometrySig = `BBOX:${
        selectedGeometry.bounds.getSouthWest().lat()
      },${selectedGeometry.bounds.getSouthWest().lng()},${selectedGeometry.bounds
        .getNorthEast()
        .lat()},${selectedGeometry.bounds.getNorthEast().lng()}`;
      if (geometrySig !== lastSnapSignature) {
        console.log("[SearchResultsMap] snapping to selectedGeometry bounds, geometrySig:", geometrySig);

        mapRef.current.fitBounds(selectedGeometry.bounds, 150);

        setLastSnapSignature(geometrySig);
        onSearchComplete?.();
      }
      return;
    }

    // 2) Otherwise, bounding box or lat-lng from geocode
    const snapSig = makeSnapSignature(basicGeocodeData);
    if (!snapSig) {
      // No geocode => default
      if (lastSnapSignature !== "DEFAULT") {
        console.log("[SearchResultsMap] snapping to default =>", defaultCenter);
        mapRef.current.setCenter(defaultCenter);
        mapRef.current.setZoom(10);
        setLastSnapSignature("DEFAULT");
      }
      return;
    }
    if (snapSig === lastSnapSignature) {
      console.log("[SearchResultsMap] Already snapped to this place. Doing nothing.");
      return;
    }

    if (basicGeocodeData.bounds) {
      console.log("[SearchResultsMap] snapping to bounding box =>", basicGeocodeData.bounds);

      // If bounding box is huge => clamp
      const sw = basicGeocodeData.bounds.southwest;
      const ne = basicGeocodeData.bounds.northeast;
      const latDiff = Math.abs(ne.lat - sw.lat);
      const lngDiff = Math.abs(ne.lng - sw.lng);
      if (latDiff > 15 || lngDiff > 15) {
        console.warn("[SearchResultsMap] bounding box is huge => fallback to a reasonable zoom");
        const centerLat = (sw.lat + ne.lat) / 2;
        const centerLng = (sw.lng + ne.lng) / 2;
        mapRef.current.setCenter({ lat: centerLat, lng: centerLng });
        mapRef.current.setZoom(5);
      } else {
        const literalBounds = new window.google.maps.LatLngBounds(sw, ne);
        mapRef.current.fitBounds(literalBounds, 150);
      }

      setLastSnapSignature(snapSig);
      onSearchComplete?.();
    } else if (basicGeocodeData.location) {
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
      console.log("[SearchResultsMap] found city =>", city, " => calling fetchOverpassBoundary");
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
    mapIsReady,
  ]);

  // ------------------------------------------------------------------------
  // Rebuild Markers (for clustering) when `properties` changes
  // ------------------------------------------------------------------------
  useEffect(() => {
    console.log("[SearchResultsMap] useEffect => properties changed. properties.length:", properties.length);
    if (!mapIsReady || !mapRef.current || !markerClusterRef.current) {
      console.log("[SearchResultsMap] map is not ready => skipping marker build");
      return;
    }

    try {
      markerClusterRef.current.clearMarkers();
    } catch (error) {
      console.error("[SearchResultsMap] Could not clear markers from clusterer:", error);
      return;
    }

    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

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

    try {
      markerClusterRef.current.addMarkers(newMarkers);
    } catch (error) {
      console.error("[SearchResultsMap] Could not add markers to clusterer:", error);
    }
  }, [properties, handleMarkerClick, mapIsReady]);

  // ------------------------------------------------------------------------
  // Zoom Handlers
  // ------------------------------------------------------------------------
  const handleZoomIn = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() ?? 10;
      mapRef.current.setZoom(currentZoom + 1);
    }
  }, []);

  const handleZoomOut = useCallback(() => {
    if (mapRef.current) {
      const currentZoom = mapRef.current.getZoom() ?? 10;
      mapRef.current.setZoom(currentZoom - 1);
    }
  }, []);

  // ------------------------------------------------------------------------
  // Render
  // ------------------------------------------------------------------------
  // CHANGED => We still retrieve polygonCoords from selectedGeometry, but won't render them.
  const polygonCoords = selectedGeometry?.polygonCoords;

  return (
    <div
      style={{
        width: "100%",
        height: "100%",
        cursor: isLoading ? "wait" : "auto",
        position: "relative",
        overflow: "hidden",
      }}
    >
      {/* LOADING OVERLAY */}
      {isLoading && (
        <div
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            zIndex: 9999,
            backgroundColor: "rgba(255,255,255,0.5)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>
            Loading...
          </div>
        </div>
      )}

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
        {/* REMOVED => Overpass polygons => city boundary 
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
        ))} */}

        {/* REMOVED => If there's a selectedGeometry polygon, show it 
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
        )} */}

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

      {/* Custom Zoom Controls */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          right: "20px",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          zIndex: 9999,
        }}
      >
        <Button
          onClick={handleZoomIn}
          size="md"
          className="
            font-bold
            text-sm
            w-8
            h-8
            lg:w-12
            lg:h-12
            lg:text-xl
          "
          styles={{
            root: {
              backgroundColor: "rgba(30, 144, 255, 0.9)",
              color: "#fff",
              border: "1px solid rgba(30, 144, 255, 0.6)",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              WebkitTextFillColor: "#fff",
              width: "auto",
              height: "auto",
              "&:hover": {
                backgroundColor: "rgba(30, 144, 255, 1.0)",
              },
            },
          }}
        >
          +
        </Button>

        <Button
          onClick={handleZoomOut}
          size="md"
          className="
            font-bold
            text-sm
            w-8
            h-8
            lg:w-12
            lg:h-12
            lg:text-xl
          "
          styles={{
            root: {
              backgroundColor: "rgba(30, 144, 255, 0.9)",
              color: "#fff",
              border: "1px solid rgba(30, 144, 255, 0.6)",
              borderRadius: "8px",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              WebkitTextFillColor: "#fff",
              width: "auto",
              height: "auto",
              "&:hover": {
                backgroundColor: "rgba(30, 144, 255, 1.0)",
              },
            },
          }}
        >
          -
        </Button>
      </div>
    </div>
  );
}
