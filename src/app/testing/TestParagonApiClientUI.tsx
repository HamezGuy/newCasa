"use client";

import { useState } from "react";
import { Button } from "@mantine/core";

// Each test object references the "test" param we pass to /api/v1/Testing?test=xxx
interface DebugTest {
  label: string;
  param: string; // e.g. "zip53713", "zip53703", "madison"
}

interface DownloadableResult {
  label: string;
  data: any[]; // the raw items
  count: number;
  error?: string;
}

export default function TestParagonApiClientUI() {
  const [results, setResults] = useState<DownloadableResult[]>([]);
  const [loading, setLoading] = useState(false);

  // We define the 3 "raw" tests we want
  const tests: DebugTest[] = [
    { label: "Raw Zip 53713", param: "zip53713" },
    { label: "Raw Zip 53703", param: "zip53703" },
    { label: "Raw City=Madison", param: "madison" },
  ];

  async function runTests() {
    setLoading(true);
    const newResults: DownloadableResult[] = [];

    for (const t of tests) {
      const url = `/api/v1/Testing?test=${t.param}`;
      console.log("Fetching =>", url);

      try {
        const resp = await fetch(url);
        if (!resp.ok) {
          const e = await resp.json();
          newResults.push({
            label: t.label,
            data: [],
            count: 0,
            error: `HTTP ${resp.status} => ${JSON.stringify(e)}`,
          });
        } else {
          const json = await resp.json();
          // we expect { items: <array>, count: number } or { error: string }
          if (json.error) {
            newResults.push({
              label: t.label,
              data: [],
              count: 0,
              error: json.error,
            });
          } else {
            const items = json.items || [];
            const count = json.count || items.length;
            newResults.push({
              label: t.label,
              data: items,
              count,
            });
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

  // Build a "download" link for each result => a data URL from the JSON
  function makeDownloadLink(r: DownloadableResult) {
    // The data is an array => let's JSON-stringify.
    const text = JSON.stringify(r.data, null, 2);
    const blob = new Blob([text], { type: "text/plain" });
    return URL.createObjectURL(blob);
  }

  return (
    <div style={{ padding: "20px" }}>
      <h2>Paragon API Test Results (Raw Data)</h2>
      <Button onClick={runTests} loading={loading}>
        Run Tests
      </Button>

      <ul style={{ marginTop: "20px", fontSize: "16px" }}>
        {results.map((r, idx) => (
          <li key={idx} style={{ marginBottom: "10px" }}>
            <strong>{r.label}:</strong>{" "}
            {r.error ? (
              // Use "Error => " as a safe string
              <span style={{ color: "red" }}>{"Error => "}{r.error}</span>
            ) : (
              <>
                Found {r.count} items.{" "}
                {r.count > 0 && (
                  <a
                    href={makeDownloadLink(r)}
                    download={`${r.label.replace(/\s+/g, "_")}.txt`}
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
