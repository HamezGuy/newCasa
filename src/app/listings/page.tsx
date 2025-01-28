"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import axios from "axios";
import Image from "next/image";
import IParagonProperty from "@/types/IParagonProperty";
import PropertyList from "@/components/paragon/PropertyList";

// Checks if user input is likely a zip code (digits, length 4–10)
function isLikelyZip(input: string) {
  return /^[0-9]{4,10}$/.test(input);
}

/**
 * Input bar that calls onSearch(value) when user presses Enter or clicks Search
 */
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

/**
 * Main listings page with:
 * - Single-size, dark glossy banner with slight shadow
 * - Query param reading (q=)
 * - "Load More" or infinite scrolling
 * - Spinner while loading
 * - No "Active Properties" text
 */
export default function ListingsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialTerm = searchParams.get("q") || "";

  const [searchTerm, setSearchTerm] = useState(initialTerm);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [properties, setProperties] = useState<IParagonProperty[]>([]);

  // Page title & subtitle for the banner
  const [title, setTitle] = useState("Listings");
  const [subTitle, setSubTitle] = useState("No search yet...");

  // fetchListings => calls /api/v1/listings
  const fetchListings = useCallback(
    async (reset: boolean) => {
      if (reset) {
        setProperties([]);
        setPage(1);
        setHasMore(true);
      }

      // If we skip fetching when there's no searchTerm:
      if (!searchTerm) return;

      setIsLoading(true);
      try {
        const params: Record<string, any> = {
          page: reset ? 1 : page,
          limit: 6,
        };

        // Decide if the term is ZIP or City
        if (isLikelyZip(searchTerm)) {
          params.zipCode = searchTerm;
          setTitle(`Listings in ZIP ${searchTerm}`);
          // Removing "Active Properties" => just clear or set an empty subTitle
          setSubTitle("");
        } else {
          params.city = searchTerm;
          setTitle(`Listings in ${searchTerm}`);
          setSubTitle("");
        }

        const res = await axios.get("/api/v1/listings", { params });
        const data = res.data as IParagonProperty[];

        if (reset) {
          setProperties(data);
        } else {
          setProperties((prev) => [...prev, ...data]);
        }

        // If we got fewer than limit => no more data
        if (data.length < params.limit) {
          setHasMore(false);
        } else {
          setHasMore(true);
        }
      } catch (err) {
        console.error("Error fetching listings:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [page, searchTerm]
  );

  // On mount => do initial search if ?q=...
  useEffect(() => {
    if (initialTerm) {
      setSearchTerm(initialTerm);
      fetchListings(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If page changes => fetch more
  useEffect(() => {
    if (page > 1) {
      fetchListings(false);
    }
  }, [page, fetchListings]);

  // handleSearch => from input
  function handleSearch(term: string) {
    setSearchTerm(term);
    const newQuery = new URLSearchParams();
    newQuery.set("q", term);
    router.push(`/listings?${newQuery.toString()}`);

    setPage(1);
    fetchListings(true);
  }

  // "Load More"
  function handleLoadMore() {
    setPage((prev) => prev + 1);
  }

  // Intersection Observer for infinite scrolling
  const observerRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const observerElem = observerRef.current;
    if (!observerElem) return;

    let observer: IntersectionObserver | null = null;
    if ("IntersectionObserver" in window) {
      observer = new IntersectionObserver((entries) => {
        const firstEntry = entries[0];
        if (firstEntry.isIntersecting && hasMore && !isLoading && searchTerm) {
          console.log("[ListingsPage] Auto-loading next page...", page + 1);
          setPage((prev) => prev + 1);
        }
      });
      observer.observe(observerElem);
    }

    return () => {
      if (observer && observerElem) observer.unobserve(observerElem);
    };
  }, [observerRef, hasMore, isLoading, page, searchTerm]);

  // If loading => show wait-cursor
  const pageCursor = isLoading ? "cursor-wait" : "cursor-auto";

  return (
    <main className={`container mx-auto px-4 ${pageCursor}`}>
      {/*
        Banner: 
        - same size at all times, 
        - darker glossy gradient 
        - slight shadow (shadow-xl) 
      */}
      <div className="relative w-full overflow-hidden text-white mb-8 shadow-xl rounded-md">
        {/* 
          Glossy black gradient. 
          We use an absolute background, plus potential optional image if you want
        */}
        <div className="absolute inset-0 z-0">
          <div className="h-full w-full bg-gradient-to-b from-gray-900 to-black opacity-90" />
        </div>
        <div className="relative z-10 p-10 sm:p-16 flex flex-col items-center justify-center text-center">
          <h1 className="text-3xl sm:text-5xl font-bold mb-4">{title}</h1>
          {subTitle && <p className="text-base sm:text-lg">{subTitle}</p>}
        </div>
      </div>

      {/* Search bar */}
      <ListingsSearchBar onSearch={handleSearch} />

      {/* If user hasn't searched => short message */}
      {!searchTerm && properties.length === 0 && (
        <p className="text-center text-gray-600 my-8">
          No search yet — please enter a city or ZIP code above.
        </p>
      )}

      {/* Property list if we have searchTerm or existing props */}
      {searchTerm || properties.length > 0 ? (
        <PropertyList properties={properties} className="my-8" searchTerm={searchTerm} />
      ) : null}

      {/* "Load More" pagination */}
      <div className="flex justify-center items-center flex-col mb-16">
        {searchTerm && hasMore && !isLoading && (
          <button
            className="bg-green-600 text-white px-4 py-2 rounded mt-4 hover:bg-green-500 transition-colors"
            onClick={handleLoadMore}
          >
            Load More
          </button>
        )}

        {/* spinner if isLoading */}
        {isLoading && (
          <div className="mt-4 flex flex-col items-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900" />
            <p className="text-gray-700 mt-2">Loading...</p>
          </div>
        )}
      </div>

      {/* Intersection observer trigger */}
      <div ref={observerRef} style={{ height: 1, marginBottom: 20 }} />
    </main>
  );
}
