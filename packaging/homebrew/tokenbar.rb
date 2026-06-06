# Homebrew Cask for TokenBar.
#
# This file is NOT consumed from this repo. Copy it into your tap repo
# (https://github.com/Nanako0129/homebrew-tokenbar) at `Casks/tokenbar.rb`, then:
#
#     brew install --cask nyanako/tokenbar/tokenbar
#
# `nyanako/tokenbar/tokenbar` = tap `nyanako/homebrew-tokenbar`, cask `tokenbar`.
#
# Requirements for `brew install` to work:
#   1. The tap repo must be PUBLIC.
#   2. The main repo's release assets (the .dmg) must be publicly downloadable.
#
# After each release, bump `version` and replace `sha256` with the real DMG
# checksum (`shasum -a 256 TokenBar_<version>_aarch64.dmg`), or run the release
# script which can patch it for you.
cask "tokenbar" do
  version "0.1.29"
  sha256 :no_check # replace with the real DMG sha256 once a release is published

  url "https://github.com/Nanako0129/TokenBar/releases/download/v#{version}/TokenBar_#{version}_aarch64.dmg"
  name "TokenBar"
  desc "AI token usage monitor for the macOS menu bar"
  homepage "https://github.com/Nanako0129/TokenBar"

  livecheck do
    url :url
    strategy :github_latest
  end

  depends_on macos: ">= :big_sur"
  depends_on arch: :arm64

  app "TokenBar.app"

  zap trash: [
    "~/Library/Application Support/com.nyanako.tokenbar",
    "~/Library/Caches/com.nyanako.tokenbar",
    "~/Library/Preferences/com.nyanako.tokenbar.plist",
    "~/Library/Saved Application State/com.nyanako.tokenbar.savedState",
  ]
end
