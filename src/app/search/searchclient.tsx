"use client";

import dynamic from "next/dynamic";
import { useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { useGeocode } from "@/components/search/GeocodeContext";
import { useBounds } from "@/components/search/boundscontext";
import SearchFilters from "@/components/search/SearchFilters";
import SearchInput from "@/components/search/SearchInput";
import PropertyList from "@/components/paragon/PropertyList";
import type { SearchResultsMapProps } from "@/components/search/SearchResultsMap";
import PropertyModal from "@/components/property/PropertyModal";

// Dynamically import the map so it only renders client‑side.
const SearchResultsMapNoSSR = dynamic<SearchResultsMapProps>(
  () =>
    import("@/components/search/SearchResultsMap").then((mod) => ({
      default: mod.SearchResultsMap,
    })),
  { ssr: false }
);

export default function SearchClient() {
  const [filteredProperties, setFilteredProperties] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { setGeocodeData, geocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const searchParams = useSearchParams();

  // State to track property panel scrolling on mobile.
  const [isPanelInteracting, setIsPanelInteracting] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // State for property modal popup.
  const [selectedPropertyData, setSelectedPropertyData] = useState<{
    property: any;
    userRole: string;
    userUid: string | null;
    realtorEmail: string;
    realtorPhone: string;
  } | null>(null);

  const rawSearchTerm = searchParams.get("searchTerm") || "";

  // ----------------------------------------------------------------
  // Parse geocode from URL and update context.
  // ----------------------------------------------------------------
  useEffect(() => {
    const geocodeStr = searchParams.get("geocode");
    if (geocodeStr) {
      try {
        const decoded = decodeURIComponent(geocodeStr);
        const parsed = JSON.parse(decoded);
        parsed.isFromRedirect = true;
        console.log("[Search Page] parsed geocode from URL =>", parsed);
        setGeocodeData(parsed);
        if (parsed.bounds) setBounds(parsed.bounds);
      } catch (err) {
        console.error("[Search Page] Error parsing geocode param:", err);
      }
    }
  }, [searchParams, setGeocodeData, setBounds]);

  // ----------------------------------------------------------------
  // Fetch properties whenever URL parameters change.
  // ----------------------------------------------------------------
  useEffect(() => {
    const zipCode = searchParams.get("zipCode") || undefined;
    const streetName = searchParams.get("streetName") || undefined;
    const city = searchParams.get("city") || undefined;
    const county = searchParams.get("county") || undefined;

    if (!zipCode && !streetName && !city && !county) {
      console.log("[Search Page] No query param => fetch all");
      fetchProperties();
    } else {
      fetchProperties(zipCode, streetName, city, county);
    }
  }, [searchParams]);

  // ----------------------------------------------------------------
  // Function to fetch properties.
  // ----------------------------------------------------------------
  const fetchProperties = async (
    zipCode?: string,
    streetName?: string,
    city?: string,
    county?: string
  ) => {
    setLoading(true);
    try {
      let url = "/api/v1/listings";
      const queries: string[] = [];
      if (zipCode) queries.push(`zipCode=${encodeURIComponent(zipCode)}`);
      if (streetName) queries.push(`streetName=${encodeURIComponent(streetName)}`);
      if (city) queries.push(`city=${encodeURIComponent(city)}`);
      if (county) queries.push(`county=${encodeURIComponent(county)}`);
      if (queries.length > 0) url += `?${queries.join("&")}`;
      console.log("[Search Page] fetchProperties =>", url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log("[Search Page] fetchProperties => data:", data);
        setFilteredProperties(data);
      } else {
        console.error("[Search Page] fetchProperties => error:", await response.text());
        setFilteredProperties([]);
      }
    } catch (error) {
      console.error("[Search Page] fetchProperties => exception:", error);
      setFilteredProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // ----------------------------------------------------------------
  // Handle inline search (geocode validation).
  // ----------------------------------------------------------------
  const handlePlaceSelected = (geo: any) => {
    console.log("[Search] handlePlaceSelected =>", geo);
    if (!geo || !geo.address_components) {
      console.warn("[Search] handlePlaceSelected => invalid geocode data => skipping fetch");
      return;
    }
    const comps = geo.address_components;
    const zipCode = comps.find((c: any) => c.types.includes("postal_code"))?.long_name;
    const route = comps.find((c: any) => c.types.includes("route"))?.long_name;
    const city = comps.find((c: any) => c.types.includes("locality"))?.long_name;
    const county = comps.find((c: any) => c.types.includes("administrative_area_level_2"))?.long_name;
    if (zipCode) {
      fetchProperties(zipCode);
    } else if (route) {
      fetchProperties(undefined, route);
    } else if (city) {
      fetchProperties(undefined, undefined, city);
    } else if (county) {
      fetchProperties(undefined, undefined, undefined, county);
    } else {
      console.log("[Search] handlePlaceSelected => no recognized param => fetch all");
      fetchProperties();
    }
  };

  const handleFiltersUpdate = (filters: any) => {
    console.log("[Search] handleFiltersUpdate =>", filters);
    // Handle filter changes as needed.
  };

  // ---------------------- Mobile Drag Handlers ----------------------
  // Container ref for mobile calculations.
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [panelHeightPct, setPanelHeightPct] = useState(35); // default mobile bottom sheet height (%)
  const draggingRef = useRef(false);
  const startYRef = useRef(0);
  const startPanelHeightRef = useRef(0);
  const DRAG_THRESHOLD_PCT = 1;

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
  // ---------------------- End Mobile Drag Handlers ----------------------

  // When a property is clicked, open the modal.
  const handlePropertyClick = (property: any) => {
    const userRole = "user"; // Replace with actual user role if needed.
    const userUid = null; // Replace with actual user UID if available.
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
      className="flex flex-col w-full h-screen overflow-hidden"
      style={{ overscrollBehavior: "contain" }}
    >
      {/* Top Bar: Search Input & Filters */}
      <div className="w-full p-4 bg-gray-100 shadow-md z-10">
        <div className="max-w-screen-xl mx-auto flex flex-col lg:flex-row items-center lg:justify-between gap-4">
          {/* On desktop, search input and filters share the same row */}
          <div className="flex-grow">
            <SearchInput
              defaultValue={rawSearchTerm}
              size="sm"
              onPlaceSelected={handlePlaceSelected}
              isRedirectEnabled={false}
            />
          </div>
          <div className="flex items-center gap-4">
            <SearchFilters onUpdate={handleFiltersUpdate} />
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex flex-grow relative">
        {/* Desktop Layout: Map on left, Properties fixed on right */}
        <div className="hidden lg:block relative w-2/3">
          <SearchResultsMapNoSSR properties={filteredProperties} isPropertiesLoading={loading} />
        </div>
        <div className="hidden lg:block w-1/3 h-full overflow-y-auto">
          {loading ? (
            <p className="text-center text-gray-500 mt-4">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <PropertyList properties={filteredProperties} onPropertyClick={handlePropertyClick} />
          ) : (
            <p className="text-center text-gray-500 mt-4">No properties found.</p>
          )}
        </div>

        {/* Mobile Layout: Map as full-screen background */}
        <div className="lg:hidden absolute top-0 left-0 w-full h-full">
          <SearchResultsMapNoSSR properties={filteredProperties} isPropertiesLoading={loading} />
        </div>

        {/* Mobile Layout: Draggable Properties Panel (Bottom Sheet) */}
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
              <PropertyList properties={filteredProperties} onPropertyClick={handlePropertyClick} />
            ) : (
              <p className="text-center text-gray-500 mt-4">No properties found.</p>
            )}
          </div>
        </div>

        {/* Mobile Draggable Divider (Pull Handle) */}
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

      {/* Property Modal (for both mobile and desktop) */}
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
