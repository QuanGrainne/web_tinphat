"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Badge, Button, Dropdown, Result, Spin } from "antd";
import { BellOutlined, DownOutlined, GlobalOutlined, LogoutOutlined, UserOutlined } from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { adminApi } from "@/lib/admin/api-client";
import { catalogueApi } from "@/lib/admin/catalogue-api";
import { catalogueKeys } from "@/lib/admin/catalogue-queries";
import { useSession } from "@/lib/admin/use-session";
import type { Role } from "@/lib/api/types";
import styles from "./admin-shell.module.css";

const ROLE_LABEL: Record<Role, string> = { MANAGER: "Quản lý", EDITOR: "Biên tập" };

const PRODUCT_MENU = [
  { href: "/admin/products", label: "Danh sách" },
  { href: "/admin/categories", label: "Nhóm hàng" },
  { href: "/admin/brands", label: "Thương hiệu" },
];

function isProductArea(pathname: string): boolean {
  return PRODUCT_MENU.some((item) => pathname === item.href || pathname.startsWith(`${item.href}/`));
}

function cls(...names: (string | false)[]): string {
  return names.filter(Boolean).join(" ");
}

/** Authenticated admin area: utility bar, blue menu bar and the session guard around every console page. */
export function AdminShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { session, isPending, error, unauthenticated, refetch } = useSession();
  const [loggingOut, setLoggingOut] = useState(false);

  const counters = useQuery({
    queryKey: catalogueKeys.counters,
    queryFn: () => catalogueApi.getRequestCounters(),
    enabled: session !== undefined,
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const bellCount = counters.data ? counters.data.newQuotes + counters.data.pendingOrders + counters.data.bankReview : 0;

  async function logout() {
    setLoggingOut(true);
    try {
      await adminApi.logout();
    } catch {
      // The cookie may already be gone; the login page is the right place either way.
    }
    queryClient.clear();
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
          extra={<Button type="primary" onClick={() => void refetch()}>Thử lại</Button>}
        />
      </div>
    );
  }

  const productsOn = isProductArea(pathname);
  const requestsOn = pathname.startsWith("/admin/requests");
  const settingsOn = pathname.startsWith("/admin/settings");

  return (
    <div className={styles.shell}>
      <header>
        <div className={styles.ubar}>
          <div className={styles.ubarInner}>
            <Link href="/admin/products" className={styles.brand}>
              <b>DNA</b>
              <span>Quản trị website Hoàng Nguyên</span>
            </Link>
            <div className={styles.uright}>
              <Link href="/admin/requests" className={styles.bell} aria-label={`Báo giá và đơn hàng cần xử lý: ${bellCount}`}>
                <Badge count={bellCount} overflowCount={99} size="small" offset={[2, -2]}>
                  <BellOutlined style={{ fontSize: 18, color: "inherit" }} />
                </Badge>
              </Link>
              <Dropdown
                trigger={["click"]}
                placement="bottomRight"
                menu={{
                  items: [
                    { key: "who", label: `${session.displayName} (${ROLE_LABEL[session.role]})`, disabled: true },
                    { type: "divider" },
                    { key: "logout", icon: <LogoutOutlined />, label: "Đăng xuất", disabled: loggingOut },
                  ],
                  onClick: ({ key }) => {
                    if (key === "logout") void logout();
                  },
                }}
              >
                <button type="button" className={styles.user} aria-label="Tài khoản">
                  <span className={styles.avatar}>
                    <UserOutlined />
                  </span>
                  <span className={styles.userText}>
                    <span>{session.displayName}</span>
                    <span className={styles.userRole}>{ROLE_LABEL[session.role]}</span>
                  </span>
                </button>
              </Dropdown>
            </div>
          </div>
        </div>
        <div className={styles.mbar}>
          <div className={styles.mbarInner}>
            <nav className={styles.nav} aria-label="Menu chính">
              <Dropdown
                trigger={["hover"]}
                menu={{
                  items: PRODUCT_MENU.map((item) => ({
                    key: item.href,
                    label: <Link href={item.href}>{item.label}</Link>,
                  })),
                  selectedKeys: PRODUCT_MENU.filter((item) => pathname === item.href).map((item) => item.href),
                }}
              >
                <Link
                  href="/admin/products"
                  className={cls(styles.navItem, productsOn && styles.navItemOn)}
                  aria-current={productsOn ? "page" : undefined}
                >
                  Hàng hóa
                  <DownOutlined style={{ fontSize: 10 }} />
                </Link>
              </Dropdown>
              <Link
                href="/admin/requests"
                className={cls(styles.navItem, requestsOn && styles.navItemOn)}
                aria-current={requestsOn ? "page" : undefined}
              >
                Báo giá &amp; đơn hàng
              </Link>
              <Link
                href="/admin/settings"
                className={cls(styles.navItem, settingsOn && styles.navItemOn)}
                aria-current={settingsOn ? "page" : undefined}
              >
                Cài đặt
              </Link>
            </nav>
            <a className={styles.go} href="/" target="_blank" rel="noopener">
              <GlobalOutlined />
              Xem website
            </a>
          </div>
        </div>
      </header>
      <main className={styles.page}>{children}</main>
    </div>
  );
}
