'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useGeocode } from '@/components/search/GeocodeContext';
import { useBounds } from '@/components/search/boundscontext';
import SearchFilters from '@/components/search/SearchFilters';
import SearchInput from '@/components/search/SearchInput';
import { SearchResultsMap } from '@/components/search/SearchResultsMap';
import PropertyList from '@/components/paragon/PropertyList';
import GoogleMapsClientProvider from '@/components/core/GoogleMapsClientProvider';

export default function Search() {
  const [filteredProperties, setFilteredProperties] = useState([]);
  const [loading, setLoading] = useState(false);

  const { setGeocodeData } = useGeocode();
  const { setBounds } = useBounds();
  const searchParams = useSearchParams();

  // 1) fetchProperties => called whenever query changes
  const fetchProperties = async (
    zipCode?: string,
    streetName?: string,
    city?: string,
    county?: string
  ) => {
    setLoading(true);
    try {
      let url = '/api/v1/listings';
      const queries: string[] = [];
      if (zipCode) queries.push(`zipCode=${encodeURIComponent(zipCode)}`);
      if (streetName) queries.push(`streetName=${encodeURIComponent(streetName)}`);
      if (city) queries.push(`city=${encodeURIComponent(city)}`);
      if (county) queries.push(`county=${encodeURIComponent(county)}`);

      if (queries.length > 0) {
        url += `?${queries.join('&')}`;
      }

      console.log('[Search Page] fetchProperties =>', url);
      const response = await fetch(url);
      if (response.ok) {
        const data = await response.json();
        console.log('[Search Page] fetchProperties => data:', data);
        setFilteredProperties(data);
      } else {
        console.error('[Search Page] fetchProperties => error:', await response.text());
        setFilteredProperties([]);
      }
    } catch (error) {
      console.error('[Search Page] fetchProperties => exception:', error);
      setFilteredProperties([]);
    } finally {
      setLoading(false);
    }
  };

  // 2) parse geocode=... from URL if present
  useEffect(() => {
    const geocodeStr = searchParams.get('geocode');
    if (geocodeStr) {
      try {
        const decoded = decodeURIComponent(geocodeStr);
        const parsed = JSON.parse(decoded);
        console.log('[Search Page] parsed geocode from URL =>', parsed);
        setGeocodeData(parsed);
        if (parsed.bounds) setBounds(parsed.bounds);
      } catch (err) {
        console.error('[Search Page] Error parsing geocode param:', err);
      }
    }
  }, [searchParams, setGeocodeData, setBounds]);

  // 3) whenever the user’s URL changes, fetch
  useEffect(() => {
    const zipCode = searchParams.get('zipCode') || undefined;
    const streetName = searchParams.get('streetName') || undefined;
    const city = searchParams.get('city') || undefined;
    const county = searchParams.get('county') || undefined;

    if (!zipCode && !streetName && !city && !county) {
      console.log('[Search Page] No query param => fetch all');
      fetchProperties();
    } else {
      fetchProperties(zipCode, streetName, city, county);
    }
  }, [searchParams]);

  // 4) If user does a new search from within /search page
  const handlePlaceSelected = (geocodeData: any) => {
    if (!geocodeData || !geocodeData.bounds) {
      console.error('[Search] handlePlaceSelected => invalid geocode data:', geocodeData);
      return;
    }
    console.log('[Search] handlePlaceSelected => setting geocode data:', geocodeData);
    setGeocodeData(geocodeData);
    setBounds(geocodeData.bounds);

    const comps = geocodeData.address_components || [];
    const zipCode = comps.find((c: any) => c.types.includes('postal_code'))?.long_name;
    const route = comps.find((c: any) => c.types.includes('route'))?.long_name;
    const city = comps.find((c: any) => c.types.includes('locality'))?.long_name;
    const county = comps.find((c: any) => c.types.includes('administrative_area_level_2'))?.long_name;

    if (zipCode) {
      fetchProperties(zipCode);
    } else if (route) {
      fetchProperties(undefined, route);
    } else if (city) {
      fetchProperties(undefined, undefined, city);
    } else if (county) {
      fetchProperties(undefined, undefined, undefined, county);
    } else {
      console.warn('[Search] handlePlaceSelected => no recognized param => no new fetch');
    }
  };

  const handleFiltersUpdate = (filters: any) => {
    console.log('[Search] handleFiltersUpdate =>', filters);
  };

  return (
    <main className="flex flex-col w-full h-screen">
      {/* Top bar => user can do a new search or use filters */}
      <div className="flex flex-wrap w-full p-4 gap-4 bg-gray-100 shadow-md z-10">
        <SearchInput size="sm" onPlaceSelected={handlePlaceSelected} isRedirectEnabled={false} />
        <SearchFilters onUpdate={handleFiltersUpdate} />
      </div>

      <div className="flex flex-grow w-full h-full">
        <div className="w-full lg:w-2/3 h-full">
          {/* Using the updated GoogleMapsClientProvider => only loads script once */}
          <GoogleMapsClientProvider>
            <SearchResultsMap properties={filteredProperties} />
          </GoogleMapsClientProvider>
        </div>

        <div className="w-full lg:w-1/3 h-full overflow-y-auto p-4 bg-white shadow-inner">
          {loading ? (
            <p className="text-center text-gray-500 mt-4">Loading properties...</p>
          ) : filteredProperties.length > 0 ? (
            <PropertyList properties={filteredProperties} />
          ) : (
            <p className="text-center text-gray-500 mt-4">No properties found.</p>
          )}
        </div>
      </div>
    </main>
  );
}
