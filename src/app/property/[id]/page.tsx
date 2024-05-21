import PropertyDetails from '@/components/property/PropertyDetails';
import { PropertyImages } from '@/components/property/PropertyImages';
import { getPropertiesV2, getPropertyById, getPropertyByIdV2 } from '@/lib/data';
import { ParagonPropertyWithMedia } from '@/types/IParagonMedia';

const dynamicParams = false;

// Statically generate routes
export async function generateStaticParams() {
  const listings = await getPropertiesV2();

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
    response = await getPropertyByIdV2(id);
  } catch (e) {
    console.log(`Could not fetch property`, e);
    return <div>Not found</div>;
  }

  // TODO: Redirect to listings
  if (!id) {
    return <span>Redirect to all listings page...</span>;
  }

  return (
    <main>
      <PropertyImages property={response} />
      <div className="container mx-auto max-w-5xl">
        <PropertyDetails property={response} />
      </div>
    </main>
  );
}
