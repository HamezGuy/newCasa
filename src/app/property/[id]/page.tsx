import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";
import { IOdataResponse } from "@/lib/ParagonApiClient";
import { getPropertyById } from "@/lib/data";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";

const generateSataticParams = false; // TODO: remove

// Statically generate routes
export async function generateStaticParams() {
  if (!generateSataticParams) {
    return [];
  }

  //TODO: Use data/getProperties() or similar
  const listings = await fetch(
    `${process.env.BASE_API_URL}/api/v1/listings/`
  ).then((response) => response.json());

  return listings.map((listing: any) => ({
    slug: listing.ListingId,
  }));
}

export default async function PropertyPage({
  params,
}: {
  params: { id: string };
}) {
  const { id } = params;
  let response: IOdataResponse<ParagonPropertyWithMedia>;

  // TODO: Redirect to listings
  if (!id) {
    return <span>Redirect to all listings page...</span>;
  }

  try {
    response = await getPropertyById(id);
  } catch (e) {
    console.log(`Could not fetch property`, e);
    return <div>Not found</div>;
  }

  return (
    <main>
      <PropertyImages property={response.value[0]} />
      <div className="container mx-auto max-w-5xl">
        <PropertyDetails property={response.value[0]} />
      </div>
    </main>
  );
}
