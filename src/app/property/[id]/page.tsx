import propertiesJson from "@/../data/properties.json";
import PropertyDetails from "@/components/property/PropertyDetails";
import { PropertyImages } from "@/components/property/PropertyImages";

//TODO: temporary. Replace with an env var?
const baseApiUrl = "http://localhost:3000";
const useLocalProperties = true; // TODO: remove

interface IPropertyResponse {
  "@odata.context": string;
  "@odata.count": number;
  value: [];
}

// Statically generate routes

export async function generateStaticParams() {
  if (useLocalProperties) {
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
  let response: Response | void = new Response();

  // TODO: Redirect to listings
  if (!id) {
    return <span>Redirect to all listings page...</span>;
  }

  if (!useLocalProperties) {
    try {
      response = await fetch(`${baseApiUrl}/api/v1/listings?id=${id}`);
    } catch (e) {
      console.log(`Could not fetch property`, e);
    }

    if (response.status >= 400 && response.status < 500) {
      return <div>Not found</div>;
    }
  }

  // console.log(response);
  const property = useLocalProperties
    ? propertiesJson.value[1]
    : await response.json();

  return (
    <main>
      <PropertyImages property={property} />
      <div className="container mx-auto max-w-5xl">
        <PropertyDetails property={property} />
      </div>
    </main>
  );
}
