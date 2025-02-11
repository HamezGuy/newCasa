"use client";

import { useState } from "react";
import { Button } from "@mantine/core";

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

  // We'll define 4 sets: raw debug, normal filter, raw-then-filter, and compare
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

  // Compare tests
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
            // Possibly a compare object (missingInRaw, missingInFilter, etc.)
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

      <ul style={{ marginTop: "20px", fontSize: "16px" }}>
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
