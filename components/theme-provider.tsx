"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import * as React from "react";

/**
 * Wraps next-themes so the app can toggle light/dark and persist the choice
 * (DIG-34/35). Uses the `class` strategy — next-themes toggles `.dark` on
 * <html>, which drives the CSS variables defined in globals.css.
 */
export function ThemeProvider({
  children,
  ...props
}: React.ComponentProps<typeof NextThemesProvider>) {
  return <NextThemesProvider {...props}>{children}</NextThemesProvider>;
}
