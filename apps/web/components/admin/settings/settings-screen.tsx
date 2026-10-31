"use client";

import { Alert, Button, Skeleton } from "antd";
import { useQuery } from "@tanstack/react-query";
import { fetchAdminSettings, settingsKeys } from "@/lib/admin/settings-api";
import { errorMessage } from "@/components/admin/requests/error-message";
import { useAdminSession } from "@/components/admin/requests/use-admin-role";
import { BankSettingsCard } from "./bank-settings-card";
import { ReadonlySettingsCards } from "./readonly-settings-cards";
import s from "./settings.module.css";

export function SettingsScreen() {
  const session = useAdminSession();
  const settings = useQuery({ queryKey: settingsKeys.admin(), queryFn: fetchAdminSettings });

  return (
    <div className={s.page}>
      <h1 className={s.title}>Cài đặt</h1>
      <div className={s.stack}>
        {settings.isError && (
          <Alert
            type="error"
            showIcon
            title={errorMessage(settings.error)}
            action={<Button size="small" onClick={() => void settings.refetch()}>Thử lại</Button>}
          />
        )}
        {(settings.isPending || session.isPending) && !settings.isError && (
          <div className={s.card}>
            <Skeleton active paragraph={{ rows: 6 }} />
          </div>
        )}
        {settings.data && !session.isPending && (
          <>
            <BankSettingsCard bank={settings.data.bank} canEdit={session.data?.role === "MANAGER"} />
            <ReadonlySettingsCards settings={settings.data} />
          </>
        )}
      </div>
    </div>
  );
}
