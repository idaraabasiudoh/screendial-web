#!/bin/bash
# Screendial Installer
# Downloads the latest release from GitHub and installs on macOS or Windows (Git Bash/WSL).

set -e

REPO="idaraabasiudoh/screendial"
API_URL="https://api.github.com/repos/$REPO/releases/latest"

echo "=================================================="
echo "    Screendial Installer"
echo "=================================================="
echo ""

OS="$(uname -s)"

if [ "$OS" = "Darwin" ]; then
    echo "-> Detected macOS"

    DEST_DIR="/Applications"
    DEST_APP="$DEST_DIR/Screendial.app"
    TEMP_DMG="/tmp/Screendial_Download.dmg"
    MOUNT_POINT="/Volumes/Screendial"

    echo "-> Fetching latest release URL..."
    DMG_URL=$(curl -sL "$API_URL" | grep -o '"browser_download_url":\s*"[^"]*\.dmg"' | head -1 | cut -d'"' -f4)

    if [ -z "$DMG_URL" ]; then
        echo "Error: No .dmg asset found in the latest release."
        echo "Check https://github.com/$REPO/releases for available downloads."
        exit 1
    fi

    rm -f "$TEMP_DMG"
    if mount | grep -q "$MOUNT_POINT"; then
        hdiutil detach "$MOUNT_POINT" -force >/dev/null 2>&1 || true
    fi

    echo "-> Downloading $(basename "$DMG_URL")..."
    curl -L -f -o "$TEMP_DMG" "$DMG_URL"

    if [ ! -f "$TEMP_DMG" ] || [ ! -s "$TEMP_DMG" ]; then
        echo "Error: Download failed."
        exit 1
    fi

    if [ -d "$DEST_APP" ]; then
        echo "-> Removing existing version..."
        rm -rf "$DEST_APP"
    fi

    echo "-> Mounting disk image..."
    hdiutil mount "$TEMP_DMG" -quiet

    if [ ! -d "$MOUNT_POINT/Screendial.app" ]; then
        echo "Error: Screendial.app not found inside the DMG."
        hdiutil detach "$MOUNT_POINT" -force >/dev/null 2>&1 || true
        rm -f "$TEMP_DMG"
        exit 1
    fi

    echo "-> Installing to /Applications..."
    cp -R "$MOUNT_POINT/Screendial.app" "$DEST_DIR/"

    echo "-> Cleaning up..."
    hdiutil detach "$MOUNT_POINT" -quiet
    rm -f "$TEMP_DMG"

    echo "-> Clearing Gatekeeper restrictions..."
    xattr -cr "$DEST_APP"

    echo ""
    echo "=================================================="
    echo "    SUCCESS: Screendial has been installed!"
    echo "=================================================="
    echo "Location: $DEST_APP"
    echo "Launching Screendial now..."
    echo ""
    open "$DEST_APP"

else
    echo "Error: This installer supports macOS only."
    echo "For Windows, download the .exe from:"
    echo "  https://github.com/$REPO/releases/latest"
    exit 1
fi

exit 0
