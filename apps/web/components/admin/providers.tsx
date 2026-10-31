"use client";

import { useState, type ReactNode } from "react";
import { ConfigProvider, App as AntApp } from "antd";
import viVN from "antd/locale/vi_VN";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { adminTheme } from "@/lib/admin/theme";

export function AdminProviders({ children }: { children: ReactNode }) {
  const [client] = useState(
    () => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, refetchOnWindowFocus: false, retry: false } } }),
  );
  return (
    <ConfigProvider locale={viVN} theme={adminTheme}>
      <AntApp>
        <QueryClientProvider client={client}>{children}</QueryClientProvider>
      </AntApp>
    </ConfigProvider>
  );
}
