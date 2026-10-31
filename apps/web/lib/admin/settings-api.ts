import { adminFetch } from "@/lib/admin/api-client";
import type { AdminSettings, BankInfo, BankSettingsUpdate } from "@/lib/api/types";

export const settingsKeys = {
  admin: () => ["admin", "settings"] as const,
};

export const fetchAdminSettings = () => adminFetch<AdminSettings>("/api/admin/settings");

/** MANAGER only; a wrong `currentPassword` comes back as 403 with a Vietnamese `detail`. */
export const updateBankSettings = (body: BankSettingsUpdate) =>
  adminFetch<BankInfo>("/api/admin/settings/bank", { method: "PUT", body });
