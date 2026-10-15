import { useEffect } from 'react'

function buildMap(edgeX, edgeY = edgeX) {
  const nearX = edgeX
  const farX = 100 - edgeX
  const nearY = edgeY
  const farY = 100 - edgeY
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <linearGradient id="x" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgb(255,0,0)"/><stop offset="${nearX}%" stop-color="rgb(128,0,0)"/><stop offset="${farX}%" stop-color="rgb(128,0,0)"/><stop offset="100%" stop-color="rgb(0,0,0)"/>
      </linearGradient>
      <linearGradient id="y" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(0,255,0)"/><stop offset="${nearY}%" stop-color="rgb(0,128,0)"/><stop offset="${farY}%" stop-color="rgb(0,128,0)"/><stop offset="100%" stop-color="rgb(0,0,0)"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="rgb(0,0,0)"/><rect width="100" height="100" fill="url(#x)"/><rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const PANEL_MAP = buildMap(5)
const CONTROL_MAP = buildMap(24)
const BAR_MAP = buildMap(6, 28)

function LiquidGlassDefs() {
  useEffect(() => {
    const isChromium = /Chrome\//.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)
    const reduceTransparency = window.matchMedia?.('(prefers-reduced-transparency: reduce)').matches ?? false
    const root = document.documentElement

    if (isChromium && !reduceTransparency) root.setAttribute('data-lg-refract', 'true')
    else root.removeAttribute('data-lg-refract')

    return () => root.removeAttribute('data-lg-refract')
  }, [])

  return <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <filter id="lg-refract-panel" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={PANEL_MAP} preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="64" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="lg-refract-control" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={CONTROL_MAP} preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="34" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <filter id="lg-refract-bar" x="0" y="0" width="100%" height="100%" colorInterpolationFilters="sRGB">
        <feImage href={BAR_MAP} preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="36" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
}

export default LiquidGlassDefs
