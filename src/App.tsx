import { useMemo, useState } from "react"

type Range = "24H" | "7D" | "30D"

const datasets: Record<Range, { labels: string[] values: number[] }> = {
  "24H": {
    labels: ["12 AM", "4 AM", "8 AM", "12 PM", "4 PM", "8 PM", "Now"],
    values: [61, 59, 63, 68, 66, 72, 74],
  },
  "7D": {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    values: [64, 68, 62, 71, 69, 76, 74],
  },
  "30D": {
    labels: ["May 1", "May 6", "May 11", "May 16", "May 21", "May 26", "Today"],
    values: [58, 63, 67, 65, 72, 69, 74],
  },
}

const Chart = ({ range }: { range: Range }) => {
  const { labels, values } = datasets[range]
  const width = 1000
  const height = 300
  const padX = 18
  const top = 20
  const bottom = 25
  const min = 50
  const max = 80

  const points = useMemo(
    () =>
      values.map((value, index) => ({
        x: padX + (index * (width - padX * 2)) / (values.length - 1),
        y: top + ((max - value) / (max - min)) * (height - top - bottom),
      })),
    [values],
  )

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const areaPath = `${path} L ${points.at(-1)?.x} ${height - bottom} L ${points[0].x} ${height - bottom} Z`

  return (
    <div className="mt-8">
      <div className="relative h-[280px] w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label={`Sensor readings over the last ${range.toLowerCase()}`}
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7069f1" stopOpacity=".22" />
              <stop offset="100%" stopColor="#7069f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          {[50, 60, 70, 80].map((tick) => {
            const y =
              top + ((max - tick) / (max - min)) * (height - top - bottom)
            return (
              <line
                key={tick}
                x1="0"
                y1={y}
                x2={width}
                y2={y}
                stroke="#e8e8ee"
                strokeWidth="1"
                vectorEffect="non-scaling-stroke"
              />
            )
          })}
          <path d={areaPath} fill="url(#chart-fill)" />
          <path
            d={path}
            fill="none"
            stroke="#625be7"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
          {points.map((point, index) => (
            <g key={labels[index]}>
              <circle
                cx={point.x}
                cy={point.y}
                r={index === points.length - 1 ? 7 : 4}
                fill="white"
                stroke="#625be7"
                strokeWidth={index === points.length - 1 ? 4 : 3}
                vectorEffect="non-scaling-stroke"
              />
            </g>
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-5 justify-between text-[11px] font-medium text-[#8d8c98] sm:text-xs">
          {labels.map((label) => (
            <span key={label}>{label}</span>
          ))}
        </div>
      </div>
    </div>
  )
}

function SensorIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className="h-5 w-5">
      <path
        d="M8.6 15.4a4.8 4.8 0 0 1 0-6.8M5.8 18.2a8.8 8.8 0 0 1 0-12.4M15.4 8.6a4.8 4.8 0 0 1 0 6.8M18.2 5.8a8.8 8.8 0 0 1 0 12.4"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <circle cx="12" cy="12" r="2.1" fill="currentColor" />
    </svg>
  )
}

export default function App() {
  const [range, setRange] = useState<Range>("24H")
  const currentValue = datasets[range].values.at(-1) ?? 0
  const average = Math.round(
    datasets[range].values.reduce((sum, value) => sum + value, 0) /
      datasets[range].values.length,
  )

  return (
    <main className="min-h-screen bg-[#f5f5f7] text-[#202027]">
      <header className="border-b border-black/[0.06] bg-white/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1240px] items-center justify-between px-5 py-5 sm:px-8 lg:px-10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-[#625be7] text-white shadow-[0_6px_18px_rgba(98,91,231,.28)]">
              <SensorIcon />
            </div>
            <div>
              <p className="text-[15px] font-semibold tracking-[-0.02em]">
                Personal Monitor
              </p>
              <p className="text-xs text-[#8b8995]">Sensor dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2.5 rounded-full border border-[#e7e6eb] bg-white px-3.5 py-2 text-xs font-medium text-[#65636f] shadow-sm">
            <span className="h-2 w-2 rounded-full bg-[#35b777] shadow-[0_0_0_4px_rgba(53,183,119,.12)]" />
            Connected
          </div>
        </div>
      </header>

      <div className="mx-auto max-w-[1240px] px-5 py-10 sm:px-8 sm:py-12 lg:px-10">
        <div className="mb-8 flex flex-col justify-between gap-3 sm:flex-row sm:items-end">
          <div>
            <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-[#777480]">
              Overview
            </p>
            <h1 className="text-3xl font-semibold tracking-[-0.04em] sm:text-[38px]">
              Sensor 00
            </h1>
          </div>
          <p className="flex items-center gap-2 text-sm text-[#85838d]">
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                d="M10 5v5l3.2 1.9M17.2 10a7.2 7.2 0 1 1-14.4 0 7.2 7.2 0 0 1 14.4 0Z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
              />
            </svg>
            Updated just now
          </p>
        </div>

        <section className="relative overflow-hidden rounded-[28px] bg-[#24232b] p-7 text-white shadow-[0_24px_60px_rgba(35,34,42,.15)] sm:p-10 lg:p-12">
          <div className="absolute -right-20 -top-32 h-80 w-80 rounded-full bg-[#756df4] opacity-20 blur-3xl" />
          <div className="absolute -bottom-32 right-[20%] h-72 w-72 rounded-full bg-[#b4afff] opacity-10 blur-3xl" />
          <div className="relative flex flex-col justify-between gap-12 md:flex-row md:items-end">
            <div>
              <div className="mb-8 flex items-center gap-3">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-[#aaa5ff]">
                  <SensorIcon />
                </div>
                <span className="text-sm font-medium text-white/65">
                  Current reading
                </span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[82px] font-medium leading-[0.8] tracking-[-0.075em] sm:text-[112px]">
                  {currentValue}
                </span>
                <span className="pb-1 text-lg font-medium text-white/45 sm:pb-2">
                  units
                </span>
              </div>
            </div>
            <div className="max-w-[330px] border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pb-1 md:pl-9 md:pt-0">
              <div className="mb-3 flex items-center gap-2">
                <span className="rounded-full bg-[#35b777]/15 px-2.5 py-1 text-xs font-semibold text-[#65d49c]">
                  Normal
                </span>
                <span className="text-xs text-white/40">
                  within typical range
                </span>
              </div>
              <p className="text-sm leading-6 text-white/55">
                Your sensor is reporting a stable value. No significant changes
                detected in the last hour.
              </p>
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-black/[0.055] bg-white p-6 shadow-[0_12px_40px_rgba(35,34,42,.05)] sm:p-8 lg:p-10">
          <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h2 className="text-xl font-semibold tracking-[-0.025em]">
                Reading history
              </h2>
              <p className="mt-1.5 text-sm text-[#888690]">
                Sensor values over time
              </p>
            </div>
            <div
              className="flex w-fit rounded-xl bg-[#f1f1f4] p-1"
              aria-label="Chart time range"
            >
              {(["24H", "7D", "30D"] as Range[]).map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => setRange(option)}
                  className={`rounded-lg px-4 py-2 text-xs font-semibold transition ${
                    range === option
                      ? "bg-white text-[#35333e] shadow-sm"
                      : "text-[#8d8b95] hover:text-[#4d4b55]"
                  }`}
                  aria-pressed={range === option}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
          <Chart range={range} />
          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-[#efeff2] pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-[#94929c]">Average</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {average}{" "}
                <span className="text-xs font-normal text-[#94929c]">
                  units
                </span>
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#94929c]">Highest</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {Math.max(...datasets[range].values)}{" "}
                <span className="text-xs font-normal text-[#94929c]">
                  units
                </span>
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-[#94929c]">Data source</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                Sensor 00
              </p>
            </div>
          </div>
        </section>

        <footer className="mt-6 flex items-center justify-center gap-2 text-xs text-[#9b99a2]">
          <span className="h-1.5 w-1.5 rounded-full bg-[#b7b4c0]" />
          Displaying sample data
        </footer>
      </div>
    </main>
  )
}
