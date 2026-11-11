"use client";

import { useState, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button, Dropdown, Result, Spin } from "antd";
import {
  GlobalOutlined,
  KeyOutlined,
  LogoutOutlined,
  MailOutlined,
  UserOutlined,
} from "@ant-design/icons";
import { useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin/api-client";
import { useSession } from "@/lib/admin/use-session";
import type { Role } from "@/lib/api/types";
import styles from "./admin-shell.module.css";
import { ChangePasswordDialog } from "./change-password-dialog";
import { RecoveryEmailDialog } from "./recovery-email-dialog";

const ROLE_LABEL: Record<Role, string> = {
  MANAGER: "Quản lý",
  EDITOR: "Biên tập",
};

const MENU = [
  { href: "/admin/products", label: "Sản phẩm" },
  { href: "/admin/categories", label: "Danh mục" },
];

function cls(...names: (string | false)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Authenticated admin area: utility bar, blue menu bar and the session guard around every console page. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { session, isPending, error, unauthenticated, refetch } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);
  const [changingPassword, setChangingPassword] = useState(false);
  const [editingEmail, setEditingEmail] = useState(false);

  async function logout() {
    setLoggingOut(true);
    try {
      await adminApi.logout();
    } catch {
      // The cookie may already be gone; the login page is the right place either way.
    }
    queryClient.clear();
    // Full navigation on purpose: drops every cached query and in-memory admin state.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.assign("/admin/login");
  }

  if (isPending || unauthenticated) {
    return (
      <div className={styles.center}>
        <Spin size="large" />
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className={styles.center}>
        <Result
          status="warning"
          title="Không tải được phiên đăng nhập"
          subTitle={error?.message ?? "Vui lòng thử lại."}
          extra={
            <Button type="primary" onClick={() => void refetch()}>
              Thử lại
            </Button>
          }
        />
      </div>
    );
  }

  return (
    <div className={styles.shell}>
      <header>
        <div className={styles.ubar}>
          <div className={styles.ubarInner}>
            <Link href="/admin/products" className={styles.brand}>
              <Image
                className={styles.brandMark}
                src="/images/tinphat/logo-mark.png"
                alt=""
                width={32}
                height={32}
                priority
              />
              <b>TÍN PHÁT</b>
              <span>Quản trị catalogue</span>
            </Link>
            <div className={styles.uright}>
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                  items: [
                    {
                      key: "who",
                      label: `${session.displayName} (${ROLE_LABEL[session.role]})`,
                      disabled: true,
                    },
                    { type: "divider" },
                    {
                      key: "password",
                      icon: <KeyOutlined />,
                      label: "Đổi mật khẩu",
                    },
                    {
                      key: "recovery",
                      icon: <MailOutlined />,
                      label: "Email lấy lại mật khẩu",
                    },
                    {
                      key: "logout",
                      icon: <LogoutOutlined />,
                      label: "Đăng xuất",
                      disabled: loggingOut,
                    },
                  ],
                  onClick: ({ key }) => {
                    if (key === "password") setChangingPassword(true);
                    if (key === "recovery") setEditingEmail(true);
                    if (key === "logout") void logout();
                  },
                }}
              >
                <button
                  type="button"
                  className={styles.user}
                  aria-label="Tài khoản"
                >
                  <span className={styles.avatar}>
                    <UserOutlined />
                  </span>
                  <span className={styles.userText}>
                    <span>{session.displayName}</span>
                    <span className={styles.userRole}>
                      {ROLE_LABEL[session.role]}
                    </span>
                  </span>
                </button>
              </Dropdown>
            </div>
          </div>
        </div>
        <div className={styles.mbar}>
          <div className={styles.mbarInner}>
            <nav className={styles.nav} aria-label="Menu chính">
              {MENU.map((item) => {
                const on =
                  pathname === item.href ||
                  pathname.startsWith(`${item.href}/`);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={cls(styles.navItem, on && styles.navItemOn)}
                    aria-current={on ? "page" : undefined}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
            <a className={styles.go} href="/" target="_blank" rel="noopener">
              <GlobalOutlined />
              Xem website
            </a>
          </div>
        </div>
      </header>
      <main className={styles.page}>{children}</main>
      {changingPassword && (
        <ChangePasswordDialog onClose={() => setChangingPassword(false)} />
      )}
      {editingEmail && (
        <RecoveryEmailDialog onClose={() => setEditingEmail(false)} />
      )}
    </div>
  );
}
