import Image from "next/image";
import Link from "next/link";

export default function Logo({ link }: { link?: string }) {
  const logo = "/img/logo-realtor-small.png"; // Logo path

  return link ? (
    <Link href={link}>
      <Image src={logo} alt="Company Logo" width={160} height={80} priority />
    </Link>
  ) : (
    <Image src={logo} alt="Company Logo" width={160} height={80} priority />
  );
}
