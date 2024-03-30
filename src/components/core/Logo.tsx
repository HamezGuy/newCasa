import getConfig from "next/config";
import Image from "next/image";
import Link from "next/link";

export default function Logo({ link }: { link?: string }) {
  const config = getConfig().publicRuntimeConfig;
  const logo = "/img/logo-realtor-small.png";

  if (link) {
    return (
      <Link href={link}>
        <Image
          src={logo}
          alt={config.realtor.brand}
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
      alt={config.realtor.brand}
      width={160}
      height={80}
      priority
    />
  );
}
