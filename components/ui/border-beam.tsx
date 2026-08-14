"use client";

/**
 * Animated RGB border beam, re-exported from the `border-beam` package.
 *
 * The package ships without a "use client" directive but renders with hooks
 * and reads `window`, so it has to cross the client boundary here — importing
 * it straight into a server component throws. Everything below is a plain
 * re-export: keep the prop surface as published so upstream docs still apply.
 *
 * Wrap a single opaque child; the beam auto-detects that child's border-radius
 * and paints around it. `active` toggles the animation with a fade, and the
 * package already honours `prefers-reduced-motion`.
 */

import { BorderBeam } from "border-beam";
import type {
  BorderBeamProps,
  BorderBeamSize,
  BorderBeamTheme,
  BorderBeamColorVariant,
} from "border-beam";

export type {
  BorderBeamProps,
  BorderBeamSize,
  BorderBeamTheme,
  BorderBeamColorVariant,
};

export { BorderBeam };
export default BorderBeam;
