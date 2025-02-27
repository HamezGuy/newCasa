"use client";

import { useState } from "react";
import { Button, TextInput, Checkbox, Stack, NumberInput, Tabs } from "@mantine/core";

interface DebugTest {
  label: string;
  param: string;
}

interface DownloadableResult {
  label: string;
  data: any; // could be items or an object with missing keys
  count: number;
  error?: string;
}

export default function TestParagonApiClientUI() {
  const [results, setResults] = useState<DownloadableResult[]>([]);
  const [loading, setLoading] = useState(false);

  // Local states for property ID
  const [propertyId, setPropertyId] = useState("");

  // States for user-filters
  const [minPrice, setMinPrice] = useState("");
  const [maxPrice, setMaxPrice] = useState("");
  const [types, setTypes] = useState<string[]>([]); // multiple selection
  const [minRooms, setMinRooms] = useState("");
  const [maxRooms, setMaxRooms] = useState("");

  // Additional local states for "Store to Firebase"
  const [storeCity, setStoreCity] = useState("");
  const [storeZip, setStoreZip] = useState("");
  const [storeResult, setStoreResult] = useState("");
  const [storing, setStoring] = useState(false);
  
  // Address search with radius
  const [searchAddress, setSearchAddress] = useState("");
  const [searchRadius, setSearchRadius] = useState(1);
  const [addressSearching, setAddressSearching] = useState(false);
  
  // NEW: Direct address test using test-address endpoint
  const [testAddress, setTestAddress] = useState("842 S Brooks St, Madison, WI 53715, USA");
  const [testRadius, setTestRadius] = useState(0);
  const [testAddressResult, setTestAddressResult] = useState<any>(null);
  const [testAddressLoading, setTestAddressLoading] = useState(false);

  // Hardcoded type options => we show them as checkboxes
  const propertyTypeOptions = [
    "Commercial Sale",
    "Residential",
    "Multi Family",
    "Land",
  ];

  // We'll define sets of debug tests
  const rawTests: DebugTest[] = [
    { label: "RAW Zip 53713", param: "raw_53713" },
    { label: "RAW Zip 53703", param: "raw_53703" },
    { label: "RAW City=Madison", param: "raw_madison" },
  ];

  const normalTests: DebugTest[] = [
    { label: "FilterFirst Zip=53713", param: "zip53713" },
    { label: "FilterFirst Zip=53703", param: "zip53703" },
    { label: "FilterFirst City=Madison", param: "madison" },
    { label: "FilterFirst Street=Moorland Road", param: "street_moorland" },
  ];

  const inMemoryTests: DebugTest[] = [
    { label: "RawThenFilter Zip=53713", param: "rawThenFilter_53713" },
    { label: "RawThenFilter Zip=53703", param: "rawThenFilter_53703" },
    { label: "RawThenFilter City=Madison", param: "rawThenFilter_madison" },
  ];

  const compareTests: DebugTest[] = [
    { label: "Compare Zip=53713", param: "compare_53713" },
    { label: "Compare Zip=53703", param: "compare_53703" },
    { label: "Compare City=Madison", param: "compare_madison" },
  ];

  async function runTests() {
    setLoading(true);
    const newResults: DownloadableResult[] = [];

    const allTests = [...rawTests, ...normalTests, ...inMemoryTests, ...compareTests];

    for (const t of allTests) {
      const url = `/api/v1/Testing?test=${t.param}`;
      console.log("Fetching =>", url);

      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          let e;
          try {
            e = await resp.json();
          } catch (parseErr) {
            e = { error: (parseErr as Error).toString() };
          }
          newResults.push({
            label: t.label,
            data: [],
            count: 0,
            error: `HTTP ${resp.status} => ${JSON.stringify(e)}`,
          });
        } else {
          const json = await resp.json();
          // If it's a standard result with items & count:
          if (json.items || typeof json.count === "number") {
            const items = json.items || [];
            const count = json.count || items.length;
            newResults.push({
              label: t.label,
              data: items,
              count,
            });
          } else {
            // Possibly a compare object or error
            if (json.error) {
              newResults.push({
                label: t.label,
                data: [],
                count: 0,
                error: json.error,
              });
            } else {
              const countGuess = json.rawCount || json.filterCount || 0;
              newResults.push({
                label: t.label,
                data: json,
                count: countGuess,
              });
            }
          }
        }
      } catch (err: any) {
        newResults.push({
          label: t.label,
          data: [],
          count: 0,
          error: err.toString(),
        });
      }
    }

    setResults(newResults);
    setLoading(false);
  }

  // Single property by ID
  async function handleGetById() {
    if (!propertyId.trim()) return;
    setLoading(true);
    try {
      const url = `/api/v1/Testing?test=byId&propertyId=${encodeURIComponent(propertyId)}`;
      const resp = await fetch(url);
      if (!resp.ok) {
        const e = await resp.json();
        setResults((old) => [
          ...old,
          {
            label: `ById:${propertyId}`,
            data: [],
            count: 0,
            error: `HTTP ${resp.status} => ${JSON.stringify(e)}`,
          },
        ]);
      } else {
        const json = await resp.json();
        if (json.item) {
          setResults((old) => [
            ...old,
            {
              label: `ById:${propertyId}`,
              data: [json.item],
              count: 1,
            },
          ]);
        } else {
          setResults((old) => [
            ...old,
            {
              label: `ById:${propertyId}`,
              data: [],
              count: 0,
              error: JSON.stringify(json),
            },
          ]);
        }
      }
    } catch (error: any) {
      setResults((old) => [
        ...old,
        {
          label: `ById:${propertyId}`,
          data: [],
          count: 0,
          error: error.toString(),
        },
      ]);
    }
    setLoading(false);
  }

  // userFilters test
  async function handleUserFiltersTest() {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (minPrice) params.set("minPrice", minPrice);
      if (maxPrice) params.set("maxPrice", maxPrice);
      if (minRooms) params.set("minRooms", minRooms);
      if (maxRooms) params.set("maxRooms", maxRooms);

      // For multiple propertyTypes => propertyType=... repeated
      types.forEach((t) => params.append("propertyType", t));

      params.set("test", "userFilters");

      const url = `/api/v1/Testing?${params.toString()}`;
      console.log("handleUserFiltersTest =>", url);

      const resp = await fetch(url);
      if (!resp.ok) {
        const e = await resp.json();
        setResults((old) => [
          ...old,
          {
            label: "UserFilters Test",
            data: [],
            count: 0,
            error: `HTTP ${resp.status} => ${JSON.stringify(e)}`,
          },
        ]);
      } else {
        const json = await resp.json();
        const items = json.items || [];
        const count = json.count || items.length;
        setResults((old) => [
          ...old,
          {
            label: "UserFilters Test",
            data: items,
            count,
          },
        ]);
      }
    } catch (error: any) {
      setResults((old) => [
        ...old,
        {
          label: "UserFilters Test",
          data: [],
          count: 0,
          error: error.toString(),
        },
      ]);
    }
    setLoading(false);
  }

  // ---------------------------------------------
  // Store to Firebase (based on city or zip)
  // ---------------------------------------------
  async function handleStoreToFirebase() {
    // Must have at least city or zip
    if (!storeCity.trim() && !storeZip.trim()) {
      alert("Please enter a City or a Zipcode");
      return;
    }

    setStoring(true);
    setStoreResult("");

    const params = new URLSearchParams();
    params.set("test", "storeFirebase");
    if (storeCity.trim()) params.set("city", storeCity.trim());
    if (storeZip.trim()) params.set("zip", storeZip.trim());

    const url = `/api/v1/Testing?${params.toString()}`;

    try {
      const resp = await fetch(url);
      const json = await resp.json();
      if (!resp.ok) {
        setStoreResult(`Error: HTTP ${resp.status} => ${JSON.stringify(json)}`);
      } else {
        // e.g. { success: true, message: "...some message..." }
        setStoreResult(JSON.stringify(json, null, 2));
      }
    } catch (err: any) {
      setStoreResult(`Error: ${err.toString()}`);
    } finally {
      setStoring(false);
    }
  }
  
  // ---------------------------------------------
  // Search by address with radius
  // ---------------------------------------------
  async function handleAddressSearch() {
    if (!searchAddress.trim()) {
      alert("Please enter an address to search");
      return;
    }
    
    setAddressSearching(true);
    
    try {
      // First, make the API call to get properties near the address
      const params = new URLSearchParams();
      params.set("address", searchAddress);
      params.set("radius", searchRadius.toString());
      
      const url = `/api/v1/listings?${params.toString()}`;
      console.log("Address search URL:", url);
      
      const resp = await fetch(url);
      
      if (!resp.ok) {
        const errorText = await resp.text();
        setResults((old) => [
          ...old,
          {
            label: `Address: ${searchAddress} (${searchRadius} miles)`,
            data: [],
            count: 0,
            error: `HTTP ${resp.status} => ${errorText}`,
          },
        ]);
      } else {
        const properties = await resp.json();
        setResults((old) => [
          ...old,
          {
            label: `Address: ${searchAddress} (${searchRadius} miles)`,
            data: properties,
            count: properties.length,
          },
        ]);
      }
    } catch (error: any) {
      setResults((old) => [
        ...old,
        {
          label: `Address: ${searchAddress} (${searchRadius} miles)`,
          data: [],
          count: 0,
          error: error.toString(),
        },
      ]);
    } finally {
      setAddressSearching(false);
    }
  }
  
  // ---------------------------------------------
  // NEW: Test address using test-address endpoint
  // ---------------------------------------------
  async function handleTestAddress() {
    if (!testAddress.trim()) {
      alert("Please enter an address to test");
      return;
    }
    
    setTestAddressLoading(true);
    setTestAddressResult(null);
    
    try {
      const params = new URLSearchParams();
      params.set("address", testAddress);
      params.set("radius", testRadius.toString());
      
      const url = `/api/v1/test-address?${params.toString()}`;
      console.log("Testing address URL:", url);
      
      const resp = await fetch(url);
      
      if (!resp.ok) {
        const errorData = await resp.json();
        setTestAddressResult({
          error: true,
          status: resp.status,
          message: errorData.error || "Unknown error",
          details: errorData
        });
      } else {
        const result = await resp.json();
        setTestAddressResult(result);
        
        // Also add to results list
        setResults((old) => [
          ...old,
          {
            label: `Test Address: ${testAddress} (${testRadius} miles)`,
            data: result.properties || [],
            count: result.propertiesFound || 0,
          },
        ]);
      }
    } catch (error: any) {
      setTestAddressResult({
        error: true,
        message: error.toString(),
      });
    } finally {
      setTestAddressLoading(false);
    }
  }

  function makeDownloadLink(r: DownloadableResult) {
    const text = JSON.stringify(r.data, null, 2);
    const blob = new Blob([text], { type: "text/plain" });
    return URL.createObjectURL(blob);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Paragon API Test Results (Raw + FilterFirst + RawThenFilter + Compare)</h2>
      <Button onClick={runTests} loading={loading}>
        Run Tests
      </Button>

      <Tabs defaultValue="address" style={{ marginTop: "30px" }}>
        <Tabs.List>
          <Tabs.Tab value="address">Address Testing</Tabs.Tab>
          <Tabs.Tab value="property">Property By ID</Tabs.Tab>
          <Tabs.Tab value="filters">User Filters</Tabs.Tab>
          <Tabs.Tab value="firebase">Firebase</Tabs.Tab>
        </Tabs.List>

        <Tabs.Panel value="address" pt="xs">
          <div style={{ marginTop: "20px" }}>
            <h3>Test Address Search (Direct API Test)</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              <TextInput
                placeholder="Enter full address"
                value={testAddress}
                onChange={(e) => setTestAddress(e.currentTarget.value)}
                style={{ width: "400px" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Radius (miles):</span>
                <NumberInput
                  value={testRadius}
                  onChange={(val) => setTestRadius(Number(val) || 0)}
                  min={0}
                  max={10}
                  step={0.5}
                  style={{ width: "80px" }}
                />
              </div>
              <Button onClick={handleTestAddress} loading={testAddressLoading}>
                Test Address API
              </Button>
            </div>
            
            {testAddressResult && (
              <div style={{ marginTop: "15px" }}>
                {testAddressResult.error ? (
                  <div style={{ color: "red", padding: "10px", border: "1px solid red", borderRadius: "4px" }}>
                    <h4>Error Testing Address</h4>
                    <p>{testAddressResult.message}</p>
                    {testAddressResult.details && (
                      <pre>{JSON.stringify(testAddressResult.details, null, 2)}</pre>
                    )}
                  </div>
                ) : (
                  <div>
                    <h4>Address Test Results</h4>
                    <div style={{ display: "grid", gridTemplateColumns: "150px 1fr", rowGap: "8px" }}>
                      <div><strong>Address:</strong></div>
                      <div>{testAddressResult.address}</div>
                      
                      <div><strong>Properties Found:</strong></div>
                      <div>{testAddressResult.propertiesFound}</div>
                      
                      <div><strong>Geocoding:</strong></div>
                      <div>{testAddressResult.geocoding?.success ? 'Success' : 'Failed'}</div>
                      
                      {testAddressResult.geocoding?.success && (
                        <>
                          <div><strong>Formatted Address:</strong></div>
                          <div>{testAddressResult.geocoding.formattedAddress}</div>
                          
                          <div><strong>Street Number:</strong></div>
                          <div>{testAddressResult.geocoding.extractedComponents.streetNumber || 'Not found'}</div>
                          
                          <div><strong>Street Name:</strong></div>
                          <div>{testAddressResult.geocoding.extractedComponents.streetName || 'Not found'}</div>
                          
                          <div><strong>City:</strong></div>
                          <div>{testAddressResult.geocoding.extractedComponents.city || 'Not found'}</div>
                        </>
                      )}
                    </div>
                    
                    {testAddressResult.propertiesFound > 0 && (
                      <div style={{ marginTop: "15px" }}>
                        <h4>Properties Found</h4>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "10px" }}>
                          {testAddressResult.properties.map((prop: any) => (
                            <div key={prop.ListingKey} style={{ border: "1px solid #ddd", padding: "10px", borderRadius: "4px" }}>
                              <p><strong>Listing Key:</strong> {prop.ListingKey}</p>
                              <p><strong>Price:</strong> ${prop.ListPrice?.toLocaleString()}</p>
                              <p><strong>Address:</strong> {prop.StreetNumber} {prop.StreetName}</p>
                              <p><strong>City:</strong> {prop.City}</p>
                              <p><strong>Status:</strong> {prop.StandardStatus}</p>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ marginTop: "15px" }}>
                      <Button 
                        onClick={() => {
                          const text = JSON.stringify(testAddressResult, null, 2);
                          const blob = new Blob([text], { type: "text/plain" });
                          const url = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = url;
                          a.download = `address_test_${testAddress.replace(/[^a-z0-9]/gi, '_')}.json`;
                          a.click();
                        }}
                      >
                        Download Full Result
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
          
          <div style={{ marginTop: "30px" }}>
            <h3>Search Properties by Address (via listings API)</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              <TextInput
                placeholder="Enter full address"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.currentTarget.value)}
                style={{ width: "300px" }}
              />
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span>Radius (miles):</span>
                <NumberInput
                  value={searchRadius}
                  onChange={(val) => setSearchRadius(Number(val) || 1)}
                  min={0.5}
                  max={10}
                  step={0.5}
                  style={{ width: "80px" }}
                />
              </div>
              <Button onClick={handleAddressSearch} loading={addressSearching}>
                Search by Address
              </Button>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="property" pt="xs">
          <div style={{ marginTop: "20px" }}>
            <h3>Lookup Single Property By ID</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <TextInput
                placeholder="Enter propertyId"
                value={propertyId}
                onChange={(e) => setPropertyId(e.currentTarget.value)}
              />
              <Button onClick={handleGetById} loading={loading}>
                Get By ID
              </Button>
            </div>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="filters" pt="xs">
          <div style={{ marginTop: "20px" }}>
            <h3>User Filters Test</h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "10px" }}>
              <TextInput
                placeholder="Min Price"
                value={minPrice}
                onChange={(e) => setMinPrice(e.currentTarget.value)}
                style={{ width: "120px" }}
              />
              <TextInput
                placeholder="Max Price"
                value={maxPrice}
                onChange={(e) => setMaxPrice(e.currentTarget.value)}
                style={{ width: "120px" }}
              />
              <TextInput
                placeholder="Min Rooms"
                value={minRooms}
                onChange={(e) => setMinRooms(e.currentTarget.value)}
                style={{ width: "120px" }}
              />
              <TextInput
                placeholder="Max Rooms"
                value={maxRooms}
                onChange={(e) => setMaxRooms(e.currentTarget.value)}
                style={{ width: "120px" }}
              />
            </div>

            {/* Property Type checkboxes => multiple selection */}
            <div style={{ marginBottom: "10px" }}>
              <label style={{ fontWeight: "bold", display: "block", marginBottom: "4px" }}>
                Property Types
              </label>
              <Stack style={{ gap: "8px" }}>
                {propertyTypeOptions.map((opt) => (
                  <Checkbox
                    key={opt}
                    label={opt}
                    value={opt}
                    checked={types.includes(opt)}
                    onChange={(e) => {
                      if (e.currentTarget.checked) {
                        setTypes((prev) => [...prev, opt]);
                      } else {
                        setTypes((prev) => prev.filter((x) => x !== opt));
                      }
                    }}
                  />
                ))}
              </Stack>
            </div>

            <Button onClick={handleUserFiltersTest} loading={loading}>
              Test User Filters
            </Button>
          </div>
        </Tabs.Panel>

        <Tabs.Panel value="firebase" pt="xs">
          <div style={{ marginTop: "20px" }}>
            <h3>Store Active/Pending Properties to Firebase</h3>
            <p>Enter a city or zip code, then click the button.</p>
            <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
              <TextInput
                placeholder="City"
                value={storeCity}
                onChange={(e) => setStoreCity(e.currentTarget.value)}
              />
              <TextInput
                placeholder="Zip Code"
                value={storeZip}
                onChange={(e) => setStoreZip(e.currentTarget.value)}
              />
              <Button onClick={handleStoreToFirebase} loading={storing}>
                Store to Firebase
              </Button>
            </div>
            {storeResult && (
              <pre
                style={{
                  background: "#f3f3f3",
                  padding: "10px",
                  marginTop: "10px",
                  border: "1px solid #ccc",
                  whiteSpace: "pre-wrap",
                  overflow: "auto",
                }}
              >
                {storeResult}
              </pre>
            )}
          </div>
        </Tabs.Panel>
      </Tabs>

      <div style={{ marginTop: "40px" }}>
        <h3>Test Results</h3>
        <ul style={{ fontSize: "16px" }}>
          {results.map((r, idx) => (
            <li key={idx} style={{ marginBottom: "10px" }}>
              <strong>{r.label}:</strong>{" "}
              {r.error ? (
                <span style={{ color: "red" }}>
                  {"Error => "}
                  {r.error}
                </span>
              ) : (
                <>
                  Found {r.count} items.{" "}
                  {r.count > 0 && (
                    <a
                      href={makeDownloadLink(r)}
                      download={`${r.label.replace(/\s+/g, "_")}.json`}
                      style={{ marginLeft: 8, color: "blue" }}
                    >
                      Download
                    </a>
                  )}
                </>
              )}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}