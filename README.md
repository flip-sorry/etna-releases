# Etna

Etna is a macOS menu-bar app that records your meetings — microphone and
system audio — and transcribes them **entirely on your Mac**. It recognizes
speakers across meetings, labels transcripts with names, and files finished
notes into your Obsidian vault. Audio never leaves the device.

## Download

Grab the latest DMG from **[Releases](https://github.com/flip-sorry/etna-releases/releases)**,
open it, and drag Etna to Applications.

- Requires macOS 26 or later (Apple silicon).
- Signed and notarized with Developer ID.
- Etna keeps itself up to date via [Sparkle](https://sparkle-project.org)
  (`appcast.xml` in this repo is the update feed).

## Why not the Mac App Store?

Capturing the audio other meeting apps play requires a system-audio tap,
which sandboxed App Store apps aren't allowed to use. Etna ships as a
notarized direct download instead — Apple's official channel for
full-capability Mac apps.
