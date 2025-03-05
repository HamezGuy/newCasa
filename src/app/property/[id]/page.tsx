// app/property/[id]/page.tsx
// (No "use client" directive here)

import { getPropertyById } from "@/lib/data";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";
import PropertyClient from "./PropertyClient";

// Use dynamic rendering instead of static generation
export const dynamic = 'force-dynamic';

// Remove the generateStaticParams function and revalidate

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  if (!id) {
    return <span>Redirect to all listings page...</span>;
  }

  let response: ParagonPropertyWithMedia;
  try {
    response = await getPropertyById(id);
  } catch (e) {
    console.log(`Could not fetch property`, e);
    return <div>Not found</div>;
  }

  return <PropertyClient property={response} />;
}