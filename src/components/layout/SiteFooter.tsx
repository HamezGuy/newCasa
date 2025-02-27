"use client";

import React from "react";

export default function SiteFooter() {
  return (
    <footer className="bg-blue-600 text-white border-t border-blue-700 py-3">
      <div className="container mx-auto px-4">

        {/* 
          1 column on small screens, 
          then 3 columns: 1fr / 2fr / 1fr on larger screens 
        */}
        <div className="grid grid-cols-1 sm:grid-cols-[1fr_2fr_1fr] gap-3 items-stretch text-sm">

          {/* COLUMN 1 */}
          <div className="flex flex-col justify-start">
            <h3 className="font-bold text-base mb-1">Timothy Flores</h3>
            <p className="leading-tight">LPT Realty</p>
          </div>

          {/* COLUMN 2 */}
          <div className="flex flex-col justify-start">
            <h3 className="font-bold text-base mb-1">Mail</h3>
            <p className="mb-1">tim.flores@flores.realty</p>

            <h3 className="font-bold text-base mb-1">Call</h3>
            <p className="mb-1">608.579.3033</p>

            <h3 className="font-bold text-base mb-1">Business</h3>
            <p className="mb-1">877.366.2213</p>
          </div>

          {/* COLUMN 3 (bottom-right alignment) */}
          <div className="flex flex-col justify-end items-end text-right">
            <a 
              href="#" 
              className="underline hover:text-gray-100 cursor-pointer mb-1"
            >
              Commitment to Accessibility
            </a>
            <span>Made by James Gui</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
