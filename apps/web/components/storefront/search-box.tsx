"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useState, type FormEvent, type KeyboardEvent } from "react";
import type { Suggest } from "@/lib/api/types";

const MIN_CHARS = 2;
const DEBOUNCE_MS = 250;

type SuggestItem = Suggest["items"][number];

/** Header search with a product suggestion dropdown (same-origin /api/public/search/suggest). */
export function SearchBox() {
  const router = useRouter();
  const listId = useId();
  const [text, setText] = useState("");
  const [items, setItems] = useState<SuggestItem[]>([]);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const term = text.trim();
  const visible = open && term.length >= MIN_CHARS;

  useEffect(() => {
    if (term.length < MIN_CHARS) return;
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/public/search/suggest?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
          headers: { Accept: "application/json" },
        });
        if (!res.ok) throw new Error(`suggest ${res.status}`);
        const data = (await res.json()) as Suggest;
        setItems(data.items);
        setActive(-1);
        setOpen(true);
      } catch (error) {
        if ((error as Error).name === "AbortError") return;
        // Suggestions are optional: on failure the dropdown simply stays closed and Enter still searches.
        setItems([]);
        setOpen(false);
      }
    }, DEBOUNCE_MS);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [term]);

  function go(path: string) {
    setOpen(false);
    router.push(path);
  }

  function onSubmit(event: FormEvent) {
    event.preventDefault();
    if (visible && active >= 0 && items[active]) {
      go(`/san-pham/${items[active].slug}`);
      return;
    }
    if (term) go(`/tim-kiem?q=${encodeURIComponent(term)}`);
  }

  function onKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "ArrowDown" && visible && items.length > 0) {
      event.preventDefault();
      setActive((a) => (a + 1) % items.length);
    } else if (event.key === "ArrowUp" && visible && items.length > 0) {
      event.preventDefault();
      setActive((a) => (a <= 0 ? items.length - 1 : a - 1));
    }
  }

  return (
    <div
      className="srch-w"
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setOpen(false);
      }}
    >
      <form className="srch" role="search" action="/tim-kiem" method="get" onSubmit={onSubmit}>
        <label className="sr" htmlFor="site-q">
          Tìm sản phẩm
        </label>
        <input
          id="site-q"
          name="q"
          type="search"
          placeholder="Nhập tên sản phẩm hoặc mã hàng..."
          autoComplete="off"
          enterKeyHint="search"
          value={text}
          onChange={(event) => {
            setText(event.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={onKeyDown}
          role="combobox"
          aria-expanded={visible}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={visible && active >= 0 ? `${listId}-${active}` : undefined}
        />
        <button type="submit" aria-label="Tìm">
          <i className="i i-search" aria-hidden="true" />
        </button>
      </form>
      {visible && (
        <ul className="sug" id={listId} role="listbox" aria-label="Gợi ý sản phẩm">
          {items.length === 0 ? (
            <li className="none" role="presentation">
              Không có gợi ý. Nhấn Enter để tìm.
            </li>
          ) : (
            items.map((item, index) => (
              <li key={item.slug} role="presentation">
                <a
                  id={`${listId}-${index}`}
                  role="option"
                  aria-selected={index === active}
                  href={`/san-pham/${item.slug}`}
                  onClick={(event) => {
                    event.preventDefault();
                    go(`/san-pham/${item.slug}`);
                  }}
                >
                  <span>{item.name}</span>
                  {item.code && <small>{item.code}</small>}
                </a>
              </li>
            ))
          )}
        </ul>
      )}
    </div>
  );
}
