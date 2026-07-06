import { cache } from "react";
import { db } from "@/lib/db";
import { normalizeTheme, type Theme } from "@/lib/theme";

// The account's saved colour theme, or null if never set. Memoised per request.
export const getThemePreference = cache(
  async (ownerId: string): Promise<Theme | null> => {
    const row = await db.userPreference.findUnique({ where: { ownerId } });
    return normalizeTheme(row?.theme ?? null);
  }
);
