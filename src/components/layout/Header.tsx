"use client"; // Ensure this is a Client Component

import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase"; // Ensure this path is correct
import Logo from "../core/Logo";

export default function Header() {
  const [user, setUser] = useState<any>(null);

  // Track mobile dropdown state
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  function toggleMobileMenu() {
    setMobileOpen((prev) => !prev);
  }

  return (
    <header className="app-header flex justify-between items-center py-4 px-8 shadow bg-white relative z-50">
      {/* LOGO */}
      <div className="logo-brand min-w-[8rem]">
        <Logo link="/" />
      </div>

      {/* MOBILE HAMBURGER BUTTON */}
      <button
        className="md:hidden flex flex-col items-center justify-center w-9 h-9 text-white bg-blue-600 rounded transition-colors hover:bg-blue-700 focus:outline-none"
        onClick={toggleMobileMenu}
        aria-label="Toggle Menu"
      >
        {/* Animated hamburger => X transition */}
        <span
          className={`block w-6 h-0.5 bg-white mb-1 transform transition-transform ${
            mobileOpen ? "rotate-45 translate-y-1.5" : ""
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-white mb-1 transition-opacity ${
            mobileOpen ? "opacity-0" : "opacity-100"
          }`}
        />
        <span
          className={`block w-6 h-0.5 bg-white transform transition-transform ${
            mobileOpen ? "-rotate-45 -translate-y-1.5" : ""
          }`}
        />
      </button>

      {/* DESKTOP NAV => hidden on mobile */}
      <nav className="main-nav hidden md:block">
        <ul className="flex gap-8 list-none no-underline text-gray-800 font-semibold">
          <li className="hover:text-blue-600 transition-colors">
            <Link href="/search">Search</Link>
          </li>
          <li className="hover:text-blue-600 transition-colors">
            <Link href="/listings">Listings</Link>
          </li>
          <li className="hover:text-blue-600 transition-colors">
            <Link href="/about">About</Link>
          </li>
          {!user ? (
            <li className="hover:text-blue-600 transition-colors">
              <Link href="/login">Login</Link>
            </li>
          ) : (
            <>
              <li className="hover:text-blue-600 transition-colors">
                <Link href="/messages">Messages</Link>
              </li>
              <li className="hover:text-blue-600 transition-colors">
                <Link href="/profile">Profile</Link>
              </li>
              <li>
                <button
                  onClick={handleLogout}
                  className="text-blue-500 hover:text-blue-700 transition-colors"
                >
                  Logout
                </button>
              </li>
            </>
          )}
        </ul>
      </nav>

      {/* MOBILE DROPDOWN => only visible on small screens */}
      {mobileOpen && (
        <div
          // CHANGED => right-0 w-60; slightly transparent, blurred background, subtle border
          className="absolute top-full right-0 w-60 bg-white/80 backdrop-blur-sm shadow-md border border-gray-300/70 md:hidden animate-slide-down"
        >
          <ul className="flex flex-col gap-4 p-4 list-none no-underline text-gray-800 font-semibold">
            <li>
              <Link
                href="/search"
                onClick={() => setMobileOpen(false)}
                className="hover:text-blue-600 transition-colors"
              >
                Search
              </Link>
            </li>
            <li>
              <Link
                href="/listings"
                onClick={() => setMobileOpen(false)}
                className="hover:text-blue-600 transition-colors"
              >
                Listings
              </Link>
            </li>
            <li>
              <Link
                href="/about"
                onClick={() => setMobileOpen(false)}
                className="hover:text-blue-600 transition-colors"
              >
                About
              </Link>
            </li>
            {!user ? (
              <li>
                <Link
                  href="/login"
                  onClick={() => setMobileOpen(false)}
                  className="hover:text-blue-600 transition-colors"
                >
                  Login
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link
                    href="/messages"
                    onClick={() => setMobileOpen(false)}
                    className="hover:text-blue-600 transition-colors"
                  >
                    Messages
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    onClick={() => setMobileOpen(false)}
                    className="hover:text-blue-600 transition-colors"
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <button
                    onClick={() => {
                      handleLogout();
                      setMobileOpen(false);
                    }}
                    className="text-blue-500 hover:text-blue-700 transition-colors"
                  >
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </div>
      )}
    </header>
  );
}
