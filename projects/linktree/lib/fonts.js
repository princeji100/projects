import {
  Inter,
  Outfit,
  Poppins,
  Space_Grotesk,
  Playfair_Display,
  DM_Sans,
  Manrope,
  Montserrat,
  Lora,
  Plus_Jakarta_Sans,
} from 'next/font/google';

// 1. Static font instantiations with explicit subsets and swap display
const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-inter',
});

const outfit = Outfit({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-outfit',
});

const poppins = Poppins({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-poppins',
});

const spaceGrotesk = Space_Grotesk({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-space-grotesk',
});

const playfair = Playfair_Display({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-playfair',
});

const dmSans = DM_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-dm-sans',
});

const manrope = Manrope({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-manrope',
});

const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-montserrat',
});

const lora = Lora({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-lora',
});

const plusJakartaSans = Plus_Jakarta_Sans({
  subsets: ['latin'],
  display: 'swap',
  variable: '--font-plus-jakarta-sans',
});

/**
 * Curated typography registry containing 10+ Google Fonts + default legacy fallback.
 */
export const fonts = [
  {
    id: 'default',
    name: 'Modern Sans (Default)',
    description: 'Crisp, contemporary neutral aesthetic',
    className: '',
    variable: '',
    fontFamily: 'inherit',
    category: 'sans-serif',
  },
  {
    id: 'inter',
    name: 'Inter',
    description: 'Clean, highly legible geometric workhorse',
    className: inter.className,
    variable: inter.variable,
    fontFamily: inter.style.fontFamily,
    category: 'sans-serif',
  },
  {
    id: 'outfit',
    name: 'Outfit',
    description: 'Warm, modern geometric sans with premium feel',
    className: outfit.className,
    variable: outfit.variable,
    fontFamily: outfit.style.fontFamily,
    category: 'sans-serif',
  },
  {
    id: 'poppins',
    name: 'Poppins',
    description: 'Friendly, geometric rounded sans-serif',
    className: poppins.className,
    variable: poppins.variable,
    fontFamily: poppins.style.fontFamily,
    category: 'sans-serif',
  },
  {
    id: 'space-grotesk',
    name: 'Space Grotesk',
    description: 'Tech-forward, eccentric display typography',
    className: spaceGrotesk.className,
    variable: spaceGrotesk.variable,
    fontFamily: spaceGrotesk.style.fontFamily,
    category: 'display',
  },
  {
    id: 'playfair',
    name: 'Playfair Display',
    description: 'High-fashion, elegant editorial serif',
    className: playfair.className,
    variable: playfair.variable,
    fontFamily: playfair.style.fontFamily,
    category: 'serif',
  },
  {
    id: 'dm-sans',
    name: 'DM Sans',
    description: 'Precise, low-contrast modern geometric sans',
    className: dmSans.className,
    variable: dmSans.variable,
    fontFamily: dmSans.style.fontFamily,
    category: 'sans-serif',
  },
  {
    id: 'manrope',
    name: 'Manrope',
    description: 'Modern crossover sans-serif with semi-rounded corners',
    className: manrope.className,
    variable: manrope.variable,
    fontFamily: manrope.style.fontFamily,
    category: 'sans-serif',
  },
  {
    id: 'montserrat',
    name: 'Montserrat',
    description: 'Bold, architectural urban geometric style',
    className: montserrat.className,
    variable: montserrat.variable,
    fontFamily: montserrat.style.fontFamily,
    category: 'sans-serif',
  },
  {
    id: 'lora',
    name: 'Lora',
    description: 'Contemporary serif with balanced calligraphy flow',
    className: lora.className,
    variable: lora.variable,
    fontFamily: lora.style.fontFamily,
    category: 'serif',
  },
  {
    id: 'plus-jakarta-sans',
    name: 'Plus Jakarta Sans',
    description: 'Refined, versatile modern Indonesian grotesque',
    className: plusJakartaSans.className,
    variable: plusJakartaSans.variable,
    fontFamily: plusJakartaSans.style.fontFamily,
    category: 'sans-serif',
  },
];

/**
 * Safely resolves a font by ID, falling back to legacy default on missing or invalid keys.
 *
 * @param {string | null | undefined} fontId
 * @returns {typeof fonts[0]}
 */
export function getFont(fontId) {
  if (!fontId || typeof fontId !== 'string') {
    return fonts[0];
  }
  const normalized = fontId.trim().toLowerCase();
  const match = fonts.find((f) => f.id === normalized);
  return match || fonts[0];
}
