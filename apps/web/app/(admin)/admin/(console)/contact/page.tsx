import type { Metadata } from "next";
import { ContactSettingsScreen } from "@/components/admin/settings/contact-settings-screen";

export const metadata: Metadata = { title: "Thông tin liên hệ" };

export default function AdminContactRoute() {
  return <ContactSettingsScreen />;
}
