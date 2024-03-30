import Link from "next/link";
import Logo from "../core/Logo";

export default function Header() {
  return (
    <div className="flex justify-between items-center p-4 h-20">
      <div className="logo-brand min-w-[8rem]">
        <Logo link="/" />
      </div>
      <div className="main-nav">
        <ul className="flex gap-4">
          <li>
            <Link href="/listings">Listings</Link>
          </li>
          <li>
            <Link href="/about">About</Link>
          </li>
        </ul>
      </div>
    </div>
  );
}
