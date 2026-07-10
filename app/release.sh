#!/usr/bin/env bash

set -euo pipefail

APP_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ANDROID_DIR="$APP_DIR/android"
IOS_DIR="$APP_DIR/ios"
IOS_WORKSPACE="$IOS_DIR/SimpleFasting.xcworkspace"
IOS_SCHEME="SimpleFasting"
IOS_DERIVED_DATA="$IOS_DIR/build"

android_device_ids=()
android_device_names=()
ios_device_ids=()
ios_device_names=()

usage() {
  cat <<'EOF'
Usage: ./release.sh ios|android

Builds the existing native project in Release mode and installs it on connected
physical devices only. This script does not run Expo prebuild.
EOF
}

fail() {
  echo "release.sh: $*" >&2
  exit 1
}

require_command() {
  command -v "$1" >/dev/null 2>&1 || fail "Missing required command: $1"
}

sync_content() {
  echo "==> Syncing shared content"
  (cd "$APP_DIR" && pnpm content:sync)
}

load_android_devices() {
  android_device_ids=()
  android_device_names=()

  while IFS=$'\t' read -r serial model; do
    if [[ -n "$serial" ]]; then
      android_device_ids+=("$serial")
      android_device_names+=("${model:-$serial}")
    fi
  done < <(
    adb devices -l | awk '
      NR > 1 && $2 == "device" && $1 !~ /^emulator-/ {
        model = ""
        for (i = 3; i <= NF; i++) {
          if ($i ~ /^model:/) {
            model = substr($i, 7)
          }
        }
        print $1 "\t" model
      }
    '
  )
}

require_android_device() {
  require_command adb
  load_android_devices

  if [[ "${#android_device_ids[@]}" -eq 0 ]]; then
    adb devices -l >&2 || true
    fail "No connected Android phone found. Connect the phone, enable USB debugging, and authorize this computer."
  fi
}

release_android() {
  require_command pnpm
  [[ -x "$ANDROID_DIR/gradlew" ]] || fail "Missing Android Gradle wrapper at $ANDROID_DIR/gradlew"

  require_android_device
  sync_content

  echo "==> Building Android Release APK"
  (cd "$ANDROID_DIR" && NODE_ENV=production ./gradlew :app:assembleRelease)

  local apk_path="$ANDROID_DIR/app/build/outputs/apk/release/app-release.apk"
  [[ -f "$apk_path" ]] || fail "Release APK was not found at $apk_path"

  require_android_device
  for index in "${!android_device_ids[@]}"; do
    local device_id="${android_device_ids[$index]}"
    local device_name="${android_device_names[$index]}"
    echo "==> Installing Android APK on $device_name ($device_id)"
    adb -s "$device_id" install -r "$apk_path"
  done
}

load_ios_devices() {
  ios_device_ids=()
  ios_device_names=()

  local json_file
  json_file="$(mktemp "${TMPDIR:-/tmp}/simple-fasting-devices.XXXXXX.json")"

  if ! xcrun devicectl list devices --timeout 10 --json-output "$json_file" >/dev/null; then
    rm -f "$json_file"
    return 1
  fi

  local output
  if ! output="$(node - "$json_file" <<'NODE'
const fs = require('fs');

const file = process.argv[2];
const data = JSON.parse(fs.readFileSync(file, 'utf8'));
const devices = data?.result?.devices ?? data?.devices ?? [];

const stringsFrom = (value, result = []) => {
  if (typeof value === 'string') {
    result.push(value);
    return result;
  }
  if (Array.isArray(value)) {
    for (const item of value) stringsFrom(item, result);
    return result;
  }
  if (value && typeof value === 'object') {
    for (const item of Object.values(value)) stringsFrom(item, result);
  }
  return result;
};

const findStringByKey = (value, names) => {
  if (!value || typeof value !== 'object') return null;

  for (const [key, item] of Object.entries(value)) {
    if (names.has(key) && typeof item === 'string' && item.length > 0) return item;
  }

  for (const item of Object.values(value)) {
    const found = findStringByKey(item, names);
    if (found) return found;
  }

  return null;
};

for (const device of devices) {
  const allText = stringsFrom(device).join(' ').toLowerCase();
  const connectionText = stringsFrom(device.connectionProperties ?? {}).join(' ').toLowerCase();
  const platform = String(device?.hardwareProperties?.platform ?? '').toLowerCase();
  const productType = String(device?.hardwareProperties?.productType ?? '').toLowerCase();
  const isSimulator = allText.includes('simulator') || productType.includes('simulator');
  const isMac = platform.includes('mac') || productType.includes('mac');
  const isIos =
    platform.includes('ios') ||
    platform.includes('iphone') ||
    productType.startsWith('iphone') ||
    productType.startsWith('ipad') ||
    productType.startsWith('ipod') ||
    (!isSimulator && /\b(iphone|ipad|ipod)\b/.test(allText));
  const unavailable =
    connectionText.includes('disconnected') ||
    connectionText.includes('not connected') ||
    connectionText.includes('unavailable') ||
    connectionText.includes('offline');
  const connected =
    !unavailable &&
    (connectionText.includes('connected') ||
      connectionText.includes('wired') ||
      connectionText.includes('usb') ||
      connectionText.includes('network'));

  if (!isIos || isSimulator || isMac || !connected) continue;

  const identifier =
    (typeof device.identifier === 'string' && device.identifier) ||
    findStringByKey(device, new Set(['identifier', 'udid', 'serialNumber']));
  const name =
    (typeof device.name === 'string' && device.name) ||
    findStringByKey(device, new Set(['name'])) ||
    identifier;

  if (identifier) console.log(`${identifier}\t${name}`);
}
NODE
)"; then
    rm -f "$json_file"
    return 1
  fi

  rm -f "$json_file"

  while IFS=$'\t' read -r identifier name; do
    if [[ -n "$identifier" ]]; then
      ios_device_ids+=("$identifier")
      ios_device_names+=("${name:-$identifier}")
    fi
  done <<<"$output"
}

require_ios_device() {
  require_command xcrun
  require_command node

  if ! load_ios_devices; then
    xcrun devicectl list devices >&2 || true
    fail "Unable to read iOS devices with xcrun devicectl."
  fi

  if [[ "${#ios_device_ids[@]}" -eq 0 ]]; then
    xcrun devicectl list devices >&2 || true
    fail "No connected iPhone or iPad found. Connect it by USB, unlock it, trust this computer, and enable Developer Mode if required."
  fi
}

release_ios() {
  require_command pnpm
  require_command xcodebuild
  [[ -d "$IOS_WORKSPACE" ]] || fail "Missing iOS workspace at $IOS_WORKSPACE"

  require_ios_device
  sync_content

  echo "==> Building iOS Release app"
  (
    cd "$IOS_DIR"
    NODE_ENV=production xcodebuild \
      -workspace "$IOS_WORKSPACE" \
      -scheme "$IOS_SCHEME" \
      -configuration Release \
      -sdk iphoneos \
      -destination 'generic/platform=iOS' \
      -derivedDataPath "$IOS_DERIVED_DATA" \
      build
  )

  local app_path="$IOS_DERIVED_DATA/Build/Products/Release-iphoneos/$IOS_SCHEME.app"
  if [[ ! -d "$app_path" ]]; then
    app_path="$(find "$IOS_DERIVED_DATA/Build/Products/Release-iphoneos" -maxdepth 1 -name '*.app' -type d 2>/dev/null | head -n 1 || true)"
  fi
  [[ -n "$app_path" && -d "$app_path" ]] || fail "Release app was not found under $IOS_DERIVED_DATA/Build/Products/Release-iphoneos"

  require_ios_device
  for index in "${!ios_device_ids[@]}"; do
    local device_id="${ios_device_ids[$index]}"
    local device_name="${ios_device_names[$index]}"
    echo "==> Installing iOS app on $device_name ($device_id)"
    xcrun devicectl device install app --device "$device_id" "$app_path"
  done
}

case "${1:-}" in
  android)
    release_android
    ;;
  ios)
    release_ios
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    usage >&2
    exit 2
    ;;
esac
