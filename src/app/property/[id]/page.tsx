//TODO: change for env var?
const baseApiUrl = "http://localhost:3000";

interface IPropertyResponse {
  "@odata.context": string;
  "@odata.count": number;
  value: [];
}

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

  if (!id) {
    return <span>Redirect to all listings page...</span>;
  }

  try {
    response = await fetch(`${baseApiUrl}/api/v1/listings?id=${id}`);
  } catch (e) {
    console.log("Could not fetch property", e);
  }

  if (response.status > 302) {
    return <div>Not found</div>;
  }
  // console.log(response);

  const property = await response.json();

  return <pre>Viewing property: {JSON.stringify(property, null, 2)}</pre>;
}
