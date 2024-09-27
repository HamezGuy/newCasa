import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";
import PropertyPageClient from "@/components/property/PropertyPageClient";
import { getProperties, getPropertyById } from "@/lib/data";
import { isProduction } from "@/lib/utils/config";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";

// Statically generate routes to listings
export async function generateStaticParams() {
  if (!isProduction) {
    return [];
  }

  const listings = await getProperties();

  console.log(`Generating ${listings.length} property pages...`);

  return listings.map((listing: ParagonPropertyWithMedia) => ({
    id: listing.ListingId,
  }));
}

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  let response: ParagonPropertyWithMedia;

  try {
    response = await getPropertyById(id);
  } catch (e) {
    console.log(`Could not fetch property`, e);
    return <div>Not found</div>;
  }

  // TODO: Redirect to listings if no ID
  if (!id) {
    return <span>Redirect to all listings page...</span>;
  }

  return (
    <main>
      <PropertyImages property={response} />
      <div className="container mx-auto max-w-5xl">
        <PropertyDetails property={response} />
      </div>
      <div className="mt-8 border-t pt-6">
        {/* Load the client-side component for handling user role and messages */}
        <PropertyPageClient property={response} />
      </div>
    </main>
  );
}
