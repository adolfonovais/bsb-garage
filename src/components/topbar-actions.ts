"use server";

import { signOut } from "@/lib/auth";

export async function sairAction() {
  await signOut({ redirectTo: "/login" });
}
