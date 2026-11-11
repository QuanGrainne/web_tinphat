import { adminFetch } from "@/lib/admin/api-client";
import type {
  AdminSettings,
  BankInfo,
  BankSettingsUpdate,
  ContactSettings,
} from "@/lib/api/types";

export const settingsKeys = {
  admin: () => ["admin", "settings"] as const,
  contact: () => ["admin", "settings", "contact"] as const,
};

export const fetchAdminSettings = () =>
  adminFetch<AdminSettings>("/api/admin/settings");

/** MANAGER only; a wrong `currentPassword` comes back as 403 with a Vietnamese `detail`. */
export const updateBankSettings = (body: BankSettingsUpdate) =>
  adminFetch<BankInfo>("/api/admin/settings/bank", { method: "PUT", body });

/** Hotline, Zalo, Facebook, email and address shown on the storefront. MANAGER only. */
export const fetchContactSettings = () =>
  adminFetch<ContactSettings>("/api/admin/settings/contact");

export const updateContactSettings = (body: ContactSettings) =>
  adminFetch<ContactSettings>("/api/admin/settings/contact", {
    method: "PUT",
    body,
  });
