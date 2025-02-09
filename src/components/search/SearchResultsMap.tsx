"use client";

import IParagonProperty from "@/types/IParagonProperty";
import { GoogleMap, InfoWindow } from "@react-google-maps/api";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import PropertySearchResultCard from "../paragon/PropertySearchResultCard";
import { useGeocode } from "./GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import axios from "axios";
import { MarkerClusterer } from "@googlemaps/markerclusterer";
import { Button } from "@mantine/core";

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
  isPropertiesLoading?: boolean;
}

export function SearchResultsMap({
  properties,
  selectedGeometry,
  onSearchComplete,
  isPropertiesLoading = false,
}: SearchResultsMapProps) {
  console.log("[SearchResultsMap] rendered with properties.length =", properties.length);

  const { geocodeData } = useGeocode();
  const { setBounds } = useBounds();

  const [lastSnapSignature, setLastSnapSignature] = useState<string | null>(null);
  const [overpassPolygons, setOverpassPolygons] = useState<google.maps.LatLngLiteral[][]>([]);
  const [infoWindowShown, setInfoWindowShown] = useState(false);
  const [selectedProperty, setSelectedProperty] = useState<IParagonProperty | null>(null);
  const [mapIsReady, setMapIsReady] = useState(false);
  const [isBoundaryLoading, setIsBoundaryLoading] = useState(false);
  const isLoading = !mapIsReady || isBoundaryLoading || isPropertiesLoading;

  const basicGeocodeData = useMemo<BasicGeocodeData>(() => {
    return {
      location: geocodeData?.location,
      bounds: geocodeData?.bounds,
    };
  }, [geocodeData?.location, geocodeData?.bounds]);

  const defaultCenter = useMemo(() => ({ lat: 43.0731, lng: -89.4012 }), []);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);

  const mapRef = useRef<google.maps.Map | null>(null);
  const markerClusterRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

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

  const onMapLoad = useCallback((map: google.maps.Map) => {
    console.log("[SearchResultsMap] onMapLoad => map loaded, creating clusterer...");
    mapRef.current = map;
    setLastSnapSignature(null);
    try {
      markerClusterRef.current = new MarkerClusterer({ map, markers: [] });
      setMapIsReady(true);
    } catch (err) {
      console.error("[SearchResultsMap] Error creating MarkerClusterer =>", err);
      markerClusterRef.current = null;
      setMapIsReady(false);
    }
  }, []);

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

  const handleMarkerClick = useCallback((property: IParagonProperty) => {
    setSelectedProperty(property);
    setInfoWindowShown(true);

    // Optionally center on marker with a horizontal offset
    if (mapRef.current && property.Latitude && property.Longitude) {
      mapRef.current.panTo({ lat: property.Latitude, lng: property.Longitude });
      // Pan left ~200px if your property list is ~1/3 screen on desktop:
      mapRef.current.panBy(-200, 0);
      // Optionally zoom in more:
      // mapRef.current.setZoom(14);
    }
  }, []);

  const handleMapClick = useCallback(() => {
    setInfoWindowShown(false);
    setSelectedProperty(null);
  }, []);

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

  // Check if mobile => clamp zoom differently
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);

  function clampZoomOnMobile(): void {
    if (!mapRef.current) return;
    if (isMobile) {
      const currentZoom = mapRef.current.getZoom() ?? 10;
      if (currentZoom < 12) {
        mapRef.current.setZoom(12);
      }
    }
  }

  useEffect(() => {
    if (!mapIsReady || !mapRef.current) return;

    // If user came from a redirect on mobile => clamp
    if (
      isMobile &&
      geocodeData &&
      (geocodeData as any).isFromRedirect &&
      basicGeocodeData.location
    ) {
      mapRef.current.setCenter(basicGeocodeData.location);
      mapRef.current.setZoom(12);
      setLastSnapSignature(makeSnapSignature(basicGeocodeData));
      onSearchComplete?.();
      return;
    }

    const snapSig = makeSnapSignature(basicGeocodeData);
    if (!snapSig) {
      if (lastSnapSignature !== "DEFAULT") {
        mapRef.current.setCenter(defaultCenter);
        mapRef.current.setZoom(10);
        clampZoomOnMobile();
        setLastSnapSignature("DEFAULT");
      }
      return;
    }

    if (snapSig === lastSnapSignature) {
      console.log("[SearchResultsMap] Already snapped => do nothing");
      return;
    }

    // If bounding box => fitBounds with custom padding
    if (basicGeocodeData.bounds) {
      const sw = basicGeocodeData.bounds.southwest;
      const ne = basicGeocodeData.bounds.northeast;
      if (sw && ne) {
        const literalBounds = new window.google.maps.LatLngBounds(sw, ne);
        mapRef.current.fitBounds(literalBounds, {
          top: 0,
          bottom: 0,
          left: 0,
          right: 420, // Enough to avoid "above" property location, and for the property list panel
        });
        clampZoomOnMobile();
        setLastSnapSignature(snapSig);
        onSearchComplete?.();
      }
    } else if (basicGeocodeData.location) {
      // single point
      mapRef.current.setZoom(12);
      mapRef.current.setCenter(basicGeocodeData.location);
      clampZoomOnMobile();
      setLastSnapSignature(snapSig);
      onSearchComplete?.();
    }

    // Possibly fetch Overpass boundary if city is found
    const comps = geocodeData?.address_components || [];
    const city = comps.find((c: any) => c.types.includes("locality"))?.long_name;
    if (city) {
      fetchOverpassBoundary(city);
    } else {
      setOverpassPolygons([]);
    }
  }, [
    geocodeData,
    basicGeocodeData,
    defaultCenter,
    isMobile,
    lastSnapSignature,
    mapIsReady,
    onSearchComplete,
  ]);

  // Rebuild markers whenever properties change
  useEffect(() => {
    if (!mapIsReady || !mapRef.current || !markerClusterRef.current) {
      console.log("[SearchResultsMap] map not ready => skipping markers");
      return;
    }
    // Clear existing markers
    try {
      markerClusterRef.current.clearMarkers();
    } catch (error) {
      console.error("[SearchResultsMap] Could not clear markers:", error);
      return;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Build new markers
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

    // Add them to cluster
    try {
      markerClusterRef.current.addMarkers(newMarkers);
    } catch (error) {
      console.error("[SearchResultsMap] Could not add markers:", error);
    }
  }, [properties, handleMarkerClick, mapIsReady]);

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
          <div style={{ fontSize: "1.25rem", fontWeight: "bold" }}>Loading...</div>
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

      {/* Zoom Buttons */}
      <div
        style={{
          position: "absolute",
          top: "45%",
          right: "20px",
          transform: "translateY(-50%)",
          display: "flex",
          flexDirection: "column",
          gap: "16px",
          zIndex: 20,
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
            flex
            items-center
            justify-center
            lg:w-12
            lg:h-12
            lg:text-xl
          "
          styles={{
            root: {
              borderRadius: "50%",
              padding: 0,
              minHeight: 0,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(30, 144, 255, 0.9)",
              color: "#fff",
              border: "1px solid rgba(30, 144, 255, 0.6)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              WebkitTextFillColor: "#fff",
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
            flex
            items-center
            justify-center
            lg:w-12
            lg:h-12
            lg:text-xl
          "
          styles={{
            root: {
              borderRadius: "50%",
              padding: 0,
              minHeight: 0,
              lineHeight: 1,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: "rgba(30, 144, 255, 0.9)",
              color: "#fff",
              border: "1px solid rgba(30, 144, 255, 0.6)",
              boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
              WebkitTextFillColor: "#fff",
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
