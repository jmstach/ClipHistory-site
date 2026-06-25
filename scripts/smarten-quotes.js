#!/usr/bin/env node
// Smarten straight quotes in HTML files, in place.
// Skips <code>, <pre>, <kbd>, <script>, <style>, <textarea> blocks, HTML comments,
// and tag delimiters. Smartens text in selected attribute values (content, title,
// alt, placeholder, aria-label).

const fs = require('fs');

const SKIP_BLOCKS = ['code', 'pre', 'kbd', 'script', 'style', 'textarea'];
const SMART_ATTRS = ['content', 'title', 'alt', 'placeholder', 'aria-label'];

function smartenText(text) {
  let out = text;
  // Double quotes
  out = out.replace(/(^|[\s(\[{<—–])"/g, '$1“'); // opening
  out = out.replace(/"/g, '”');                            // closing

  // Single quotes
  // Decades like '90s, '20s
  out = out.replace(/(^|\s)'(\d{2}s?)\b/g, '$1’$2');
  // Apostrophe after a word char (it's, Apple's, wasn't)
  out = out.replace(/(\w)'/g, '$1’');
  // Opening single
  out = out.replace(/(^|[\s(\[{<—–])'(?=\S)/g, '$1‘');
  // Anything else
  out = out.replace(/'/g, '’');

  return out;
}

function smartenTag(tag) {
  const pattern = new RegExp(`\\b(${SMART_ATTRS.join('|')})="([^"]*)"`, 'gi');
  return tag.replace(pattern, (_, name, value) => `${name}="${smartenText(value)}"`);
}

function smartenHtml(html) {
  const skipBlocks = SKIP_BLOCKS.map(t => `<${t}\\b[^>]*>[\\s\\S]*?<\\/${t}>`).join('|');
  const pattern = new RegExp(`<!--[\\s\\S]*?-->|${skipBlocks}|<[^>]+>`, 'gi');

  let result = '';
  let lastIndex = 0;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    result += smartenText(html.slice(lastIndex, match.index));
    const segment = match[0];
    if (segment.startsWith('<!--') || new RegExp(`^<(${SKIP_BLOCKS.join('|')})\\b`, 'i').test(segment)) {
      result += segment;
    } else {
      result += smartenTag(segment);
    }
    lastIndex = pattern.lastIndex;
  }
  result += smartenText(html.slice(lastIndex));
  return result;
}

const files = process.argv.slice(2);
if (files.length === 0) {
  console.error('Usage: smarten-quotes.js <file.html> [...]');
  process.exit(1);
}

for (const file of files) {
  const original = fs.readFileSync(file, 'utf8');
  const smartened = smartenHtml(original);
  if (smartened !== original) {
    fs.writeFileSync(file, smartened);
    console.log(`smartened: ${file}`);
  }
}
