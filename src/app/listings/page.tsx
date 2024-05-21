import PropertyList from '@/components/paragon/PropertyList';
import Image from 'next/image';
import { getPropertiesByZipCode } from '@/lib/data';

export default async function Listings() {
  const propertiesByZipCode = await getPropertiesByZipCode();

  return (
    <main>
      {propertiesByZipCode.map(zipCodeObj => {
        return (
          <>
            <CoverImage title={zipCodeObj.zipCode.toString()} subtitle={zipCodeObj.zipCodeTitle} />
            <PropertyList
              className="container mb-16"
              properties={zipCodeObj.properties}
            />
          </>
        );
      })}
    </main>
  );
}


function CoverImage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div className="has-cover-img text-center p-16 text-white mb-8">
      <h2 className="text-4xl mb-3">{title}</h2>
      <span className="text-lg tracking-wider uppercase">{subtitle}</span>
      <Image
        src="/img/cover.jpg"
        alt="Cover"
        fill
        priority
        style={{ objectFit: 'cover' }}
      />
    </div>
  );
}
