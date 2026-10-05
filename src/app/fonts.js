// Shared font definitions for the root layouts (storefront and admin).
// Latin: Manrope (UI) + Cormorant Garamond (display).
// Urdu: Noto Nastaliq Urdu. Hindi: Noto Sans Devanagari.
// Browsers only download a face when a page actually uses its glyphs.
import { Cormorant_Garamond, Manrope, Noto_Nastaliq_Urdu, Noto_Sans_Devanagari } from "next/font/google";

export const manrope = Manrope({ variable: "--font-manrope", subsets: ["latin"], display: "swap" });

export const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  style: ["normal", "italic"],
  display: "swap",
});

export const nastaliq = Noto_Nastaliq_Urdu({
  variable: "--font-nastaliq",
  subsets: ["arabic"],
  weight: ["400", "600"],
  display: "swap",
  preload: false,
});

export const devanagari = Noto_Sans_Devanagari({
  variable: "--font-devanagari",
  subsets: ["devanagari"],
  weight: ["400", "500", "600"],
  display: "swap",
  preload: false,
});

export const fontVariables = [manrope.variable, cormorant.variable, nastaliq.variable, devanagari.variable].join(" ");
