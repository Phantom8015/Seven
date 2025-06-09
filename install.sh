#!/bin/bash

if [ "$(uname)" != "Darwin" ]; then
  echo "This script is intended for macOS only."
  exit 1
fi

architecture=$(uname -m)
if [[ "$architecture" == "arm64" ]]; then
  url="https://github.com/Phantom8015/Seven/releases/download/v2.0.0/Seven-2.0.0-arm64-mac.zip"
elif [[ "$architecture" == "x86_64" ]]; then
  url="https://github.com/Phantom8015/Seven/releases/download/v2.0.0/Seven-2.0.0-mac.zip"
else
  echo "Unsupported architecture: $architecture"
  exit 1
fi

mkdir -p "/tmp/Seven"
if [ -d "/Applications/Seven.app" ]; then
  echo "Seven is already installed. Deleting..."
  rm -rf "/Applications/Seven.app"
  echo "Seven has been deleted."
else
  echo "Seven is not installed. Proceeding with installation."
fi

echo "Downloading Seven for $architecture..."
curl -L -o "/tmp/Seven/Seven.zip" "$url"
echo "Extracting Seven..."
unzip -o "/tmp/Seven/Seven.zip" -d "/tmp/Seven"
mv -f "/tmp/Seven/Seven.app" "/Applications"
rm -rf "/tmp/Seven"

echo "Seven has been successfully installed! Please restart the app if it was running during installation."
