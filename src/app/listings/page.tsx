"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import IParagonProperty from "@/types/IParagonProperty";
import PropertyList from "@/components/paragon/PropertyList";

// ----------------------------------------------------------------
// 1) Utility: isLikelyZip
// ----------------------------------------------------------------
function isLikelyZip(input: string) {
  return /^[0-9]{4,10}$/.test(input);
}

// ----------------------------------------------------------------
// 2) Verify if city/zip is valid (Google geocode)
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
    return data.status === "OK" && data.results && data.results.length > 0;
  } catch (err) {
    console.error("[isValidLocation] => error verifying location:", err);
    return false;
  }
}

// ----------------------------------------------------------------
// 3) Convert to TitleCase
// ----------------------------------------------------------------
function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ----------------------------------------------------------------
// 4) Simple Search bar
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

  // Original states for main search
  const initialTerm = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialTerm);

  const [allProps, setAllProps] = useState<IParagonProperty[]>([]);
  const [shownCount, setShownCount] = useState(0);

  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [hasMore, setHasMore] = useState(true);
  const [title, setTitle] = useState("Listings");
  const [verifyError, setVerifyError] = useState("");

  const LIMIT = 6;

  // ----------------------------------------------------------------
  // ADDED: State for ZIP 53703
  // ----------------------------------------------------------------
  const [props53703, setProps53703] = useState<IParagonProperty[]>([]);
  const [shown53703, setShown53703] = useState(0);
  const [hasMore53703, setHasMore53703] = useState(false);
  const [loading53703, setLoading53703] = useState(false);

  // ----------------------------------------------------------------
  // ADDED: State for ZIP 53713
  // ----------------------------------------------------------------
  const [props53713, setProps53713] = useState<IParagonProperty[]>([]);
  const [shown53713, setShown53713] = useState(0);
  const [hasMore53713, setHasMore53713] = useState(false);
  const [loading53713, setLoading53713] = useState(false);

  // ----------------------------------------------------------------
  // 5) On new searchTerm => verify => fetch => setAllProps
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

      // Step B) location is valid => proceed
      setIsSearching(true);
      try {
        let params: Record<string, any> = {};

        if (isLikelyZip(searchTerm)) {
          params.zipCode = searchTerm;
          setTitle(`Listings in ZIP ${searchTerm}`);
        } else {
          const cityTitleCase = toTitleCase(searchTerm);
          params.city = cityTitleCase;
          setTitle(`Listings in ${cityTitleCase}`);
        }

        const res = await axios.get("/api/v1/listings", { params });
        const data = res.data as IParagonProperty[];

        setAllProps(data);
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
  // 6) handleSearch => city/zip => setSearchTerm
  // ----------------------------------------------------------------
  function handleSearch(term: string) {
    router.push(`/listings?q=${term}`);
    setSearchTerm(term);
    setVerifyError("");
  }

  // ----------------------------------------------------------------
  // 7) "Load More" for main search
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

  // Intersection observer => infinite scroll
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
  }, [observerRef, hasMore, isSearching, isLoadingMore, displayedProperties.length, allProps.length]);

  const isBusy = isVerifyingLocation || isSearching || isLoadingMore;
  const pageCursor = isBusy ? "cursor-wait" : "cursor-auto";

  // ----------------------------------------------------------------
  // ADDED: a function to fetch properties for a given zip
  //        used for 53703 and 53713
  // ----------------------------------------------------------------
  async function fetchZip(zip: string) {
    try {
      const response = await axios.get("/api/v1/listings", {
        params: { zipCode: zip },
      });
      const data = response.data as IParagonProperty[];
      return data;
    } catch (error) {
      console.error(`Error fetching zip=${zip}:`, error);
      return [];
    }
  }

  // ----------------------------------------------------------------
  // ADDED: useEffect => on mount, fetch 53703 and 53713
  // ----------------------------------------------------------------
  useEffect(() => {
    // fetch 53703
    async function doFetch() {
      setLoading53703(true);
      const data03 = await fetchZip("53703");
      setProps53703(data03);
      if (data03.length > 0) {
        setShown53703(Math.min(data03.length, LIMIT));
        setHasMore53703(data03.length > LIMIT);
      } else {
        setShown53703(0);
        setHasMore53703(false);
      }
      setLoading53703(false);
    }

    doFetch();
  }, []); // only once

  useEffect(() => {
    // fetch 53713
    async function doFetch() {
      setLoading53713(true);
      const data13 = await fetchZip("53713");
      setProps53713(data13);
      if (data13.length > 0) {
        setShown53713(Math.min(data13.length, LIMIT));
        setHasMore53713(data13.length > LIMIT);
      } else {
        setShown53713(0);
        setHasMore53713(false);
      }
      setLoading53713(false);
    }

    doFetch();
  }, []); // only once

  // ----------------------------------------------------------------
  // ADDED: handleLoadMore for each zip
  // ----------------------------------------------------------------
  function handleLoadMore53703() {
    if (loading53703) return;
    setLoading53703(true);
    setTimeout(() => {
      setShown53703((prev) => {
        const nextCount = prev + LIMIT;
        if (nextCount >= props53703.length) {
          setHasMore53703(false);
        }
        return nextCount;
      });
      setLoading53703(false);
    }, 500);
  }

  function handleLoadMore53713() {
    if (loading53713) return;
    setLoading53713(true);
    setTimeout(() => {
      setShown53713((prev) => {
        const nextCount = prev + LIMIT;
        if (nextCount >= props53713.length) {
          setHasMore53713(false);
        }
        return nextCount;
      });
      setLoading53713(false);
    }, 500);
  }

  // ----------------------------------------------------------------
  // Sections for 53703 and 53713
  // ----------------------------------------------------------------
  const displayed53703 = props53703.slice(0, shown53703);
  const displayed53713 = props53713.slice(0, shown53713);

  // ----------------------------------------------------------------
  // Render
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

      {/* Verification error */}
      {verifyError && (
        <p className="text-center text-red-500 my-2">{verifyError}</p>
      )}

      {/* If verifying */}
      {isVerifyingLocation && (
        <p className="text-center text-gray-600 my-2">
          Verifying location...
        </p>
      )}

      {/* If searching */}
      {isSearching && (
        <p className="text-center text-gray-600 my-2">
          Searching listings...
        </p>
      )}

      {/* If no search => message */}
      {!searchTerm && allProps.length === 0 && (
        <p className="text-center text-gray-600 my-8">
          No search yet — please enter a city or ZIP code above.
        </p>
      )}

      {/* Property list for main search */}
      {(searchTerm || displayedProperties.length > 0) && (
        <PropertyList
          properties={displayedProperties}
          className="my-8"
          searchTerm={searchTerm}
          isLoading={isSearching || isVerifyingLocation}
        />
      )}

      {/* "Load More" + spinner for main search */}
      <div className="flex justify-center items-center flex-col mb-16">
        {searchTerm && hasMore && !isSearching && !isVerifyingLocation && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mt-4 hover:bg-green-500 transition-colors"
            onClick={handleLoadMore}
            disabled={isLoadingMore}
          >
            {isLoadingMore ? "Loading more..." : "Load More"}
          </button>
        )}
        {isLoadingMore && (
          <div className="mt-4 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <p className="text-gray-700 mt-2">Loading more...</p>
          </div>
        )}
      </div>

      {/* Intersection observer trigger */}
      <div ref={observerRef} style={{ height: 1, marginBottom: 20 }} />

      {/* ---------------------------------------------------------------- */}
      {/* ADDED: Section for ZIP 53703 */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative w-full overflow-hidden text-white mb-8 shadow-xl rounded-md">
        <div className="absolute inset-0 z-0">
          <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black opacity-90" />
        </div>
        <div className="relative z-10 p-10 sm:p-16 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Properties in 53703
          </h2>
        </div>
      </div>

      <PropertyList
        properties={displayed53703}
        className="my-8"
        searchTerm="53703"
        isLoading={loading53703}
      />

      <div className="flex justify-center items-center flex-col mb-16">
        {hasMore53703 && !loading53703 && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded mt-4 hover:bg-blue-500 transition-colors"
            onClick={handleLoadMore53703}
            disabled={loading53703}
          >
            {loading53703 ? "Loading more..." : "Load More in 53703"}
          </button>
        )}
        {loading53703 && (
          <div className="mt-4 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <p className="text-gray-700 mt-2">Loading more...</p>
          </div>
        )}
      </div>

      {/* ---------------------------------------------------------------- */}
      {/* ADDED: Section for ZIP 53713 */}
      {/* ---------------------------------------------------------------- */}
      <div className="relative w-full overflow-hidden text-white mb-8 shadow-xl rounded-md">
        <div className="absolute inset-0 z-0">
          <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black opacity-90" />
        </div>
        <div className="relative z-10 p-10 sm:p-16 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-4">
            Properties in 53713
          </h2>
        </div>
      </div>

      <PropertyList
        properties={displayed53713}
        className="my-8"
        searchTerm="53713"
        isLoading={loading53713}
      />

      <div className="flex justify-center items-center flex-col mb-16">
        {hasMore53713 && !loading53713 && (
          <button
            className="bg-blue-600 text-white px-4 py-2 rounded mt-4 hover:bg-blue-500 transition-colors"
            onClick={handleLoadMore53713}
            disabled={loading53713}
          >
            {loading53713 ? "Loading more..." : "Load More in 53713"}
          </button>
        )}
        {loading53713 && (
          <div className="mt-4 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <p className="text-gray-700 mt-2">Loading more...</p>
          </div>
        )}
      </div>
    </main>
  );
}
