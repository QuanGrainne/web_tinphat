#!/usr/bin/env bash
# Smoke test for the running DNA stack: one line per check, exit status 1 if any check fails.
#
#   scripts/smoke.sh
#
# Optional environment:
#   SMOKE_BASE_URL       stack entry point (default http://localhost:8000)
#   SMOKE_USER, SMOKE_PASSWORD
#                        admin login (default: bootstrap manager from deploy/.env)
#   SMOKE_ENV_FILE       env file to read (default deploy/.env)
#   SMOKE_WAIT_SECONDS   how long to wait for the stack to answer (default 240)
#   SMOKE_PRODUCT_SLUG   slug of the SV465 product (default: looked up through public search)
#
# Needs bash and curl only (Git Bash, WSL, Linux, macOS).

set -u

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BASE="${SMOKE_BASE_URL:-http://localhost:8000}"
BASE="${BASE%/}"
ENV_FILE="${SMOKE_ENV_FILE:-$ROOT/deploy/.env}"
WAIT_SECONDS="${SMOKE_WAIT_SECONDS:-240}"

TMP="$(mktemp -d)" || exit 1
trap 'rm -rf "$TMP"' EXIT
JAR="$TMP/cookies"
HEADERS="$TMP/headers"
BODY="$TMP/body"

STATUS=000
TOTAL=0
FAILED=0

# Value of KEY in the env file, without surrounding quotes or CR.
env_value() {
  [ -f "$ENV_FILE" ] || return 0
  grep -E "^$1=" "$ENV_FILE" | tail -n 1 | cut -d= -f2- | tr -d '\r' \
    | sed -e 's/^"\(.*\)"$/\1/' -e "s/^'\(.*\)'$/\1/"
}

# req METHOD PATH [curl options...]: sets STATUS and fills $HEADERS / $BODY.
req() {
  local method="$1" path="$2"
  shift 2
  : > "$HEADERS"
  : > "$BODY"
  STATUS="$(curl -sS -m 20 --noproxy 'localhost,127.0.0.1,::1' -X "$method" \
    -D "$HEADERS" -o "$BODY" -w '%{http_code}' "$@" "$BASE$path" 2>/dev/null)" || STATUS=000
}

# Value of a response header from the last request (case-insensitive name).
header() {
  grep -i "^$1:" "$HEADERS" | tail -n 1 | cut -d: -f2- | tr -d '\r' | sed 's/^[[:space:]]*//'
}

# Value of a cookie from the cookie jar.
cookie_value() {
  [ -f "$JAR" ] || return 0
  tr -d '\r' < "$JAR" | awk -F'\t' -v name="$1" '$6 == name { v = $7 } END { print v }'
}

body_has() { grep -Eq -- "$1" "$BODY"; }

pass() {
  TOTAL=$((TOTAL + 1))
  printf 'PASS  %s\n' "$1"
}

fail() {
  TOTAL=$((TOTAL + 1))
  FAILED=$((FAILED + 1))
  printf 'FAIL  %s -> %s\n' "$1" "$2"
}

stack_down() {
  case "$1" in 000 | 502 | 503 | 504) return 0 ;; *) return 1 ;; esac
}

# HTTP status of GET PATH, 000 when nothing answers (curl prints 000 itself on failure).
probe() {
  local code
  code="$(curl -s -m 5 --noproxy 'localhost,127.0.0.1,::1' -o /dev/null -w '%{http_code}' "$BASE$1" 2>/dev/null)" || true
  printf '%s' "${code:-000}"
}

# Slug of the SV465 product via public search, empty when it is not found.
find_sv465_slug() {
  local path slug
  for path in "/api/public/search/suggest?q=SV465" "/api/public/search?q=SV465"; do
    req GET "$path"
    [ "$STATUS" = 200 ] || continue
    for slug in $(grep -Eo '"slug"[[:space:]]*:[[:space:]]*"[^"]*"' "$BODY" | cut -d'"' -f4 | head -n 8); do
      req GET "/api/public/products/$slug"
      if [ "$STATUS" = 200 ] && body_has '"baseCode"[[:space:]]*:[[:space:]]*"SV465'; then
        printf '%s' "$slug"
        return 0
      fi
    done
  done
  return 0
}

# Numbers of the hidden SV465 prices (Thung 426.400d, Day 8 42.640d) in any common spelling.
# Neighbours must not be alphanumeric, so ids and chunk hashes do not match by accident.
LEAK_RE='(^|[^0-9A-Za-z.,])(426400|42640|426\.400|42\.640)([^0-9A-Za-z]|$)'

LOGIN_USER="${SMOKE_USER:-$(env_value DNA_BOOTSTRAP_MANAGER_USERNAME)}"
LOGIN_PASS="${SMOKE_PASSWORD:-$(env_value DNA_BOOTSTRAP_MANAGER_PASSWORD)}"
WEBHOOK_EXPECT=401
[ "$(env_value DNA_SEPAY_ENABLED)" = "false" ] && WEBHOOK_EXPECT=404

echo "Smoke test against $BASE"

# --- wait for the stack ------------------------------------------------------------------
deadline=$((SECONDS + WAIT_SECONDS))
while :; do
  home_status="$(probe /)"
  api_status="$(probe /api/public/settings)"
  if ! stack_down "$home_status" && ! stack_down "$api_status"; then
    break
  fi
  if [ "$SECONDS" -ge "$deadline" ]; then
    printf 'FAIL  stack not ready after %ss -> GET / %s, GET /api/public/settings %s\n' \
      "$WAIT_SECONDS" "$home_status" "$api_status"
    exit 1
  fi
  sleep 3
done

# --- storefront and public API ------------------------------------------------------------
req GET /
if [ "$STATUS" = 200 ] && header content-type | grep -qi 'text/html'; then
  pass "GET / 200 text/html"
else
  fail "GET / 200 text/html" "status $STATUS, content-type '$(header content-type)'"
fi

req GET /api/public/settings
if [ "$STATUS" = 200 ] && header content-type | grep -qi 'json' && body_has '"company"'; then
  pass "GET /api/public/settings 200 JSON"
else
  fail "GET /api/public/settings 200 JSON" "status $STATUS, content-type '$(header content-type)'"
fi

req GET /api/public/nav
if [ "$STATUS" = 200 ] && header content-type | grep -qi 'json' && body_has '"categories"'; then
  pass "GET /api/public/nav 200 JSON"
else
  fail "GET /api/public/nav 200 JSON" "status $STATUS, content-type '$(header content-type)'"
fi

req GET /robots.txt
if [ "$STATUS" = 200 ] && body_has '[Dd]isallow:[[:space:]]*/admin'; then
  pass "GET /robots.txt 200 and disallows /admin"
else
  fail "GET /robots.txt 200 and disallows /admin" "status $STATUS"
fi

req GET /sitemap.xml
if [ "$STATUS" = 200 ] && body_has '/san-pham/'; then
  pass "GET /sitemap.xml 200 and lists products"
else
  fail "GET /sitemap.xml 200 and lists products" "status $STATUS"
fi

# --- proxy rules -----------------------------------------------------------------------------
req GET /actuator/health
if [ "$STATUS" = 404 ]; then
  pass "GET /actuator/health not exposed (404)"
else
  fail "GET /actuator/health not exposed (404)" "status $STATUS"
fi

req POST /api/webhooks/bank/sepay -H 'Content-Type: application/json' --data '{}'
if [ "$STATUS" = "$WEBHOOK_EXPECT" ] && ! head -c 1 "$BODY" | grep -q '<'; then
  pass "POST /api/webhooks/bank/sepay without key -> $WEBHOOK_EXPECT"
else
  fail "POST /api/webhooks/bank/sepay without key -> $WEBHOOK_EXPECT" "status $STATUS"
fi

# --- admin session ---------------------------------------------------------------------------
req GET /api/admin/me
if [ "$STATUS" = 401 ] && header content-type | grep -qi 'application/problem+json' \
  && body_has '"code"[[:space:]]*:[[:space:]]*"UNAUTHENTICATED"'; then
  pass "GET /api/admin/me anonymous -> 401 problem+json UNAUTHENTICATED"
else
  fail "GET /api/admin/me anonymous -> 401 problem+json UNAUTHENTICATED" \
    "status $STATUS, content-type '$(header content-type)'"
fi

rm -f "$JAR"
req GET /api/auth/csrf -c "$JAR"
XSRF="$(cookie_value XSRF-TOKEN)"
if { [ "$STATUS" = 204 ] || [ "$STATUS" = 200 ]; } && [ -n "$XSRF" ]; then
  pass "GET /api/auth/csrf sets XSRF-TOKEN"
else
  fail "GET /api/auth/csrf sets XSRF-TOKEN" "status $STATUS, cookie '${XSRF:-none}'"
fi

if [ -z "$LOGIN_USER" ] || [ -z "$LOGIN_PASS" ]; then
  fail "POST /api/auth/login" "no credentials: set SMOKE_USER and SMOKE_PASSWORD or provide $ENV_FILE"
else
  req POST /api/auth/login -b "$JAR" -c "$JAR" -H "X-XSRF-TOKEN: $XSRF" \
    --data-urlencode "username=$LOGIN_USER" --data-urlencode "password=$LOGIN_PASS"
  if [ "$STATUS" = 200 ] && body_has '"role"'; then
    pass "POST /api/auth/login $LOGIN_USER -> 200 ($(grep -Eo '"role"[[:space:]]*:[[:space:]]*"[A-Z]*"' "$BODY" | cut -d'"' -f4))"
  else
    fail "POST /api/auth/login $LOGIN_USER -> 200" "status $STATUS"
  fi

  req GET /api/admin/me -b "$JAR"
  if [ "$STATUS" = 200 ] && body_has '"username"'; then
    pass "GET /api/admin/me after login -> 200"
  else
    fail "GET /api/admin/me after login -> 200" "status $STATUS"
  fi
fi

# --- hidden prices -----------------------------------------------------------------------------
SLUG="${SMOKE_PRODUCT_SLUG:-$(find_sv465_slug)}"
if [ -z "$SLUG" ]; then
  fail "SV465 hidden prices" "product not found through public search (seeded and published?)"
else
  req GET "/api/public/products/$SLUG"
  if [ "$STATUS" != 200 ]; then
    fail "GET /api/public/products/$SLUG hides SV465 Thung/Day 8 prices" "status $STATUS"
  elif LC_ALL=C grep -Eq -- "$LEAK_RE" "$BODY"; then
    fail "GET /api/public/products/$SLUG hides SV465 Thung/Day 8 prices" \
      "found '$(LC_ALL=C grep -Eo -- "$LEAK_RE" "$BODY" | head -n 1)' in the response"
  elif ! body_has '"priceVisible"[[:space:]]*:[[:space:]]*false'; then
    fail "GET /api/public/products/$SLUG hides SV465 Thung/Day 8 prices" \
      "no SKU with priceVisible=false in the response, so nothing was checked"
  else
    pass "GET /api/public/products/$SLUG hides SV465 Thung/Day 8 prices"
  fi

  req GET "/san-pham/$SLUG"
  if [ "$STATUS" != 200 ]; then
    fail "GET /san-pham/$SLUG hides SV465 Thung/Day 8 prices" "status $STATUS"
  elif LC_ALL=C grep -Eq -- "$LEAK_RE" "$BODY"; then
    fail "GET /san-pham/$SLUG hides SV465 Thung/Day 8 prices" \
      "found '$(LC_ALL=C grep -Eo -- "$LEAK_RE" "$BODY" | head -n 1)' in the page"
  else
    pass "GET /san-pham/$SLUG hides SV465 Thung/Day 8 prices"
  fi
fi

echo "$((TOTAL - FAILED))/$TOTAL checks passed"
[ "$FAILED" -eq 0 ]
