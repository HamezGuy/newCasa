"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import IParagonProperty from "@/types/IParagonProperty";
import PropertyList from "@/components/paragon/PropertyList";

// ----------------------------------------------------------------
// 1) A utility that *checks* if user input looks like a ZIP code
// ----------------------------------------------------------------
function isLikelyZip(input: string) {
  return /^[0-9]{4,10}$/.test(input);
}

// ----------------------------------------------------------------
// 2) A function to verify if the given city/zip is valid via Google Geocode
// ----------------------------------------------------------------
async function isValidLocation(location: string): Promise<boolean> {
  if (!location) return false;
  try {
    const res = await fetch(
      `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
        location
      )}&key=${process.env.NEXT_PUBLIC_GOOGLE_MAPS_API}`
    );
    const data = await res.json();
    // If status is "OK" and we have at least 1 result => it's valid
    return data.status === "OK" && data.results && data.results.length > 0;
  } catch (err) {
    console.error("[isValidLocation] => error verifying location:", err);
    return false;
  }
}

// ----------------------------------------------------------------
// 3) Convert a string like "madison" => "Madison"
//    If you need to handle multi-word city names, we can expand this.
// ----------------------------------------------------------------
function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ----------------------------------------------------------------
// 4) A simple search bar component
// ----------------------------------------------------------------
function ListingsSearchBar({ onSearch }: { onSearch: (term: string) => void }) {
  const [value, setValue] = useState("");

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      onSearch(value.trim());
    }
  };

  return (
    <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xl my-4 mx-auto">
      <input
        className="flex-1 border border-gray-300 rounded p-2"
        placeholder="Enter a city or ZIP code..."
        value={value}
        onChange={(e) => setValue(e.target.value)}
        onKeyPress={handleKeyPress}
      />
      <button
        className="bg-blue-600 text-white px-4 py-2 rounded"
        onClick={() => onSearch(value.trim())}
      >
        Search
      </button>
    </div>
  );
}

export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // React States
  const initialTerm = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialTerm);

  const [allProps, setAllProps] = useState<IParagonProperty[]>([]);
  const [shownCount, setShownCount] = useState(0);

  // Separate loading states
  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [title, setTitle] = useState("Listings");

  const [verifyError, setVerifyError] = useState("");

  // The chunk size
  const LIMIT = 6;

  // ----------------------------------------------------------------
  // 5) On each new searchTerm => verify => fetch => setAllProps
  // ----------------------------------------------------------------
  useEffect(() => {
    if (!searchTerm) {
      setAllProps([]);
      setShownCount(0);
      setHasMore(false);
      setTitle("Listings");
      setVerifyError("");
      return;
    }

    const doFetch = async () => {
      // Step A) verify location
      setVerifyError("");
      setIsVerifyingLocation(true);
      const valid = await isValidLocation(searchTerm);
      setIsVerifyingLocation(false);

      if (!valid) {
        setAllProps([]);
        setShownCount(0);
        setHasMore(false);
        setTitle("Invalid Location");
        setVerifyError(`"${searchTerm}" is not recognized. Please try again.`);
        return;
      }

      // Step B) location is valid => proceed to fetch
      setIsSearching(true);
      try {
        let params: Record<string, any> = {};

        if (isLikelyZip(searchTerm)) {
          params.zipCode = searchTerm;
          setTitle(`Listings in ZIP ${searchTerm}`);
        } else {
          // ADDED: convert city to Title Case before sending
          const cityTitleCase = toTitleCase(searchTerm);
          params.city = cityTitleCase;

          // CHANGED: show that Title Cased city in the banner as well
          setTitle(`Listings in ${cityTitleCase}`);
        }

        const res = await axios.get("/api/v1/listings", { params });
        const data = res.data as IParagonProperty[];

        setAllProps(data);

        // show first chunk
        if (data.length > 0) {
          setShownCount(Math.min(data.length, LIMIT));
          setHasMore(data.length > LIMIT);
        } else {
          setShownCount(0);
          setHasMore(false);
        }
      } catch (err) {
        console.error("Error fetching listings:", err);
        setAllProps([]);
        setHasMore(false);
      } finally {
        setIsSearching(false);
      }
    };

    doFetch();
  }, [searchTerm]);

  // ----------------------------------------------------------------
  // 6) The user typed a new city/zip => update URL + state
  // ----------------------------------------------------------------
  function handleSearch(term: string) {
    router.push(`/listings?q=${term}`);
    setSearchTerm(term);
    setVerifyError("");
  }

  // ----------------------------------------------------------------
  // 7) "Load More" => reveal more from allProps
  // ----------------------------------------------------------------
  function handleLoadMore() {
    if (isSearching || isLoadingMore) return;

    setIsLoadingMore(true);
    setTimeout(() => {
      setShownCount((prev) => {
        const nextCount = prev + LIMIT;
        if (nextCount >= allProps.length) {
          setHasMore(false);
        }
        return nextCount;
      });
      setIsLoadingMore(false);
    }, 500);
  }

  const displayedProperties = allProps.slice(0, shownCount);

  // ----------------------------------------------------------------
  // 8) Intersection Observer => infinite scroll
  // ----------------------------------------------------------------
  const observerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        const first = entries[0];
        if (
          first.isIntersecting &&
          hasMore &&
          !isSearching &&
          !isLoadingMore &&
          displayedProperties.length < allProps.length
        ) {
          console.log("[ListingsPage] auto-load next => shownCount + LIMIT");
          handleLoadMore();
        }
      });
      observer.observe(el);
    }
    return () => {
      if (observer && el) observer.unobserve(el);
    };
  }, [
    observerRef,
    hasMore,
    isSearching,
    isLoadingMore,
    displayedProperties.length,
    allProps.length,
  ]);

  const isBusy = isVerifyingLocation || isSearching || isLoadingMore;
  const pageCursor = isBusy ? "cursor-wait" : "cursor-auto";

  // ----------------------------------------------------------------
  // 9) Render
  // ----------------------------------------------------------------
  return (
    <main className={`container mx-auto px-4 ${pageCursor}`}>
      {/* Dark banner */}
      <div className="relative w-full overflow-hidden text-white mb-8 shadow-xl rounded-md">
        <div className="absolute inset-0 z-0">
          <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black opacity-90" />
        </div>
        <div className="relative z-10 p-10 sm:p-16 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">{title}</h1>
        </div>
      </div>

      {/* Search bar */}
      <ListingsSearchBar onSearch={handleSearch} />

      {/* If there's a verification error => display it */}
      {verifyError && (
        <p className="text-center text-red-500 my-2">{verifyError}</p>
      )}

      {/* If verifying => show message */}
      {isVerifyingLocation && (
        <p className="text-center text-gray-600 my-2">
          Verifying location...
        </p>
      )}

      {/* If searching => show message */}
      {isSearching && (
        <p className="text-center text-gray-600 my-2">
          Searching listings...
        </p>
      )}

      {/* If no search => show message */}
      {!searchTerm && allProps.length === 0 && (
        <p className="text-center text-gray-600 my-8">
          No search yet — please enter a city or ZIP code above.
        </p>
      )}

      {/* Property list */}
      {(searchTerm || displayedProperties.length > 0) && (
        <PropertyList
          properties={displayedProperties}
          className="my-8"
          searchTerm={searchTerm}
          isLoading={isSearching || isVerifyingLocation}
        />
      )}

      <div className="flex justify-center items-center flex-col mb-16">
        {/* "Load More" button */}
        {searchTerm && hasMore && !isSearching && !isVerifyingLocation && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mt-4 hover:bg-green-500 transition-colors"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading more..." : "Load More"}
          </button>
        )}

        {/* If currently loading more => show spinner */}
        {isLoadingMore && (
          <div className="mt-4 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <p className="text-gray-700 mt-2">Loading more...</p>
          </div>
        )}
      </div>

      {/* Intersection observer trigger (for infinite scroll) */}
      <div ref={observerRef} style={{ height: 1, marginBottom: 20 }} />
    </main>
  );
}
