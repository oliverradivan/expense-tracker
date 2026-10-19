import { useId } from 'react'

export default function CoinIcon({ size = 20 }) {
  // unique gradient id per icon so several coins on one page don't clash
  const gradId = `coin-spark-${useId().replace(/:/g, '')}`

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 88 88"
      aria-hidden="true"
      focusable="false"
      style={{ flex: 'none' }}
    >
      <defs>
        {/* same yellow-to-red 135deg gradient as --spark */}
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--spark-a, #e0b21f)" />
          <stop offset="100%" stopColor="var(--spark-b, #e04f4f)" />
        </linearGradient>
      </defs>

      {/* face: surface colour with the soft accent tint on top */}
      <circle cx="44" cy="44" r="42.5" style={{ fill: 'var(--surface)' }} />
      <circle cx="44" cy="44" r="42.5" style={{ fill: 'var(--accent-soft)' }} />

      {/* gradient rim */}
      <circle
        cx="44"
        cy="44"
        r="42.5"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="3"
      />

      {/* dashed inner ring */}
      <circle
        cx="44"
        cy="44"
        r="35"
        fill="none"
        stroke="var(--spark-b, #e04f4f)"
        strokeOpacity="0.45"
        strokeWidth="1"
        strokeDasharray="3 3"
      />

      {/* gradient shekel sign, centred on the coin */}
      <text
        x="44"
        y="44"
        textAnchor="middle"
        dominantBaseline="central"
        fontSize="46"
        fill={`url(#${gradId})`}
        fontFamily="'Playfair Display', Georgia, serif"
      >
        ₪
      </text>
    </svg>
  )
}