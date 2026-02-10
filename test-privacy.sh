#!/bin/bash
# Bodhi Privacy Self-Test — verifies zero internet footprint
# "Your thoughts stay with you."
#
# Checks CSP config, dependency blacklist, source code URL leaks,
# network API usage, and dependency allowlist drift.
# Same output conventions as ~/overlord/verify.

set -euo pipefail

# cd to project root (script's directory)
cd "$(dirname "${BASH_SOURCE[0]}")"

# ── Color/symbol setup ──────────────────────────────────────
if [[ -t 1 ]] && [[ "${TERM:-dumb}" != "dumb" ]]; then
    GREEN=$'\033[32m'
    RED=$'\033[31m'
    YELLOW=$'\033[33m'
    BOLD=$'\033[1m'
    DIM=$'\033[2m'
    RESET=$'\033[0m'
    CHECK="✓"
    CROSS="✗"
    TILDE="~"
    LINE="━━━━━━━━━━━━━━━━━━━━━"
else
    GREEN="" RED="" YELLOW="" BOLD="" DIM="" RESET=""
    CHECK="+" CROSS="x" TILDE="~"
    LINE="====================="
fi

PASS_COUNT=0
FAIL_COUNT=0
WARN_COUNT=0

pass()    { PASS_COUNT=$((PASS_COUNT + 1)); }
fail()    { FAIL_COUNT=$((FAIL_COUNT + 1)); echo "  ${RED}${CROSS} $1${RESET}"; }
warn()    { WARN_COUNT=$((WARN_COUNT + 1)); echo "  ${YELLOW}${TILDE} $1${RESET}"; }
section() { echo ""; echo "${BOLD}$1${RESET}"; }

# ── CSP Validation (Tauri) ─────────────────────────────────
check_csp_tauri() {
    section "CSP — Tauri (src-tauri/tauri.conf.json)"
    local conf="src-tauri/tauri.conf.json"
    local failures=0

    if [[ ! -f "$conf" ]]; then
        fail "tauri.conf.json not found"
        return
    fi

    # Extract CSP string — grep for the "csp" key and pull the value
    local csp
    csp=$(grep -oP '"csp"\s*:\s*"\K[^"]+' "$conf" || true)

    if [[ -z "$csp" ]]; then
        fail "No CSP found in tauri.conf.json"
        return
    fi

    # Check required directives
    if echo "$csp" | grep -qP "default-src\s+'self'"; then
        pass
    else
        fail "Tauri CSP missing default-src 'self'"
        failures=$((failures + 1))
    fi

    if echo "$csp" | grep -qP "script-src\s+'self'"; then
        pass
    else
        fail "Tauri CSP missing script-src 'self'"
        failures=$((failures + 1))
    fi

    # script-src must not contain 'unsafe-eval' or external domains
    local script_src
    script_src=$(echo "$csp" | grep -oP "script-src\s+[^;]+" || true)
    if echo "$script_src" | grep -q "'unsafe-eval'"; then
        fail "Tauri CSP script-src contains 'unsafe-eval'"
        failures=$((failures + 1))
    else
        pass
    fi

    if echo "$script_src" | grep -qP 'https?://'; then
        fail "Tauri CSP script-src contains external domain"
        failures=$((failures + 1))
    else
        pass
    fi

    # connect-src must not contain https: or http: (except ipc: and http://ipc.localhost)
    local connect_src
    connect_src=$(echo "$csp" | grep -oP "connect-src\s+[^;]+" || true)
    if [[ -n "$connect_src" ]]; then
        # Remove known-safe entries, then check for http(s)
        local sanitized
        sanitized=$(echo "$connect_src" | sed 's|ipc:||g; s|http://ipc\.localhost||g')
        if echo "$sanitized" | grep -qP 'https?://'; then
            fail "Tauri CSP connect-src contains external URL"
            failures=$((failures + 1))
        else
            pass
        fi
    else
        pass  # No connect-src = no outbound connections allowed
    fi

    # No wildcards
    if echo "$csp" | grep -q '\*'; then
        fail "Tauri CSP contains wildcard (*)"
        failures=$((failures + 1))
    else
        pass
    fi

    if [[ $failures -eq 0 ]]; then
        echo "  ${GREEN}${CHECK} Tauri CSP locked down${RESET}"
    fi
}

# ── CSP Validation (PWA) ───────────────────────────────────
check_csp_pwa() {
    section "CSP — PWA (vite.config.ts)"
    local conf="vite.config.ts"
    local failures=0

    if [[ ! -f "$conf" ]]; then
        fail "vite.config.ts not found"
        return
    fi

    # Extract the CSP meta tag content string
    local csp
    csp=$(grep -oP 'content="[^"]*Content-Security-Policy[^"]*content="\K[^"]+' "$conf" || true)

    # Fallback: try matching the CSP value directly from the meta tag injection
    if [[ -z "$csp" ]]; then
        csp=$(grep -oP "content=\"default-src[^\"]*" "$conf" | sed 's/^content="//' || true)
    fi

    if [[ -z "$csp" ]]; then
        fail "No CSP meta tag found in vite.config.ts"
        return
    fi

    # Same checks as Tauri
    if echo "$csp" | grep -qP "default-src\s+'self'"; then
        pass
    else
        fail "PWA CSP missing default-src 'self'"
        failures=$((failures + 1))
    fi

    if echo "$csp" | grep -qP "script-src\s+'self'"; then
        pass
    else
        fail "PWA CSP missing script-src 'self'"
        failures=$((failures + 1))
    fi

    local script_src
    script_src=$(echo "$csp" | grep -oP "script-src\s+[^;]+" || true)
    if echo "$script_src" | grep -q "'unsafe-eval'"; then
        fail "PWA CSP script-src contains 'unsafe-eval'"
        failures=$((failures + 1))
    else
        pass
    fi

    if echo "$script_src" | grep -qP 'https?://'; then
        fail "PWA CSP script-src contains external domain"
        failures=$((failures + 1))
    else
        pass
    fi

    # PWA uses connect-src 'self' + http://*:8108 (LAN sync only)
    local connect_src
    connect_src=$(echo "$csp" | grep -oP "connect-src\s+[^;]+" || true)
    if [[ -n "$connect_src" ]]; then
        local sanitized
        sanitized=$(echo "$connect_src" | sed "s/'self'//g; s|http://\*:8108||g")
        if echo "$sanitized" | grep -qP 'https?://'; then
            fail "PWA CSP connect-src contains external URL"
            failures=$((failures + 1))
        else
            pass
        fi
    else
        pass
    fi

    # Check wildcards, but allow *:8108 (LAN sync port pattern)
    local csp_no_lan
    csp_no_lan=$(echo "$csp" | sed 's|\*:8108||g')
    if echo "$csp_no_lan" | grep -q '\*'; then
        fail "PWA CSP contains wildcard (*)"
        failures=$((failures + 1))
    else
        pass
    fi

    if [[ $failures -eq 0 ]]; then
        echo "  ${GREEN}${CHECK} PWA CSP locked down${RESET}"
    fi
}

# ── Dependency Audit ────────────────────────────────────────
check_dependency_audit() {
    section "Dependency Audit"
    local failures=0

    if [[ ! -f "package.json" ]]; then
        fail "package.json not found"
        return
    fi

    # Blacklisted package name patterns (telemetry/analytics)
    local blacklist=(
        sentry mixpanel segment amplitude google-analytics gtag
        hotjar heap intercom datadog bugsnag logrocket fullstory
        posthog plausible umami firebase
    )

    # Extract dependency names from dependencies and devDependencies blocks
    # Uses awk to only parse inside those blocks, then extracts package names
    local deps
    deps=$(awk '
        /"(dependencies|devDependencies)"/ { in_block=1; next }
        in_block && /\}/ { in_block=0; next }
        in_block && /"[^"]+"\s*:/ {
            match($0, /"([^"]+)"\s*:/, arr)
            if (arr[1] != "") print arr[1]
        }
    ' package.json || true)

    for dep in $deps; do
        local dep_lower
        dep_lower=$(echo "$dep" | tr '[:upper:]' '[:lower:]')
        local matched=false

        for banned in "${blacklist[@]}"; do
            # Match exact name or scoped package (@sentry/*, @datadog/*, etc.)
            if [[ "$dep_lower" == "$banned" ]] || \
               [[ "$dep_lower" == *"/$banned"* ]] || \
               [[ "$dep_lower" == "@${banned}/"* ]] || \
               [[ "$dep_lower" == "@${banned}-"* ]] || \
               [[ "$dep_lower" == *"-${banned}" ]] || \
               [[ "$dep_lower" == *"-${banned}-"* ]]; then
                fail "Blacklisted dependency: $dep (matches: $banned)"
                failures=$((failures + 1))
                matched=true
                break
            fi
        done

        if [[ "$matched" == "false" ]]; then
            pass
        fi
    done

    if [[ $failures -eq 0 ]]; then
        echo "  ${GREEN}${CHECK} No telemetry/analytics dependencies${RESET}"
    fi
}

# ── External URL Scan ───────────────────────────────────────
check_external_urls() {
    section "External URL Scan (src/)"
    local failures=0

    if [[ ! -d "src" ]]; then
        fail "src/ directory not found"
        return
    fi

    # Find http(s) URLs in source files
    local hits
    hits=$(grep -rnP 'https?://' src/ --include='*.ts' --include='*.tsx' --include='*.css' --include='*.html' || true)

    if [[ -z "$hits" ]]; then
        pass
        echo "  ${GREEN}${CHECK} No URLs found in source${RESET}"
        return
    fi

    local checked=0
    while IFS= read -r line; do
        [[ -z "$line" ]] && continue
        checked=$((checked + 1))

        # Extract just the content (after filename:lineno:)
        local content
        content=$(echo "$line" | sed 's/^[^:]*:[0-9]*://')

        # Safe: SVG xmlns attributes
        if echo "$content" | grep -qP 'xmlns=.*http://www\.w3\.org/'; then
            pass
            continue
        fi

        # Safe: SVG in CSS data URIs
        if echo "$content" | grep -qP "url\(.*xmlns.*http://www\.w3\.org/"; then
            pass
            continue
        fi

        # Safe: localhost references
        if echo "$content" | grep -qP 'https?://(localhost|127\.0\.0\.1|ipc\.localhost)'; then
            # But only if there's no OTHER URL on the same line
            local without_localhost
            without_localhost=$(echo "$content" | sed 's|https\?://localhost[^ "'"'"']*||g; s|https\?://127\.0\.0\.1[^ "'"'"']*||g; s|https\?://ipc\.localhost[^ "'"'"']*||g')
            if ! echo "$without_localhost" | grep -qP 'https?://'; then
                pass
                continue
            fi
        fi

        # Safe: Inside <code> JSX elements (instructional text, not executable)
        if echo "$content" | grep -qP '<code>.*https?://.*</code>'; then
            pass
            continue
        fi

        # Safe: Comment lines
        local trimmed
        trimmed=$(echo "$content" | sed 's/^[[:space:]]*//')
        if [[ "$trimmed" == "//"* ]] || [[ "$trimmed" == "*"* ]] || [[ "$trimmed" == "/*"* ]]; then
            pass
            continue
        fi

        # Safe: LAN sync URL template in SyncPanel/PairingPanel/private-ip (not real external URLs)
        if echo "$line" | grep -qP '(SyncPanel|PairingPanel)\.tsx|private-ip\.ts'; then
            pass
            continue
        fi

        # Anything else is a failure
        fail "External URL: $line"
        failures=$((failures + 1))

    done <<< "$hits"

    if [[ $failures -eq 0 ]]; then
        echo "  ${GREEN}${CHECK} All $checked URLs are safe (SVG xmlns, localhost, comments)${RESET}"
    fi
}

# ── External Resource Tags ──────────────────────────────────
check_external_resources() {
    section "External Resource Tags"
    local failures=0
    local checked=0

    # Files to check
    local -a targets=()
    [[ -f "index.html" ]] && targets+=("index.html")

    while IFS= read -r -d '' f; do
        targets+=("$f")
    done < <(find src/ -name '*.tsx' -print0 2>/dev/null || true)

    if [[ ${#targets[@]} -eq 0 ]]; then
        echo "  ${DIM}(no files to check)${RESET}"
        return
    fi

    for file in "${targets[@]}"; do
        # External scripts
        if grep -qP '<script\s+[^>]*src="https?://' "$file" 2>/dev/null; then
            fail "$file — external <script> tag"
            failures=$((failures + 1))
        else
            checked=$((checked + 1))
            pass
        fi

        # External stylesheets
        if grep -qP '<link\s+[^>]*href="https?://' "$file" 2>/dev/null; then
            fail "$file — external <link> stylesheet"
            failures=$((failures + 1))
        else
            checked=$((checked + 1))
            pass
        fi

        # CSS @import with external URL
        if grep -qP '@import\s+url\("https?://' "$file" 2>/dev/null; then
            fail "$file — external CSS @import"
            failures=$((failures + 1))
        else
            checked=$((checked + 1))
            pass
        fi

        # Google Fonts
        if grep -qP 'fonts\.googleapis\.com|fonts\.gstatic\.com' "$file" 2>/dev/null; then
            fail "$file — Google Fonts reference"
            failures=$((failures + 1))
        else
            checked=$((checked + 1))
            pass
        fi
    done

    if [[ $failures -eq 0 ]]; then
        echo "  ${GREEN}${CHECK} No external resources in $((${#targets[@]})) files${RESET}"
    fi
}

# ── Fetch/XHR Usage ─────────────────────────────────────────
check_network_apis() {
    section "Network API Usage (src/)"
    local failures=0

    if [[ ! -d "src" ]]; then
        fail "src/ directory not found"
        return
    fi

    # fetch() — should not exist in application code
    # Exclude: comments, JSX <code> elements (instructional text), sync-client.ts (LAN-only)
    local fetch_hits
    fetch_hits=$(grep -rnP '\bfetch\s*\(' src/ --include='*.ts' --include='*.tsx' || true)

    if [[ -n "$fetch_hits" ]]; then
        while IFS= read -r line; do
            [[ -z "$line" ]] && continue
            local content
            content=$(echo "$line" | sed 's/^[^:]*:[0-9]*://')
            local trimmed
            trimmed=$(echo "$content" | sed 's/^[[:space:]]*//')

            # Skip comments
            [[ "$trimmed" == "//"* ]] && { pass; continue; }
            [[ "$trimmed" == "*"* ]] && { pass; continue; }
            [[ "$trimmed" == "/*"* ]] && { pass; continue; }

            # Skip instructional text inside JSX elements
            if echo "$content" | grep -qP '<code>.*fetch.*</code>'; then
                pass
                continue
            fi

            # Skip sync-client.ts and PairingPanel.tsx (LAN-only sync requests)
            if echo "$line" | grep -qP '(sync-client\.ts|PairingPanel\.tsx)'; then
                pass
                continue
            fi

            fail "fetch() call: $line"
            failures=$((failures + 1))
        done <<< "$fetch_hits"
    else
        pass
    fi

    # XMLHttpRequest
    if grep -rqP '\bXMLHttpRequest\b' src/ --include='*.ts' --include='*.tsx'; then
        fail "XMLHttpRequest found in src/"
        failures=$((failures + 1))
    else
        pass
    fi

    # navigator.sendBeacon
    if grep -rqP '\bnavigator\.sendBeacon\b' src/ --include='*.ts' --include='*.tsx'; then
        fail "navigator.sendBeacon found in src/"
        failures=$((failures + 1))
    else
        pass
    fi

    # WebSocket
    if grep -rqP '\bnew\s+WebSocket\b' src/ --include='*.ts' --include='*.tsx'; then
        fail "WebSocket constructor found in src/"
        failures=$((failures + 1))
    else
        pass
    fi

    if [[ $failures -eq 0 ]]; then
        echo "  ${GREEN}${CHECK} No network API usage${RESET}"
    fi
}

# ── New Dependencies (warning only) ────────────────────────
check_new_dependencies() {
    section "Dependency Allowlist"
    local allowlist_file=".privacy-allowlist"
    local new_deps=0

    if [[ ! -f "$allowlist_file" ]]; then
        warn "No .privacy-allowlist file — skipping allowlist check"
        return
    fi

    # Load allowlist (skip comments and blank lines)
    local -a allowed=()
    while IFS= read -r line; do
        line=$(echo "$line" | sed 's/#.*//' | sed 's/^[[:space:]]*//;s/[[:space:]]*$//')
        [[ -n "$line" ]] && allowed+=("$line")
    done < "$allowlist_file"

    # Get current deps from package.json (dependencies + devDependencies)
    local deps
    deps=$(awk '
        /"(dependencies|devDependencies)"/ { in_block=1; next }
        in_block && /\}/ { in_block=0; next }
        in_block && /"[^"]+"\s*:/ {
            match($0, /"([^"]+)"\s*:/, arr)
            if (arr[1] != "") print arr[1]
        }
    ' package.json || true)

    for dep in $deps; do
        local found=false
        for a in "${allowed[@]}"; do
            if [[ "$dep" == "$a" ]]; then
                found=true
                break
            fi
        done

        if [[ "$found" == "true" ]]; then
            pass
        else
            warn "New dependency not on allowlist: $dep"
            new_deps=$((new_deps + 1))
        fi
    done

    if [[ $new_deps -eq 0 ]]; then
        echo "  ${GREEN}${CHECK} All dependencies on allowlist${RESET}"
    fi
}

# ── Main ────────────────────────────────────────────────────
main() {
    echo ""
    echo "${BOLD}Bodhi Privacy Self-Test${RESET}"
    echo "$LINE"

    check_csp_tauri
    check_csp_pwa
    check_dependency_audit
    check_external_urls
    check_external_resources
    check_network_apis
    check_new_dependencies

    echo ""
    echo "$LINE"

    local total=$((PASS_COUNT + FAIL_COUNT))
    if [[ $FAIL_COUNT -gt 0 ]]; then
        echo "${RED}${CROSS} $FAIL_COUNT failures${RESET} out of $total checks.${WARN_COUNT:+ ($WARN_COUNT warnings)}"
        exit 1
    else
        local summary="All $total checks passed."
        if [[ $WARN_COUNT -gt 0 ]]; then
            summary="$summary ($WARN_COUNT warnings)"
        fi
        echo "${GREEN}${CHECK} $summary${RESET}"
        exit 0
    fi
}

main
