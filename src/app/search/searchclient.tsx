"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useCallback } from "react";
import { useGeocode } from "@/components/search/GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import { useFilters } from "@/components/search/FilterContext";
import SearchFilters from "@/components/search/SearchFilters";
import SearchInput from "@/components/search/SearchInput";
import PropertyList from "@/components/paragon/PropertyList";
import type { SearchResultsMapProps } from "@/components/search/SearchResultsMap";
import PropertyModal from "@/components/property/PropertyModal";

const SearchResultsMapNoSSR = dynamic<SearchResultsMapProps>(
  () => import("@/components/search/SearchResultsMap").then((mod) => ({
    default: mod.SearchResultsMap,
  })),
  { ssr: false }
);

/**
 * Helper function to apply filters in-memory after receiving
 * all properties from the server.
 */
function applyClientFilters(
  properties: any[],
  filters: {
    minPrice?: string;
    maxPrice?: string;
    types?: string[];
    minRooms?: string;
    maxRooms?: string;
  }
) {
  let result = [...properties];

  const minVal = filters.minPrice ? parseInt(filters.minPrice, 10) : 0;
  const maxVal = filters.maxPrice ? parseInt(filters.maxPrice, 10) : 0;
  if (minVal > 0) {
    result = result.filter((p) => (p.ListPrice || 0) >= minVal);
  }
  if (maxVal > 0) {
    result = result.filter((p) => (p.ListPrice || 0) <= maxVal);
  }

  if (filters.types && filters.types.length > 0) {
    const loweredSelections = filters.types.map((t) => t.toLowerCase());
    result = result.filter((p) => {
      let finalType = (p.PropertyType || "").toLowerCase();
      const subType = (p.PropertySubType || "").toLowerCase();
      if (subType === "condominium") {
        finalType = "condominium";
      }
      return loweredSelections.includes(finalType);
    });
  }

  const minRooms = filters.minRooms ? parseInt(filters.minRooms, 10) : 0;
  const maxRooms = filters.maxRooms ? parseInt(filters.maxRooms, 10) : 0;
  if (minRooms > 0 || maxRooms > 0) {
    result = result.filter((p) => {
      const bd = p.BedroomsTotal ?? 0;
      const bf = p.BathroomsFull ?? 0;
      const bh = p.BathroomsHalf ?? 0;
      const totalRooms = bd + bf + bh;
      if (minRooms > 0 && totalRooms < minRooms) return false;
      if (maxRooms > 0 && totalRooms > maxRooms) return false;
      return true;
    });
  }

  return result;
}

export default function SearchClient() {
  const [fetchedProperties, setFetchedProperties] = useState<any[]>([]);
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const { filters } = useFilters();
  const { setGeocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const searchParams = useSearchParams();

  // For mobile bottom sheet
  const [panelHeightPct, setPanelHeightPct] = useState(35);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startPanelHeightRef = useRef(0);
  const DRAG_THRESHOLD_PCT = 1;

  // CHANGED: track which property is open in the modal
  const [selectedPropertyData, setSelectedPropertyData] = useState<{
    property: any;
    userRole: string;
    userUid: string | null;
    realtorEmail: string;
    realtorPhone: string;
  } | null>(null);

  const rawSearchTerm = searchParams.get("searchTerm") || "";

  // Parse geocode from URL
  useEffect(() => {
    const geocodeStr = searchParams.get("geocode");
    if (geocodeStr) {
      try {
        const decoded = decodeURIComponent(geocodeStr);
        const parsed = JSON.parse(decoded);
        parsed.isFromRedirect = true;
        setGeocodeData(parsed);
        if (parsed.bounds) setBounds(parsed.bounds);
      } catch (err) {
        console.error("[Search Page] Error parsing geocode param:", err);
      }
    }
  }, [searchParams, setGeocodeData, setBounds]);

  // Changed to useCallback to fix the dependency warning
  const fetchProperties = useCallback(async (
    zipCode?: string,
    streetName?: string,
    city?: string,
    county?: string,
    propertyId?: string,
    address?: string
  ) => {
    setLoading(true);
    try {
      let url = "/api/v1/listings";
      const queries: string[] = [];

      if (zipCode) queries.push(`zipCode=${encodeURIComponent(zipCode)}`);
      if (streetName) queries.push(`streetName=${encodeURIComponent(streetName)}`);
      if (city) queries.push(`city=${encodeURIComponent(city)}`);
      if (county) queries.push(`county=${encodeURIComponent(county)}`);
      if (propertyId) queries.push(`propertyId=${encodeURIComponent(propertyId)}`);
      if (address) queries.push(`address=${encodeURIComponent(address)}`);

      // If user typed "allProperties=true" directly, or via the button
      const allProps = searchParams.get("allProperties") === "true";
      if (allProps) {
        queries.push("allProperties=true");
      }

      if (queries.length > 0) {
        url += `?${queries.join("&")}`;
      }

      console.log("Fetching from URL:", url);
      
      const response = await fetch(url);
      if (!response.ok) {
        console.error("[Search Page] fetchProperties => error:", await response.text());
        setFetchedProperties([]);
      } else {
        const data = await response.json();
        setFetchedProperties(data);
      }
    } catch (error) {
      console.error("[Search Page] fetchProperties => exception:", error);
      setFetchedProperties([]);
    } finally {
      setLoading(false);
    }
  }, [searchParams]); // Add searchParams as a dependency since it's used inside

  // Each time URL changes => fetch data
  useEffect(() => {
    const zipCode = searchParams.get("zipCode") || undefined;
    const streetName = searchParams.get("streetName") || undefined;
    const city = searchParams.get("city") || undefined;
    const county = searchParams.get("county") || undefined;
    const propertyId = searchParams.get("propertyId") || undefined;
    const address = searchParams.get("address") || undefined; 
    const allProps = searchParams.get("allProperties") === "true"; // new param if you want to see it

    console.log("URL parameters:", { zipCode, streetName, city, county, propertyId, address, allProps });
    
    fetchProperties(zipCode, streetName, city, county, propertyId, address);
  }, [searchParams, fetchProperties]); // Add fetchProperties to the dependencies

  // Re-apply filters whenever the data or user filters change
  useEffect(() => {
    const newFiltered = applyClientFilters(fetchedProperties, filters);
    setFilteredProperties(newFiltered);
  }, [fetchedProperties, filters]);

  const handlePlaceSelected = useCallback((geo: any) => {
    // do nothing special; route push is in <SearchInput>
  }, []);

  // Mobile bottom sheet drag
  const handleDragStart = (e: React.TouchEvent | React.MouseEvent) => {
    draggingRef.current = true;
    startYRef.current = "touches" in e ? e.touches[0].clientY : e.clientY;
    startPanelHeightRef.current = panelHeightPct;
    (e.currentTarget as HTMLElement).style.touchAction = "none";
    (e.currentTarget as HTMLElement).style.userSelect = "none";
  };

  const handleDragMove = (e: React.TouchEvent | React.MouseEvent) => {
    if (!draggingRef.current || !containerRef.current) return;
    const currentY = "touches" in e ? e.touches[0].clientY : e.clientY;
    const delta = startYRef.current - currentY;
    const containerHeight = containerRef.current.getBoundingClientRect().height;
    const deltaPct = (delta / containerHeight) * 100;
    if (Math.abs(deltaPct) < DRAG_THRESHOLD_PCT) return;

    let newPanelHeight = startPanelHeightRef.current + deltaPct;
    newPanelHeight = Math.max(35, Math.min(100, newPanelHeight));
    setPanelHeightPct(newPanelHeight);
  };

  const handleDragEnd = () => {
    draggingRef.current = false;
  };

  // CHANGED: On property click => open the modal in this page
  const handlePropertyClick = (property: any) => {
    const userRole = "user";
    const userUid = null;
    const realtorEmail = property.ListAgentEmail || "realtor@example.com";
    const realtorPhone = property.ListAgentPreferredPhone || "123-456-7890";
    setSelectedPropertyData({
      property,
      userRole,
      userUid,
      realtorEmail,
      realtorPhone,
    });
  };

  return (
    <main
      ref={containerRef}
      className="flex flex-col w-full h-screen overflow-hidden min-h-0"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* TOP BAR => search input + filter controls */}
      <div className="flex-shrink-0 bg-gray-100 p-2 shadow-md z-10">
        <div className="max-w-screen-xl mx-auto flex flex-col sm:flex-row gap-2">
          <div className="w-full">
            <SearchInput
              defaultValue={rawSearchTerm}
              size="sm"
              onPlaceSelected={handlePlaceSelected}
              isRedirectEnabled={true}
              filters={filters}
            />
          </div>
          <div className="w-full sm:w-auto">
            <SearchFilters />
          </div>
        </div>
      </div>

      {/* MAIN CONTENT => map + property list */}
      <div className="flex-grow relative flex flex-row min-h-0 overflow-hidden">
        {/* Desktop left: Map */}
        <div className="hidden lg:block relative w-2/3 h-full min-h-0">
          <SearchResultsMapNoSSR
            properties={filteredProperties}
            isPropertiesLoading={loading}
            onPropertyClick={handlePropertyClick}
          />
        </div>

        {/* Desktop right: List */}
        <div className="hidden lg:block w-1/3 h-full min-h-0 overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 mt-4">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <PropertyList
              properties={filteredProperties}
              onPropertyClick={handlePropertyClick}
            />
          ) : (
            <p className="text-center text-gray-500 mt-4">No properties found.</p>
          )}
        </div>

        {/* MOBILE => map behind bottom sheet */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full">
          <SearchResultsMapNoSSR
            properties={filteredProperties}
            isPropertiesLoading={loading}
            onPropertyClick={handlePropertyClick}
          />
        </div>

        {/* MOBILE => Draggable bottom panel for property list */}
        <div
          className="lg:hidden absolute left-0 w-full shadow-inner bg-white"
          style={{
            bottom: 0,
            height: `${panelHeightPct}%`,
            WebkitOverflowScrolling: "touch",
            zIndex: 30,
          }}
        >
          <div style={{ height: "100%", overflowY: "auto" }}>
            {loading ? (
              <p className="text-center text-gray-500 mt-4">Loading properties...</p>
            ) : filteredProperties.length > 0 ? (
              <PropertyList
                properties={filteredProperties}
                onPropertyClick={handlePropertyClick}
              />
            ) : (
              <p className="text-center text-gray-500 mt-4">No properties found.</p>
            )}
          </div>
        </div>

        {/* MOBILE => Draggable handle */}
        <div
          className="lg:hidden absolute left-0 w-full flex justify-center items-center cursor-row-resize"
          style={{
            height: "35px",
            bottom: `${panelHeightPct}%`,
            zIndex: 40,
            touchAction: "none",
            userSelect: "none",
          }}
          onTouchStart={handleDragStart}
          onTouchMove={handleDragMove}
          onTouchEnd={handleDragEnd}
          onMouseDown={handleDragStart}
          onMouseMove={handleDragMove}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="w-12 h-1 bg-gray-500 rounded-full"></div>
        </div>
      </div>

      {/* Property Modal => now shows the entire detail content */}
      {selectedPropertyData && (
        <PropertyModal
          opened={!!selectedPropertyData}
          onClose={() => setSelectedPropertyData(null)}
          property={selectedPropertyData.property}
          userRole={selectedPropertyData.userRole}
          userUid={selectedPropertyData.userUid}
          realtorEmail={selectedPropertyData.realtorEmail}
          realtorPhone={selectedPropertyData.realtorPhone}
        />
      )}
    </main>
  );
}