"use client";

import { useState } from "react";
import { Badge, Input, Tabs } from "antd";
import { SearchOutlined } from "@ant-design/icons";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { fetchRequestCounters, fetchRequestList, requestKeys, type RequestFilters } from "@/lib/admin/requests-api";
import { BankTransactionsTab } from "./bank-transactions-tab";
import { RequestFilterColumn } from "./request-filter-column";
import { RequestTable, requestRowKey } from "./request-table";
import s from "./requests.module.css";
import { useAdminSession } from "./use-admin-role";
import { useDebouncedValue } from "./use-debounced-value";

export type RequestsTab = "requests" | "bank";

const REFRESH_MS = 60_000;

export function RequestsScreen({ initialFilters, initialTab }: { initialFilters: RequestFilters; initialTab: RequestsTab }) {
  const session = useAdminSession();
  const isManager = session.data?.role === "MANAGER";
  const [tab, setTab] = useState<RequestsTab>(initialTab);
  const activeTab: RequestsTab = isManager ? tab : "requests";

  const [filters, setFilters] = useState<RequestFilters>({ ...initialFilters, q: undefined });
  const [searchText, setSearchText] = useState(initialFilters.q ?? "");
  const q = useDebouncedValue(searchText.trim(), 350);
  const effective: RequestFilters = { ...filters, q: q || undefined };

  // The page number belongs to one filter combination; a new combination starts on page 1 without an effect.
  const filterKey = JSON.stringify(effective);
  const [pageState, setPageState] = useState({ key: filterKey, page: 1 });
  const page = pageState.key === filterKey ? pageState.page : 1;

  const [expanded, setExpanded] = useState<string | null>(null);

  const list = useQuery({
    queryKey: requestKeys.list(effective, page),
    queryFn: () => fetchRequestList(effective, page),
    refetchInterval: REFRESH_MS,
    placeholderData: keepPreviousData,
  });
  const counters = useQuery({
    queryKey: requestKeys.counters(),
    queryFn: fetchRequestCounters,
    refetchInterval: REFRESH_MS,
    enabled: isManager,
  });

  const openKey = list.data?.items.some((row) => requestRowKey(row) === expanded) ? expanded : null;

  const tabItems = [
    { key: "requests", label: "Yêu cầu" },
    ...(isManager
      ? [
          {
            key: "bank",
            label: (
              <span>
                Giao dịch ngân hàng <Badge count={counters.data?.bankReview ?? 0} size="small" style={{ marginLeft: 4 }} />
              </span>
            ),
          },
        ]
      : []),
  ];

  return (
    <div className={s.page}>
      <div className={s.titleRow}>
        <h1 className={s.title}>Báo giá &amp; đơn hàng</h1>
        {activeTab === "requests" && (
          <Input
            className={s.search}
            allowClear
            prefix={<SearchOutlined />}
            placeholder="Theo mã, tên khách, số điện thoại"
            aria-label="Tìm yêu cầu"
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        )}
      </div>

      <Tabs activeKey={activeTab} onChange={(key) => setTab(key as RequestsTab)} items={tabItems} />

      {activeTab === "requests" ? (
        <div className={s.layout}>
          <RequestFilterColumn filters={filters} onChange={setFilters} />
          <section>
            <RequestTable
              list={list.data}
              loading={list.isPending || list.isPlaceholderData}
              error={list.error}
              onRetry={() => void list.refetch()}
              page={page}
              onPageChange={(next) => setPageState({ key: filterKey, page: next })}
              expandedKey={openKey}
              onExpandedChange={setExpanded}
            />
          </section>
        </div>
      ) : (
        <BankTransactionsTab />
      )}
    </div>
  );
}
