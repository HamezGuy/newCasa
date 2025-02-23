"use client";

import React from "react";
import Image from "next/image"; // only if you have a logo or an icon

export default function SiteFooter() {
  return (
    <footer className="bg-blue-600 text-white border-t border-blue-700 py-8">
      <div className="container mx-auto px-4">
        {/* 
          On small devices => 1 column
          On larger devices => columns with widths: 1fr / 2fr / 3fr 
        */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_3fr] gap-6 text-sm">
          {/* COLUMN 1 (smallest) */}
          <div>
            <h3 className="font-bold text-base mb-2">Timothy Flores</h3>
            <p className="leading-tight">LPT Realty</p>
          </div>

          {/* COLUMN 2 (wider) */}
          <div>
            <h3 className="font-bold text-base mb-1">Mail</h3>
            <p className="mb-3">tim.flores@flores.realty</p>

            <h3 className="font-bold text-base mb-1">Call</h3>
            <p className="mb-3">608.579.3033</p>

            <h3 className="font-bold text-base mb-1">Business</h3>
            <p className="mb-3">877.366.2213</p>
          </div>

          {/* COLUMN 3 (widest) */}
          <div>
            <p className="mb-2 underline hover:text-gray-100 cursor-pointer">
              Commitment to Accessibility
            </p>
            <p className="leading-tight">Made by James Gui</p>
            {/* If you want a logo or any other item, you can add it here */}
            {/* <div className="mt-4">
              <Image 
                src="/img/footer-logo.png" 
                alt="Company Logo" 
                width={120} 
                height={40} 
              />
            </div> */}
          </div>
        </div>
      </div>
    </footer>
  );
}
