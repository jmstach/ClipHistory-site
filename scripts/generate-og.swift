#!/usr/bin/env swift
//
// Generates the og:image social card for cliphistory.stach.uk at 1200×630.
// Black on white, Helvetica Bold. The real app icon top-left with the
// wordmark, then the hero headline, then a one-line descriptor.
//
// Run:
//   swift scripts/generate-og.swift
//

import AppKit

let root = FileManager.default.currentDirectoryPath
let outputPath = "\(root)/og.png"
let iconPath = "\(root)/icon.png"
let W: CGFloat = 1200
let H: CGFloat = 630

let img = NSImage(size: CGSize(width: W, height: H))
img.lockFocusFlipped(true)   // origin top-left, y growing downward

// Background
NSColor.white.setFill()
NSRect(x: 0, y: 0, width: W, height: H).fill()

let margin: CGFloat = 80

// Icon + wordmark (top-left)
let iconSize: CGFloat = 72
if let icon = NSImage(contentsOfFile: iconPath) {
    icon.draw(in: NSRect(x: margin, y: margin, width: iconSize, height: iconSize))
}

let wordmarkFont = NSFont(name: "HelveticaNeue-Bold", size: 30) ?? .boldSystemFont(ofSize: 30)
let wordmark = NSAttributedString(string: "ClipHistory", attributes: [
    .font: wordmarkFont,
    .foregroundColor: NSColor.black,
    .kern: -0.4,
])
let wmSize = wordmark.size()
wordmark.draw(at: NSPoint(x: margin + iconSize + 20, y: margin + (iconSize - wmSize.height) / 2))

// Hero headline
let headlineFont = NSFont(name: "HelveticaNeue-Bold", size: 58) ?? .boldSystemFont(ofSize: 58)
let headlinePara = NSMutableParagraphStyle()
headlinePara.lineHeightMultiple = 1.03
let headline = NSAttributedString(string: "A super-tiny,\nprivacy-respecting,\nmacOS-native\nclipboard manager.", attributes: [
    .font: headlineFont,
    .foregroundColor: NSColor.black,
    .kern: -1.6,
    .paragraphStyle: headlinePara,
])
let headlineMaxWidth = W - margin * 2
let hBounds = headline.boundingRect(
    with: CGSize(width: headlineMaxWidth, height: .greatestFiniteMagnitude),
    options: [.usesLineFragmentOrigin, .usesFontLeading]
)
let headlineY = margin + iconSize + 52
headline.draw(with: NSRect(x: margin, y: headlineY, width: headlineMaxWidth, height: hBounds.height),
              options: [.usesLineFragmentOrigin, .usesFontLeading])

// Descriptor near the bottom
let descFont = NSFont(name: "HelveticaNeue", size: 26) ?? .systemFont(ofSize: 26)
let desc = NSAttributedString(string: "Everything you’ve copied, one keystroke away.", attributes: [
    .font: descFont,
    .foregroundColor: NSColor.black.withAlphaComponent(0.55),
    .kern: -0.3,
])
desc.draw(at: NSPoint(x: margin, y: H - margin - desc.size().height))

img.unlockFocus()

guard let tiff = img.tiffRepresentation,
      let rep = NSBitmapImageRep(data: tiff),
      let png = rep.representation(using: .png, properties: [:]) else {
    FileHandle.standardError.write("failed to encode PNG\n".data(using: .utf8)!)
    exit(1)
}

try png.write(to: URL(fileURLWithPath: outputPath))
print("Wrote \(outputPath) — \(Int(W))×\(Int(H))")
