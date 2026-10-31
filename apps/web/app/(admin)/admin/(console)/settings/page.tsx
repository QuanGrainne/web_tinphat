import type { Metadata } from "next";
import { SettingsScreen } from "@/components/admin/settings/settings-screen";

export const metadata: Metadata = { title: "Cài đặt" };

export default function SettingsPage() {
  return <SettingsScreen />;
}
