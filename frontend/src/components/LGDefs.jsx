import { useEffect } from 'react'

// The red and green channels describe horizontal and vertical movement.
// A flat center and stronger outer edge make the backdrop bulge like a lens.
function buildMap(flatEdge = 18) {
  const inner = flatEdge
  const outer = 100 - flatEdge
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" preserveAspectRatio="none">
    <defs>
      <linearGradient id="x" x1="0" y1="0" x2="1" y2="0">
        <stop offset="0%" stop-color="rgb(0,0,0)"/><stop offset="${inner}%" stop-color="rgb(118,0,0)"/><stop offset="50%" stop-color="rgb(128,0,0)"/><stop offset="${outer}%" stop-color="rgb(138,0,0)"/><stop offset="100%" stop-color="rgb(255,0,0)"/>
      </linearGradient>
      <linearGradient id="y" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="rgb(0,0,0)"/><stop offset="${inner}%" stop-color="rgb(0,118,0)"/><stop offset="50%" stop-color="rgb(0,128,0)"/><stop offset="${outer}%" stop-color="rgb(0,138,0)"/><stop offset="100%" stop-color="rgb(0,255,0)"/>
      </linearGradient>
    </defs>
    <rect width="100" height="100" fill="rgb(0,0,0)"/><rect width="100" height="100" fill="url(#x)"/><rect width="100" height="100" fill="url(#y)" style="mix-blend-mode:screen"/>
  </svg>`
  return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

const PANEL_MAP = buildMap(20)
const CONTROL_MAP = buildMap(27)
const BAR_MAP = buildMap(22)

function ChannelRefraction({ map, id, control = false }) {
  const split = (channel, result) => <feColorMatrix in="SourceGraphic" type="matrix" values={channel === 'R'
    ? '1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0'
    : channel === 'G'
      ? '0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0'
      : '0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0'} result={result} />

  return <filter id={id} x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
    <feImage href={map} preserveAspectRatio="none" result="map" />
    {split('R', 'red')}
    {split('G', 'green')}
    {split('B', 'blue')}
    <feDisplacementMap in="red" in2="map" scale={control ? 'var(--lg-control-refraction-strength, 10)' : 'var(--lg-refraction-strength, 24)'} xChannelSelector="R" yChannelSelector="G" result="redBent" />
    <feDisplacementMap in="green" in2="map" scale={control ? 'var(--lg-control-refraction-strength, 10)' : 'calc(var(--lg-refraction-strength, 24) - var(--lg-aberration-strength, 2))'} xChannelSelector="R" yChannelSelector="G" result="greenBent" />
    <feDisplacementMap in="blue" in2="map" scale={control ? 'var(--lg-control-refraction-strength, 10)' : 'calc(var(--lg-refraction-strength, 24) - var(--lg-aberration-strength, 2) - var(--lg-aberration-strength, 2))'} xChannelSelector="R" yChannelSelector="G" result="blueBent" />
    <feBlend in="redBent" in2="greenBent" mode="screen" result="rg" />
    <feBlend in="rg" in2="blueBent" mode="screen" />
  </filter>
}

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
      <ChannelRefraction id="lg-refract-panel" map={PANEL_MAP} />
      <ChannelRefraction id="lg-refract-control" map={CONTROL_MAP} control />
      <ChannelRefraction id="lg-refract-bar" map={BAR_MAP} control />
    </defs>
  </svg>
}

export default LiquidGlassDefs
