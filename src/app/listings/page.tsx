import PropertyList from "@/components/paragon/PropertyList";

function CoverImage({ title, subtitle }: { title: string; subtitle: string }) {
  return (
    <div>
      <h2>{title}</h2>
      <span>{subtitle}</span>
    </div>
  );
}

export default function Listings() {
  return (
    <main>
      <CoverImage title="53715" subtitle="Madison, WI" />
      <PropertyList className="container" />
    </main>
  );
}
