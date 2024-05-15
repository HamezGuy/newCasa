import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";
import { IOdataResponse } from "@/lib/ParagonApiClient";
import { getPropertyById } from "@/lib/data";
import { ParagonPropertyWithMedia } from "@/types/IParagonMedia";

//TODO: temporary. Replace with an env var?
const baseApiUrl = "http://localhost:3000";
const generateSataticParams = false; // TODO: remove

// Statically generate routes
export async function generateStaticParams() {
  if (!generateSataticParams) {
    return [];
  }

  const listings = await fetch(`${baseApiUrl}/api/v1/listings/`).then(
    (response) => response.json()
  );

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
  // console.log(response.value[0]);
  // console.log("Media:");
  // console.log(response.value[0].Media);
  return (
    <main>
      <PropertyImages property={response.value[0]} />
      <div className="container mx-auto max-w-5xl">
        <PropertyDetails property={response.value[0]} />
      </div>
    </main>
  );
}
