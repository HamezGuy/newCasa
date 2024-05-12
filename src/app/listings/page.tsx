import PropertyList from "@/components/paragon/PropertyList";
import { getProperties } from "@/lib/data";
import Image from "next/image";

export default async function Listings() {
  const properties53715 = await getProperties("53715");
  const properties53703 = await getProperties("53703");

  return (
    <main>
      <CoverImage title="53715" subtitle="Madison, WI" />
      <PropertyList
        className="container mb-16"
        properties={properties53715.value}
      />
      <CoverImage title="53703" subtitle="Madison, WI" />
      <PropertyList
        className="container mb-16"
        properties={properties53703.value}
      />
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
        style={{ objectFit: "cover" }}
      />
    </div>
  );
}
