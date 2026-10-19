import { useEffect } from 'react'

// Built once when this module loads. The RGB channels encode horizontal and
// vertical displacement, with a flatter middle and stronger outer edge.
const LENS_MAP = (() => {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128" preserveAspectRatio="none">
    <defs>
      <linearGradient id="x" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgb(0,0,0)"/><stop offset="20%" stop-color="rgb(118,0,0)"/><stop offset="50%" stop-color="rgb(128,0,0)"/><stop offset="80%" stop-color="rgb(138,0,0)"/><stop offset="100%" stop-color="rgb(255,0,0)"/>
      </linearGradient>
      <linearGradient id="y" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(0,0,0)"/><stop offset="20%" stop-color="rgb(0,118,0)"/><stop offset="50%" stop-color="rgb(0,128,0)"/><stop offset="80%" stop-color="rgb(0,138,0)"/><stop offset="100%" stop-color="rgb(0,255,0)"/>
      </linearGradient>
    </defs>
    <rect width="128" height="128" fill="rgb(0,0,0)"/><rect width="128" height="128" fill="url(#x)"/><rect width="128" height="128" fill="url(#y)" style="mix-blend-mode:screen"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
})()

function LiquidGlassDefs() {
  useEffect(() => {
    const isChromium = /Chrome\//.test(navigator.userAgent) && !/CriOS|FxiOS|EdgiOS/.test(navigator.userAgent)
    const reduceMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    const root = document.documentElement

    if (isChromium && !reduceMotion) root.setAttribute('data-lg-refract', 'true')
    else root.removeAttribute('data-lg-refract')

    return () => root.removeAttribute('data-lg-refract')
  }, [])

  return <svg className="lg-defs" width="0" height="0" aria-hidden="true" focusable="false">
    <defs>
      <filter id="lg-refract-lens" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
        <feImage href={LENS_MAP} preserveAspectRatio="none" result="map" />
        <feDisplacementMap in="SourceGraphic" in2="map" scale="var(--lg-refraction-strength, 24)" xChannelSelector="R" yChannelSelector="G" />
      </filter>
    </defs>
  </svg>
}

export default LiquidGlassDefs
