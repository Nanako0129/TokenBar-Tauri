# Homebrew Cask for TokenBar.
#
# This file is NOT consumed from this repo. Copy it into your tap repo
# (https://github.com/Nanako0129/homebrew-tokenbar) at `Casks/tokenbar.rb`, then:
#
#     brew tap nanako0129/tokenbar
#     brew install --cask tokenbar
#
# Tap `nanako0129/tokenbar` lives at github.com/Nanako0129/homebrew-tokenbar
# (Homebrew lowercases the owner). Recent Homebrew needs the explicit `brew tap`
# before a third-party cask installs.
#
# Requirements for `brew install` to work:
#   1. The tap repo must be PUBLIC.
#   2. The main repo's release assets must be publicly downloadable.
#
# After each release, bump `version` and replace `sha256` with the real app
# archive checksum (`shasum -a 256 TokenBar.app.tar.gz`), or run the release
# workflow which can patch it for you.
cask "tokenbar" do
  version "0.1.29"
  sha256 :no_check # replace with the real app archive sha256 once a release is published

  url "https://github.com/Nanako0129/TokenBar/releases/download/v#{version}/TokenBar.app.tar.gz"
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

  postflight do
    system_command "/usr/bin/xattr",
      args: ["-dr", "com.apple.quarantine", "#{appdir}/TokenBar.app"]
  end

  zap trash: [
    "~/Library/Application Support/com.nyanako.tokenbar",
    "~/Library/Caches/com.nyanako.tokenbar",
    "~/Library/Preferences/com.nyanako.tokenbar.plist",
    "~/Library/Saved Application State/com.nyanako.tokenbar.savedState",
  ]
end
