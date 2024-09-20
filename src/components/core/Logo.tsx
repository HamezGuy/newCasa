import Image from "next/image";
import Link from "next/link";

// Removed the `getConfig()` since we can now use a default value or environment variable
export default function Logo({ link }: { link?: string }) {
  const brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "Realtor Brand"; // Replace with environment variable or fallback
  const logo = "/img/logo-realtor-small.png"; // Assuming this is the logo path

  if (link) {
    return (
      <Link href={link}>
        <Image
          src={logo}
          alt={brandName}
          width={160}
          height={80}
          priority
        />
      </Link>
    );
  }

  return (
    <Image
      src={logo}
      alt={brandName}
      width={160}
      height={80}
      priority
    />
  );
}
