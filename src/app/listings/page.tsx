"use client";

import { useEffect, useState, useRef } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import IParagonProperty from "@/types/IParagonProperty";
import PropertyList from "@/components/paragon/PropertyList";

// ----------------------------------------------------------------
// UTILS
// ----------------------------------------------------------------
function isLikelyZip(input: string) {
  return /^[0-9]{4,10}$/.test(input);
}

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

function toTitleCase(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// ----------------------------------------------------------------
// 1) Simple Search bar
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

// ----------------------------------------------------------------
// 2) Main ListingsPage
// ----------------------------------------------------------------
export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  // The user’s search term (city or zip)
  const initialTerm = searchParams.get("q") || "";
  const [searchTerm, setSearchTerm] = useState(initialTerm);

  // The main search results
  const [allProps, setAllProps] = useState<IParagonProperty[]>([]);
  const [shownCount, setShownCount] = useState(0);
  const [hasMore, setHasMore] = useState(false);

  const [isVerifyingLocation, setIsVerifyingLocation] = useState(false);
  const [isSearching, setIsSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);

  const [title, setTitle] = useState("Listings");
  const [verifyError, setVerifyError] = useState("");

  // The top “All listings for Tim” data
  const [timListings, setTimListings] = useState<IParagonProperty[]>([]);
  const [loadingTim, setLoadingTim] = useState(false);

  const LIMIT = 6;
  const observerRef = useRef<HTMLDivElement | null>(null);

  // (A) On mount => fetch Tim’s listings
  useEffect(() => {
    async function fetchTim() {
      try {
        setLoadingTim(true);
        const resp = await axios.get("/api/v1/listings", {
          params: { agentName: "Tim Flores" },
        });
        const data: IParagonProperty[] = resp.data;
        setTimListings(data);
      } catch (err) {
        console.error("[fetchTim] => error:", err);
      } finally {
        setLoadingTim(false);
      }
    }
    fetchTim();
  }, []);

  // (B) On new searchTerm => verify => fetch => setAllProps
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
        let data = res.data as IParagonProperty[];

        // Filter out 53706 & 53713 from these search results
        data = data.filter(
          (p) => p.PostalCode !== "53713" && p.PostalCode !== "53706"
        );

        if (data.length > 0) {
          setAllProps(data);
          setShownCount(Math.min(data.length, LIMIT));
          setHasMore(data.length > LIMIT);
        } else {
          setAllProps([]);
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

  // (C) handleSearch => city/zip => setSearchTerm
  function handleSearch(term: string) {
    router.push(`/listings?q=${term}`);
    setSearchTerm(term);
    setVerifyError("");
  }

  // (D) "Load More"
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
  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver(
        (entries) => {
          const first = entries[0];
          if (
            first.isIntersecting &&
            hasMore &&
            !isSearching &&
            !isLoadingMore &&
            displayedProperties.length < allProps.length
          ) {
            handleLoadMore();
          }
        },
        {
          root: null,
          rootMargin: "0px 0px 300px 0px",
        }
      );
      observer.observe(el);
    }
    return () => {
      if (observer && el) observer.unobserve(el);
    };
  }, [observerRef, hasMore, isSearching, isLoadingMore, displayedProperties.length, allProps.length]);

  const isBusy = isVerifyingLocation || isSearching || isLoadingMore;
  const pageCursor = isBusy ? "cursor-wait" : "cursor-auto";

  // RENDER
  return (
    <main
      className={`container mx-auto px-4 min-h-screen ${pageCursor}`}
      style={{
        overflowY: "auto",
      }}
    >
      {/* Banner */}
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

      {/* Verification error / Loading states */}
      {verifyError && (
        <p className="text-center text-red-500 my-2">{verifyError}</p>
      )}
      {isVerifyingLocation && (
        <p className="text-center text-gray-600 my-2">Verifying location...</p>
      )}
      {isSearching && (
        <p className="text-center text-gray-600 my-2">Searching listings...</p>
      )}

      {/* If no search => message */}
      {!searchTerm && allProps.length === 0 && (
        <p className="text-center text-gray-600 my-8">
          No search yet — please enter a city or ZIP code above.
        </p>
      )}

      {/* Tim's listings block */}
      <div className="relative w-full overflow-hidden text-white mb-8 shadow-xl rounded-md">
        <div className="absolute inset-0 z-0">
          <div className="h-full w-full bg-gradient-to-b from-green-900 to-green-700 opacity-90" />
        </div>
        <div className="relative z-10 p-8 sm:p-12 flex flex-col items-center justify-center text-center">
          <h2 className="text-2xl sm:text-4xl font-bold mb-2">
            All Listings for Tim Flores
          </h2>
          {loadingTim ? (
            <p className="mt-3">Loading Tim’s listings...</p>
          ) : (
            <p className="mt-2 text-sm">
              Check out all the active & pending listings under Tim’s name.
            </p>
          )}
        </div>
      </div>
      {/* 
        Importantly, we do NOT pass onPropertyClick here
        => normal link-based approach in the card 
      */}
      <PropertyList
        properties={timListings}
        className="my-8"
        searchTerm="TimFlores"
        isLoading={loadingTim}
      />

      {/* User’s search results */}
      {displayedProperties.length > 0 && (
        <PropertyList
          properties={displayedProperties}
          className="my-8"
          searchTerm={searchTerm}
          isLoading={isSearching || isVerifyingLocation}
        />
      )}

      {/* Load more */}
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
    </main>
  );
}
