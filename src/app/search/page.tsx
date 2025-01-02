import { Suspense } from "react";
import SearchClient from "./searchclient";

export default function SearchPage() {
  return (
    <Suspense fallback={<p>Loading Search...</p>}>
      <SearchClient />
    </Suspense>
  );
}
