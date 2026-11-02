import { useEffect, useRef, useState } from 'react'

const DURATION = 480

export default function AnimatedNumber({ value, format = String }) {
  const [displayValue, setDisplayValue] = useState(0)
  const currentValue = useRef(0)

  useEffect(() => {
    const targetValue = Number(value)
    if (!Number.isFinite(targetValue)) return undefined

    let frame
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      frame = window.requestAnimationFrame(() => {
        currentValue.current = targetValue
        setDisplayValue(targetValue)
      })
      return () => window.cancelAnimationFrame(frame)
    }

    const startValue = currentValue.current
    const difference = targetValue - startValue
    if (!difference) return undefined

    let startTime
    const animate = (time) => {
      startTime ??= time
      const progress = Math.min((time - startTime) / DURATION, 1)
      const easedProgress = 1 - (1 - progress) ** 3
      const nextValue = startValue + difference * easedProgress
      currentValue.current = nextValue
      setDisplayValue(progress === 1 ? targetValue : nextValue)
      if (progress < 1) frame = window.requestAnimationFrame(animate)
    }

    frame = window.requestAnimationFrame(animate)
    return () => window.cancelAnimationFrame(frame)
  }, [value])

  return <span>{format(displayValue)}</span>
}
