export default function LGDefs() {
  return <svg className="lg-defs" aria-hidden="true" focusable="false">
    <defs>
      <filter id="lg-liquid-warp" x="-12%" y="-12%" width="124%" height="124%" colorInterpolationFilters="sRGB">
        <feTurbulence type="fractalNoise" baseFrequency="0.018 0.035" numOctaves="2" seed="8" result="texture" />
        <feDisplacementMap in="SourceGraphic" in2="texture" scale="3" xChannelSelector="R" yChannelSelector="G" />
      </filter>
      <linearGradient id="lg-glass-sheen" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0" stopColor="white" stopOpacity=".64" />
        <stop offset=".42" stopColor="white" stopOpacity=".08" />
        <stop offset="1" stopColor="white" stopOpacity=".2" />
      </linearGradient>
    </defs>
  </svg>
}
