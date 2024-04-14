import FullPropertySummary from "@/components/paragon/FullPropertySummary";

//TODO: change for env var?
const baseApiUrl = "http://localhost:3000";

interface IPropertyResponse {
  "@odata.context": string;
  "@odata.count": number;
  value: [];
}

// Statically generate routes
export async function generateStaticParams() {
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

  try {
    response = await fetch(`${baseApiUrl}/api/v1/listings?id=${id}`);
  } catch (e) {
    console.log(`Could not fetch property`, e);
  }

  if (response.status >= 400 && response.status < 500) {
    return <div>Not found</div>;
  }

  // console.log(response);
  const property = await response.json();

  return (
    <div className="container mx-auto px-4 flex flex-row max-w-5xl">
      <div className="content-main">
        <FullPropertySummary property={property} />
      </div>
    </div>
  );
}
