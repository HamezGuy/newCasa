"use client";

import IParagonProperty from "@/types/IParagonProperty";
import {
  GoogleMap,
  InfoWindow,
  Polygon,
  // [FIX] Remove useJsApiLoader import
  // useJsApiLoader,
} from "@react-google-maps/api";
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

  // new => track if map & clusterer are fully ready
  const [mapIsReady, setMapIsReady] = useState(false);

  // ------------------------------------------------------------------------
  // [FIX] Remove useJsApiLoader calls.
  // We assume the script is already loaded by GoogleMapsClientProvider.

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

    // Safely create the clusterer once the map is loaded
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
    console.log("[SearchResultsMap] handleMapDragEnd triggered");
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
    console.log("[SearchResultsMap] handleMapDragEnd => setting new bounds:", newBounds);
    setBounds(newBounds);
  }, [setBounds]);

  const handleMapZoomChanged = useCallback(() => {
    console.log("[SearchResultsMap] handleMapZoomChanged triggered");
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
    console.log("[SearchResultsMap] handleMapZoomChanged => setting new bounds:", newBounds);
    setBounds(newBounds);
  }, [setBounds]);

  // ------------------------------------------------------------------------
  // Marker click => show InfoWindow
  // ------------------------------------------------------------------------
  const handleMarkerClick = useCallback((property: IParagonProperty) => {
    console.log("[SearchResultsMap] handleMarkerClick => property:", property);
    setSelectedProperty(property);
    setInfoWindowShown(true);
  }, []);

  // Map click => close InfoWindow
  const handleMapClick = useCallback(() => {
    console.log("[SearchResultsMap] handleMapClick => closing InfoWindow");
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
      console.log("[SearchResultsMap] Overpass boundary result => polygons:", resp.data.polygons);
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
    console.log("[SearchResultsMap] useEffect => geocode or selectedGeometry changed");
    // Wait until the map & clusterer are ready
    if (!mapIsReady || !mapRef.current) {
      console.log("[SearchResultsMap] mapIsReady is false or mapRef not set. Skipping...");
      return;
    }

    // 1) If there's selectedGeometry => priority
    if (selectedGeometry?.bounds) {
      console.log("[SearchResultsMap] we have selectedGeometry.bounds => trying to snap");
      const geometrySig = `BBOX:${
        selectedGeometry.bounds.getSouthWest().lat()
      },${selectedGeometry.bounds.getSouthWest().lng()},${selectedGeometry.bounds
        .getNorthEast()
        .lat()},${selectedGeometry.bounds.getNorthEast().lng()}`;

      if (geometrySig !== lastSnapSignature) {
        console.log("[SearchResultsMap] snapping to selectedGeometry bounds, geometrySig:", geometrySig);
        mapRef.current.setZoom(4);
        mapRef.current.fitBounds(selectedGeometry.bounds, 150);
        setLastSnapSignature(geometrySig);
        onSearchComplete?.();
      }
      return;
    }

    // 2) Otherwise, snap to bounding box or lat-lng from geocode
    const snapSig = makeSnapSignature(basicGeocodeData);
    console.log("[SearchResultsMap] snapSig for geocode =>", snapSig);

    if (!snapSig) {
      console.log("[SearchResultsMap] no geocode data => default center");
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
      console.log("[SearchResultsMap] Already snapped to this place. Doing nothing.");
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
      console.log("[SearchResultsMap] found city =>", city, " => calling fetchOverpassBoundary");
      fetchOverpassBoundary(city);
    } else {
      console.log("[SearchResultsMap] no city found in geocodeData => resetting overpassPolygons");
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
    console.log("[SearchResultsMap] useEffect => properties changed. properties.length:", properties.length);
    // If the map or markerCluster isn't ready, skip
    if (!mapIsReady || !mapRef.current || !markerClusterRef.current) {
      console.log("[SearchResultsMap] map is not ready => skipping marker build");
      return;
    }

    // Attempt to clear existing markers
    console.log("[SearchResultsMap] clearing existing markers from cluster...");
    try {
      markerClusterRef.current.clearMarkers();
    } catch (error) {
      console.error("[SearchResultsMap] Could not clear markers from clusterer:", error);
      // If clearing fails, bail out
      return;
    }

    // Remove from map if any leftover
    console.log("[SearchResultsMap] removing leftover markers from map...");
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];

    // Create new markers from property lat/lng
    console.log("[SearchResultsMap] building new markers from property lat/lng...");
    const newMarkers: google.maps.Marker[] = properties
      .filter((p) => {
        // Extra logging
        if (!p.Latitude || !p.Longitude) {
          console.log("[SearchResultsMap] property missing lat/long =>", p);
        }
        return p.Latitude && p.Longitude;
      })
      .map((p) => {
        const marker = new google.maps.Marker({
          position: { lat: p.Latitude!, lng: p.Longitude! },
        });
        marker.addListener("click", () => handleMarkerClick(p));
        return marker;
      });

    markersRef.current = newMarkers;
    console.log("[SearchResultsMap] new markers built =>", newMarkers.length);

    // Add them to the cluster
    try {
      console.log("[SearchResultsMap] adding new markers to cluster...");
      markerClusterRef.current.addMarkers(newMarkers);
    } catch (error) {
      console.error("[SearchResultsMap] Could not add markers to clusterer:", error);
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
            onCloseClick={() => {
              console.log("[SearchResultsMap] InfoWindow onCloseClick => closing window");
              setInfoWindowShown(false);
            }}
          >
            <PropertySearchResultCard property={selectedProperty} size="sm" />
          </InfoWindow>
        )}
      </GoogleMap>
    </div>
  );
}
