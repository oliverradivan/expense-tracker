import { readFile, writeFile } from 'node:fs/promises'
import { Resvg } from '@resvg/resvg-js'
import pngToIco from 'png-to-ico'

const lightBg = '#f4f4f4'
const darkBg = '#0b0c0d'
const svg = await readFile(new URL('../public/favicon.svg', import.meta.url), 'utf8')
const darkSvg = svg
  .replace('.coin-bg { fill: #fff; }', '.coin-bg { fill: #151718; }')
  .replace('.coin-inner { fill: #ededed; }', '.coin-inner { fill: #222527; }')

function render(markup, width, height = width) {
  return new Resvg(markup, { fitTo: { mode: 'width', value: width } }).render().asPng()
}

function sizedSvg(size) {
  // Force the compact variant when rasterizing the two smallest favicon sizes.
  return svg.replace(/<svg\b([^>]*)>/, (_, attributes) => `<svg${attributes.replace(/\bwidth="[^"]*"/, `width="${size}px"`).replace(/\bheight="[^"]*"/, `height="${size}px"`)}>`)
}

const tiny16 = render(sizedSvg(16), 16)
const tiny32 = render(sizedSvg(32), 32)
const icon48 = render(sizedSvg(48), 48)
await writeFile(new URL('../public/favicon-32.png', import.meta.url), tiny32)
await writeFile(new URL('../public/favicon.ico', import.meta.url), await pngToIco([tiny16, tiny32, icon48]))

for (const size of [192, 512]) {
  await writeFile(new URL(`../public/icon-${size}.png`, import.meta.url), render(svg, size))
}

// Android's themed-icon renderer uses alpha as a mask and supplies the color.
// Keep the whole coin mark inside the centered 80% safe area.
const monochromeSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <circle cx="256" cy="256" r="164" fill="none" stroke="#fff" stroke-width="22"/>
  <text x="256" y="240" text-anchor="middle" dominant-baseline="central" font-size="214" font-weight="700" fill="#fff" font-family="Georgia, serif">₪</text>
</svg>`
await writeFile(new URL('../public/icon-monochrome.svg', import.meta.url), `${monochromeSvg}\n`)
await writeFile(new URL('../public/icon-monochrome.png', import.meta.url), render(monochromeSvg, 512))

// Apple touch icons are opaque; place the coin at 80% of the canvas over --bg.
const appleCoin = render(svg, 144)
const apple = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="${lightBg}"/><image href="data:image/png;base64,${appleCoin.toString('base64')}" x="18" y="18" width="144" height="144"/></svg>`, { fitTo: { mode: 'width', value: 180 } }).render().asPng()
await writeFile(new URL('../public/apple-touch-icon.png', import.meta.url), apple)

const darkAppleCoin = render(darkSvg, 144)
const darkApple = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180"><rect width="180" height="180" fill="${darkBg}"/><image href="data:image/png;base64,${darkAppleCoin.toString('base64')}" x="18" y="18" width="144" height="144"/></svg>`, { fitTo: { mode: 'width', value: 180 } }).render().asPng()
await writeFile(new URL('../public/apple-touch-icon-dark.png', import.meta.url), darkApple)

// Maskable art uses a full-bleed opaque background with the coin at 60% of canvas.
const maskCoin = render(svg, 307)
const maskable = new Resvg(`<svg xmlns="http://www.w3.org/2000/svg" width="512" height="512"><rect width="512" height="512" fill="${lightBg}"/><image href="data:image/png;base64,${maskCoin.toString('base64')}" x="102.5" y="102.5" width="307" height="307"/></svg>`, { fitTo: { mode: 'width', value: 512 } }).render().asPng()
await writeFile(new URL('../public/icon-maskable-512.png', import.meta.url), maskable)

await writeFile(new URL('../public/manifest.webmanifest', import.meta.url), `${JSON.stringify({
  name: 'fathom',
  short_name: 'fathom',
  start_url: '/',
  display: 'standalone',
  background_color: lightBg,
  theme_color: lightBg,
  icons: [
    { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    { src: '/icon-monochrome.png', sizes: '512x512', type: 'image/png', purpose: 'monochrome' },
  ],
}, null, 2)}\n`)
