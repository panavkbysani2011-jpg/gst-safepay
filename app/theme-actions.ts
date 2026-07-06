"use server";

import { db } from "@/lib/db";
import { requireUser } from "@/lib/auth";
import { normalizeTheme } from "@/lib/theme";

// Persist the account's colour theme so it follows the user across devices
// (localStorage only persists per browser). Invalid input no-ops before we even
// touch auth. Cosmetic, so no revalidate — the theme is applied client-side and
// this write only matters for future loads on other browsers.
export async function saveThemePreference(theme: string): Promise<void> {
  const t = normalizeTheme(theme);
  if (!t) return;

  const user = await requireUser();
  await db.userPreference.upsert({
    where: { ownerId: user.id },
    create: { ownerId: user.id, theme: t },
    update: { theme: t },
  });
}
