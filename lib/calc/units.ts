/**
 * Everything is stored in metric. Imperial exists only at the edges of the UI,
 * so conversion lives here rather than being scattered through components.
 */

export const KG_PER_LB = 0.45359237;
export const CM_PER_INCH = 2.54;

export const lbToKg = (lb: number) => lb * KG_PER_LB;
export const kgToLb = (kg: number) => kg / KG_PER_LB;

export const inchesToCm = (inches: number) => inches * CM_PER_INCH;
export const cmToInches = (cm: number) => cm / CM_PER_INCH;

export function feetInchesToCm(feet: number, inches: number) {
  return inchesToCm(feet * 12 + inches);
}

export function cmToFeetInches(cm: number) {
  const totalInches = Math.round(cmToInches(cm));
  return { feet: Math.floor(totalInches / 12), inches: totalInches % 12 };
}

/** Display helpers — round to something a human would actually say out loud. */
export function formatWeight(kg: number, units: "metric" | "imperial") {
  return units === "metric"
    ? `${Math.round(kg * 10) / 10} kg`
    : `${Math.round(kgToLb(kg))} lb`;
}

export function formatHeight(cm: number, units: "metric" | "imperial") {
  if (units === "metric") return `${Math.round(cm)} cm`;
  const { feet, inches } = cmToFeetInches(cm);
  return `${feet}'${inches}"`;
}
