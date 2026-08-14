/**
 * Test-only loader hook to resolve next/font/google in standalone Node.js environments
 */
export async function resolve(specifier, context, nextResolve) {
  if (specifier === 'next/font/google') {
    const mockCode = `
      const mockFont = (config) => ({
        className: '__className_' + (config?.variable || 'font').replace(/[^a-zA-Z0-9]/g, '_'),
        variable: config?.variable || '',
        style: { fontFamily: 'mock-font-family' }
      });
      export const Inter = mockFont;
      export const Outfit = mockFont;
      export const Poppins = mockFont;
      export const Space_Grotesk = mockFont;
      export const Playfair_Display = mockFont;
      export const DM_Sans = mockFont;
      export const Manrope = mockFont;
      export const Montserrat = mockFont;
      export const Lora = mockFont;
      export const Plus_Jakarta_Sans = mockFont;
    `;
    return {
      format: 'module',
      shortCircuit: true,
      url: `data:text/javascript,${encodeURIComponent(mockCode)}`,
    };
  }
  return nextResolve(specifier, context);
}
