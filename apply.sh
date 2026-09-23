#!/usr/bin/env bash
set -euo pipefail
PATCH_NAME="ticarti-v21-4-0-signature-converted-final"
PATCH_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TARGET_DIR="${1:-}"
if [[ -z "$TARGET_DIR" ]]; then echo "Kullanim: bash apply.sh /tam/yol/ticarti-full-final-v21-0-0" >&2; exit 1; fi
TARGET_DIR="$(cd "$TARGET_DIR" 2>/dev/null && pwd)" || { echo "Hata: hedef klasor bulunamadi." >&2; exit 1; }
if [[ ! -f "$TARGET_DIR/package.json" || ! -d "$TARGET_DIR/apps" ]]; then echo "Hata: hedef klasor gecerli Ticarti proje kok dizini degil." >&2; exit 1; fi
cd "$PATCH_DIR"
if command -v shasum >/dev/null 2>&1; then shasum -a 256 -c SHA256SUMS; elif command -v sha256sum >/dev/null 2>&1; then sha256sum -c SHA256SUMS; else echo "Hata: SHA-256 araci bulunamadi." >&2; exit 1; fi
STAMP="$(date -u +%Y%m%dT%H%M%SZ)"
BACKUP_DIR="$TARGET_DIR/.patch-backups/$PATCH_NAME-$STAMP"
mkdir -p "$BACKUP_DIR"
while IFS= read -r rel; do
  [[ -z "$rel" ]] && continue
  src="$PATCH_DIR/$rel"; dst="$TARGET_DIR/$rel"
  if [[ -f "$dst" ]]; then mkdir -p "$BACKUP_DIR/$(dirname "$rel")"; cp -p "$dst" "$BACKUP_DIR/$rel"; fi
  mkdir -p "$(dirname "$dst")"; cp -p "$src" "$dst"
done < FILES.txt
# Eski paket adi mevcutsa karisiklik yaratmamasi icin kaldir.
rm -f "$TARGET_DIR/theme-packages/ticarti-atlas-complete-theme-package.json"
echo "Paket uygulandi: $PATCH_NAME"
echo "Yedek: $BACKUP_DIR"
echo "Tema paketi: $TARGET_DIR/theme-packages/ticarti-signature-complete-theme-package.json"
echo "Sonraki adim: cd \"$TARGET_DIR\" && bash scripts/verify-signature-converted.sh && bash scripts/build-all.sh && bash scripts/deploy-production-safe.sh"

