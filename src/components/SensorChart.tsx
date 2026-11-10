import { useEffect, useRef, useState } from "react"
import type { Reading } from "../lib/device"
import { SENSOR_MAX } from "../product"

const CHART_HEIGHT = 200
const PADDING = { left: 40, right: 8, top: 8, bottom: 20 }

export function SensorChart({ readings }: { readings: Reading[] }) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [width, setWidth] = useState(320)

  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.max(1, Math.round(entry.contentRect.width)))
    })
    observer.observe(container)
    return () => observer.disconnect()
  }, [])

  const plotWidth = Math.max(1, width - PADDING.left - PADDING.right)
  const plotHeight = CHART_HEIGHT - PADDING.top - PADDING.bottom
  const points = readings.map((reading, index) => {
    const x =
      readings.length === 1
        ? PADDING.left + plotWidth
        : PADDING.left + (index / (readings.length - 1)) * plotWidth
    const y =
      PADDING.top +
      (1 - Math.min(1, Math.max(0, reading.value / SENSOR_MAX))) * plotHeight
    return `${x},${y}`
  })
  const latest = readings.at(-1)?.value
  const ticks = [SENSOR_MAX, Math.round(SENSOR_MAX / 2), 0]

  return (
    <section className="chart-section" aria-label="실시간 센서값">
      <div className="chart-container" ref={containerRef}>
        {readings.length === 0 ? (
          <p className="chart-empty t-body">
            센서를 연결하면 값이 여기에 그려집니다.
          </p>
        ) : (
          <svg
            width={width}
            height={CHART_HEIGHT}
            viewBox={`0 0 ${width} ${CHART_HEIGHT}`}
            role="img"
            aria-label={`센서값 추이, 현재 ${latest?.toLocaleString("ko-KR")}`}
          >
            {ticks.map((tick) => {
              const y = PADDING.top + (1 - tick / SENSOR_MAX) * plotHeight
              return (
                <g key={tick}>
                  <line
                    x1={PADDING.left}
                    x2={width - PADDING.right}
                    y1={y}
                    y2={y}
                    className="chart-grid"
                  />
                  <text
                    x={PADDING.left - PADDING.right}
                    y={y}
                    textAnchor="end"
                    dominantBaseline="middle"
                    className="chart-label"
                  >
                    {tick.toLocaleString("ko-KR")}
                  </text>
                </g>
              )
            })}
            <polyline points={points.join(" ")} className="chart-line" />
            <text
              x={PADDING.left}
              y={CHART_HEIGHT - PADDING.right / 2}
              textAnchor="start"
              className="chart-label"
            >
              −60s
            </text>
            <text
              x={width - PADDING.right}
              y={CHART_HEIGHT - PADDING.right / 2}
              textAnchor="end"
              className="chart-label"
            >
              지금
            </text>
          </svg>
        )}
      </div>
    </section>
  )
}
