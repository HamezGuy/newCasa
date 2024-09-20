"use client"; // Ensure this is a Client Component

import { onAuthStateChanged } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "../../config/firebase"; // Ensure this path is correct
import Logo from "../core/Logo";

export default function Header() {
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <div className="flex justify-between items-center py-4 px-8">
      <div className="logo-brand min-w-[8rem]">
        <Logo link="/" />
      </div>
      <div className="main-nav">
        <ul className="flex gap-4 list-none">
          <li>
            <Link href="/listings">Listings</Link>
          </li>
          <li>
            <Link href="/about">About</Link>
          </li>
          {!user ? (
            <li>
              <Link href="/login">Login</Link>
            </li>
          ) : (
            <>
              <li>
                <Link href="/messages">Messages</Link>
              </li>
              <li>
                <Link href="/profile">Profile</Link>
              </li>
            </>
          )}
        </ul>
      </div>
    </div>
  );
}
