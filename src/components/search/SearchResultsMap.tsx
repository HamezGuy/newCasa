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

  // If the map or boundary is loading => isLoading
  const isLoading = !mapIsReady || isBoundaryLoading || isPropertiesLoading;

  // This memoizes location & bounds
  const basicGeocodeData = useMemo<BasicGeocodeData>(() => ({
    location: geocodeData?.location,
    bounds: geocodeData?.bounds,
  }), [geocodeData?.location, geocodeData?.bounds]);

  const defaultCenter = useMemo(() => ({ lat: 43.0731, lng: -89.4012 }), []);
  const containerStyle = useMemo(() => ({ width: "100%", height: "100%" }), []);

  // Refs to map, cluster, markers
  const mapRef = useRef<google.maps.Map | null>(null);
  const markerClusterRef = useRef<MarkerClusterer | null>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // Checks if user is on mobile
  const isMobile = useMemo(() => {
    if (typeof window === "undefined") return false;
    return window.innerWidth < 768;
  }, []);

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

  // Called when user clicks a marker => open InfoWindow, center/offset the map
  const handleMarkerClick = useCallback((property: IParagonProperty) => {
    setSelectedProperty(property);
    setInfoWindowShown(true);

    if (!mapRef.current || !property.Latitude || !property.Longitude) return;

    // Center on the property
    mapRef.current.panTo({ lat: property.Latitude, lng: property.Longitude });

    // On desktop, offset left so property is visible when the property list is open
    if (!isMobile) {
      mapRef.current.panBy(-200, 0); // tweak the offset as needed
    }
    // If you want to zoom in more: mapRef.current.setZoom(14);
  }, [isMobile]);

  // Closes any open InfoWindow
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

  function clampZoomOnMobile(): void {
    if (!mapRef.current) return;
    if (isMobile) {
      const currentZoom = mapRef.current.getZoom() ?? 10;
      if (currentZoom < 12) {
        mapRef.current.setZoom(12);
      }
    }
  }

  // Snap the map each time geocodeData changes
  useEffect(() => {
    if (!mapIsReady || !mapRef.current) return;

    // If user arrived from redirect on mobile => set center & zoom
    if (
      isMobile &&
      geocodeData &&
      (geocodeData as any).isFromRedirect &&
      basicGeocodeData.location
    ) {
      console.log("[SearchResultsMap] Mobile redirect => forced zoom=12 center=location");
      mapRef.current.setCenter(basicGeocodeData.location);
      mapRef.current.setZoom(12);
      setLastSnapSignature(makeSnapSignature(basicGeocodeData));
      onSearchComplete?.();
      return;
    }

    const snapSig = makeSnapSignature(basicGeocodeData);
    if (!snapSig) {
      // No bounding data => revert to default
      if (lastSnapSignature !== "DEFAULT") {
        console.log("[SearchResultsMap] No bounds => default center/zoom");
        mapRef.current.setCenter(defaultCenter);
        mapRef.current.setZoom(10);
        clampZoomOnMobile();
        setLastSnapSignature("DEFAULT");
      }
      return;
    }

    // If we've already snapped to the same place, skip
    if (snapSig === lastSnapSignature) {
      console.log("[SearchResultsMap] Already snapped => do nothing");
      return;
    }

    // If bounding box => fit to it
    if (basicGeocodeData.bounds) {
      const sw = basicGeocodeData.bounds.southwest;
      const ne = basicGeocodeData.bounds.northeast;
      if (sw && ne) {
        const literalBounds = new window.google.maps.LatLngBounds(sw, ne);

        // On desktop, apply big right offset for property list => 420
        // On mobile => no offset
        const rightPad = isMobile ? 0 : 420;

        mapRef.current.fitBounds(literalBounds, {
          top: 0,
          bottom: 0,
          left: 0,
          right: rightPad,
        });

        clampZoomOnMobile();
        setLastSnapSignature(snapSig);
        onSearchComplete?.();
      }
    }
    // Else if single lat/lng => center & zoom
    else if (basicGeocodeData.location) {
      console.log("[SearchResultsMap] location => center/zoom=12");
      mapRef.current.setZoom(12);
      mapRef.current.setCenter(basicGeocodeData.location);
      clampZoomOnMobile();
      setLastSnapSignature(snapSig);
      onSearchComplete?.();
    }

    // If city is found => fetch boundary polygons
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

  // Rebuild markers when the property list changes
  useEffect(() => {
    if (!mapIsReady || !mapRef.current || !markerClusterRef.current) {
      console.log("[SearchResultsMap] map not ready => skipping markers");
      return;
    }
    // Clear existing
    try {
      markerClusterRef.current.clearMarkers();
    } catch (error) {
      console.error("[SearchResultsMap] Could not clear markers:", error);
      return;
    }
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Make new markers
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
      console.error("[SearchResultsMap] Could not add markers:", error);
    }
  }, [properties, handleMarkerClick, mapIsReady]);

  // Zoom in/out
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
