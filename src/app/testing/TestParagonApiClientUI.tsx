"use client";

import { useState } from "react";
import { Button, TextInput, Checkbox, Stack } from "@mantine/core";

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
            // Possibly a compare object
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

      <div style={{ marginTop: "30px" }}>
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

      <div style={{ marginTop: "30px" }}>
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

        {/* Now we do the property type checkboxes => multiple selection is allowed */}
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
                    // add it
                    setTypes((prev) => [...prev, opt]);
                  } else {
                    // remove it
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

      <ul style={{ marginTop: "40px", fontSize: "16px" }}>
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
  );
}
