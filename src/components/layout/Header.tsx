"use client";

import { onAuthStateChanged, signOut } from "firebase/auth";
import Link from "next/link";
import { useEffect, useState } from "react";
import { auth } from "../../lib/firebase";
import Logo from "../core/Logo";
import { usePathname } from "next/navigation";

export default function Header() {
  const [user, setUser] = useState<any>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname(); // Get current route

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

  // A small helper to see if a given link is the active route
  function isActiveRoute(route: string) {
    return pathname === route;
  }

  // A base set of nav items. You can expand as needed.
  const navItems = [
    { label: "Search", href: "/search" },
    { label: "Listings", href: "/listings" },
    { label: "About", href: "/about" },
  ];

  return (
    <>
      <header
        className="
          relative
          flex
          items-center
          justify-between
          h-14              /* Slightly taller: 56px */
          px-4 md:px-8      /* Horizontal padding */
          bg-black/90       /* Dark, opaque background */
          text-gray-100
          shadow
          z-50
          animate-fade-down
          box-border
        "
        style={{
          // Subtle base text shadow for everything
          textShadow: "0 0 2px rgba(0,255,0,0.2)", 
        }}
      >
        {/* LOGO */}
        <div className="logo-brand flex-shrink-0 h-full flex items-center">
          <Logo link="/" />
        </div>

        {/* MOBILE HAMBURGER BUTTON */}
        <button
          className="
            md:hidden
            flex items-center justify-center
            w-9 h-9
            bg-gray-700 text-white rounded
            transition-colors
            hover:bg-gray-800
            focus:outline-none
          "
          onClick={toggleMobileMenu}
          aria-label="Toggle Menu"
        >
          <span
            className={`
              block w-5 h-0.5 bg-white mb-1 transform transition-transform
              ${mobileOpen ? "rotate-45 translate-y-1.5" : ""}
            `}
          />
          <span
            className={`
              block w-5 h-0.5 bg-white mb-1 transition-opacity
              ${mobileOpen ? "opacity-0" : "opacity-100"}
            `}
          />
          <span
            className={`
              block w-5 h-0.5 bg-white transform transition-transform
              ${mobileOpen ? "-rotate-45 -translate-y-1.5" : ""}
            `}
          />
        </button>

        {/* DESKTOP NAV */}
        <nav className="hidden md:block">
          <ul className="flex gap-5 list-none m-0 p-0 items-center">
            {/* Dynamically render nav items */}
            {navItems.map(({ label, href }) => {
              const active = isActiveRoute(href);
              return (
                <li key={href}>
                  <Link
                    href={href}
                    className={`
                      relative
                      text-xl font-medium
                      transition-all duration-300
                      px-2
                      ${
                        active
                          ? // Active route gets a brighter neon glow
                            "text-lime-300 neon-active"
                          : "text-lime-200 hover:text-lime-300"
                      }
                      hover:scale-105 active:scale-95
                      hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                      focus:outline-none
                    `}
                    style={
                      active
                        ? {
                            // Slightly stronger text shadow for the active link
                            textShadow: "0 0 4px rgba(0,255,0,0.8)",
                          }
                        : {
                            textShadow: "0 0 2px rgba(0,255,0,0.3)",
                          }
                    }
                  >
                    {label}
                  </Link>
                </li>
              );
            })}

            {/* Auth-related items */}
            {!user ? (
              <li>
                <Link
                  href="/login"
                  className="
                    relative
                    text-xl font-medium
                    text-lime-200
                    px-2
                    hover:text-lime-300
                    hover:scale-105 active:scale-95
                    hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                    transition-all duration-300
                  "
                  style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
                >
                  Login
                </Link>
              </li>
            ) : (
              <>
                <li>
                  <Link
                    href="/messages"
                    className="
                      relative
                      text-xl font-medium
                      text-lime-200
                      px-2
                      hover:text-lime-300
                      hover:scale-105 active:scale-95
                      hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                      transition-all duration-300
                    "
                    style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
                  >
                    Messages
                  </Link>
                </li>
                <li>
                  <Link
                    href="/profile"
                    className="
                      relative
                      text-xl font-medium
                      text-lime-200
                      px-2
                      hover:text-lime-300
                      hover:scale-105 active:scale-95
                      hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                      transition-all duration-300
                    "
                    style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
                  >
                    Profile
                  </Link>
                </li>
                <li>
                  <button
                    onClick={handleLogout}
                    className="
                      relative
                      text-xl font-medium
                      text-lime-200
                      px-2
                      hover:text-lime-300
                      hover:scale-105 active:scale-95
                      hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                      transition-all duration-300
                      focus:outline-none
                    "
                    style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
                  >
                    Logout
                  </button>
                </li>
              </>
            )}
          </ul>
        </nav>

        {/* MOBILE DROPDOWN */}
        {mobileOpen && (
          <div
            className="
              absolute top-full right-0
              w-48
              bg-black/90
              shadow-md border border-gray-700
              md:hidden
              animate-slide-down
              box-border
              p-3
            "
          >
            <ul className="flex flex-col gap-2 m-0 text-base font-normal text-lime-200">
              {/* Mobile nav items */}
              {navItems.map(({ label, href }) => {
                const active = isActiveRoute(href);
                return (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setMobileOpen(false)}
                      className={`
                        block
                        relative
                        text-lg
                        transition-all duration-300
                        px-2 py-1
                        ${
                          active
                            ? "text-lime-300"
                            : "hover:text-lime-300"
                        }
                        hover:scale-105 active:scale-95
                        hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                        focus:outline-none
                      `}
                      style={
                        active
                          ? {
                              textShadow: "0 0 4px rgba(0,255,0,0.8)",
                            }
                          : {
                              textShadow: "0 0 2px rgba(0,255,0,0.3)",
                            }
                      }
                    >
                      {label}
                    </Link>
                  </li>
                );
              })}

              {/* Mobile Auth items */}
              {!user ? (
                <li>
                  <Link
                    href="/login"
                    onClick={() => setMobileOpen(false)}
                    className="
                      block
                      relative
                      text-lg
                      text-lime-200
                      px-2 py-1
                      hover:text-lime-300
                      hover:scale-105 active:scale-95
                      hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                      transition-all duration-300
                    "
                    style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
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
                      className="
                        block
                        relative
                        text-lg
                        text-lime-200
                        px-2 py-1
                        hover:text-lime-300
                        hover:scale-105 active:scale-95
                        hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                        transition-all duration-300
                      "
                      style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
                    >
                      Messages
                    </Link>
                  </li>
                  <li>
                    <Link
                      href="/profile"
                      onClick={() => setMobileOpen(false)}
                      className="
                        block
                        relative
                        text-lg
                        text-lime-200
                        px-2 py-1
                        hover:text-lime-300
                        hover:scale-105 active:scale-95
                        hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                        transition-all duration-300
                      "
                      style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
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
                      className="
                        block
                        relative
                        text-lg
                        text-lime-200
                        px-2 py-1
                        hover:text-lime-300
                        hover:scale-105 active:scale-95
                        hover:shadow-[0_0_8px_rgba(0,255,0,0.7)]
                        transition-all duration-300
                        focus:outline-none
                      "
                      style={{ textShadow: "0 0 2px rgba(0,255,0,0.3)" }}
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

      {/* Animations via styled JSX (if not using Tailwind @layer) */}
      <style jsx>{`
        @keyframes fade-down {
          0% {
            opacity: 0;
            transform: translateY(-10px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-down {
          animation: fade-down 0.4s ease-out forwards;
        }
        @keyframes slide-down {
          0% {
            opacity: 0;
            transform: translateY(-5px);
          }
          100% {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slide-down {
          animation: slide-down 0.3s ease-out forwards;
        }
      `}</style>
    </>
  );
}
