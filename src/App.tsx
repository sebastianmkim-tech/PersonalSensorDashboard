import { createClient } from "@supabase/supabase-js"
import { useEffect, useRef, useState } from "react"

interface SensorReading {
  id: string
  sensor_value: number
  led_on: boolean | null
  created_at: string
}

type SupabaseStatus = "not-configured" | "connecting" | "connected" | "disconnected"

interface SerialPort {
  open(options: { baudRate: number }): Promise<void>
  close(): Promise<void>
  readable: ReadableStream<Uint8Array> | null
}

interface WebSerial {
  requestPort(): Promise<SerialPort>
}

type ConnectionStatus = "disconnected" | "connecting" | "connected" | "disconnecting"

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY
const supabase =
  supabaseUrl && supabaseAnonKey
    ? createClient(supabaseUrl, supabaseAnonKey)
    : null

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : "Unknown serial error."
}

function parseSupabaseReading(value: unknown): SensorReading | null {
  if (typeof value !== "object" || value === null) return null

  const row = value as Record<string, unknown>
  if (
    (typeof row.id !== "number" && typeof row.id !== "string") ||
    (typeof row.id === "number" && !Number.isSafeInteger(row.id)) ||
    typeof row.value !== "number" ||
    !Number.isFinite(row.value) ||
    typeof row.created_at !== "string" ||
    !Number.isFinite(Date.parse(row.created_at))
  ) {
    return null
  }

  return {
    id: `supabase-${row.id}`,
    sensor_value: row.value,
    led_on: null,
    created_at: row.created_at,
  }
}

function mergeReadings(
  current: SensorReading[],
  incoming: SensorReading[],
): SensorReading[] {
  const byId = new Map(current.map((reading) => [reading.id, reading]))
  incoming.forEach((reading) => byId.set(reading.id, reading))

  return [...byId.values()]
    .sort(
      (first, second) =>
        Date.parse(first.created_at) - Date.parse(second.created_at),
    )
    .slice(-100)
}

function parseSensorLine(
  line: string,
): Omit<SensorReading, "id" | "created_at"> | null {
  const match =
    /^(?:SENSOR(?:\s+VALUE)?\s*:\s*)?(\d+)(?:\s*,?\s*LED\s*:\s*(ON|OFF))?$/i.exec(
      line.trim(),
    )
  if (!match) return null

  const sensorValue = Number(match[1])
  if (!Number.isSafeInteger(sensorValue)) return null

  return {
    sensor_value: sensorValue,
    led_on: match[2] ? match[2].toUpperCase() === "ON" : null,
  }
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

function Chart({ readings }: { readings: SensorReading[] }) {
  const width = 1000
  const height = 300
  const padX = 18
  const top = 20
  const bottom = 25
  const values = readings.map((reading) => reading.sensor_value)
  const min = 0
  const max = Math.max(1100, Math.ceil(Math.max(...values, 0) / 100) * 100)
  const yTicks = [0, 1, 2, 3, 4].map((index) => (max * index) / 4)

  const points = values.map((value, index) => ({
    x:
      values.length === 1
        ? width / 2
        : padX + (index * (width - padX * 2)) / (values.length - 1),
    y: top + ((max - value) / (max - min)) * (height - top - bottom),
  }))

  const path = points
    .map((point, index) => `${index === 0 ? "M" : "L"} ${point.x} ${point.y}`)
    .join(" ")
  const areaPath =
    points.length > 0
      ? `${path} L ${points.at(-1)?.x} ${height - bottom} L ${points[0].x} ${height - bottom} Z`
      : ""

  return (
    <div className="mt-8">
      <div className="relative h-[280px] w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          preserveAspectRatio="none"
          className="h-full w-full overflow-visible"
          role="img"
          aria-label="Latest 100 live flex sensor readings"
        >
          <defs>
            <linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#7069f1" stopOpacity=".22" />
              <stop offset="100%" stopColor="#7069f1" stopOpacity="0" />
            </linearGradient>
          </defs>
          {yTicks.map((tick) => {
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
          {points.length > 0 && (
            <>
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
                <circle
                  key={readings[index].id}
                  cx={point.x}
                  cy={point.y}
                  r={index === points.length - 1 ? 7 : 3}
                  fill="white"
                  stroke="#625be7"
                  strokeWidth={index === points.length - 1 ? 4 : 2}
                  vectorEffect="non-scaling-stroke"
                />
              ))}
            </>
          )}
        </svg>
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex translate-y-5 justify-between text-[11px] font-medium text-[#8d8c98] sm:text-xs">
          <span>
            {readings[0]
              ? new Date(readings[0].created_at).toLocaleTimeString()
              : "Oldest"}
          </span>
          <span>
            {readings.at(-1)
              ? new Date(readings.at(-1)!.created_at).toLocaleTimeString()
              : "Latest"}
          </span>
        </div>
        {readings.length === 0 && (
          <p className="pointer-events-none absolute inset-0 grid place-items-center text-sm text-[#9b99a2]">
            Waiting for live sensor readings
          </p>
        )}
      </div>
    </div>
  )
}

export default function App() {
  const [readings, setReadings] = useState<SensorReading[]>([])
  const [connectionStatus, setConnectionStatus] =
    useState<ConnectionStatus>("disconnected")
  const [connectionError, setConnectionError] = useState<string | null>(null)
  const [supabaseStatus, setSupabaseStatus] =
    useState<SupabaseStatus>("connecting")
  const [supabaseError, setSupabaseError] = useState<string | null>(null)
  const [lastSerialLine, setLastSerialLine] = useState("")
  const [lastLineWasReading, setLastLineWasReading] = useState(false)
  const portRef = useRef<SerialPort | null>(null)
  const readerRef = useRef<ReadableStreamDefaultReader<Uint8Array> | null>(null)
  const disconnectRequested = useRef(false)

  function saveReading(reading: SensorReading) {
    if (!supabase) {
      setConnectionError(
        "Supabase is not configured; this reading was not saved.",
      )
      return
    }
    const client = supabase

    void (async () => {
      try {
        const { data, error } = await client
          .from("readings")
          .insert({ value: reading.sensor_value })
          .select("id, value, created_at")
          .single()
        if (error) throw error

        const savedReading = parseSupabaseReading(data)
        if (!savedReading) {
          throw new Error("Supabase returned an invalid saved reading.")
        }

        setReadings((current) =>
          mergeReadings(
            current.filter((item) => item.id !== reading.id),
            [savedReading],
          ),
        )
        setConnectionError(null)
      } catch (error) {
        setConnectionError(
          `Could not save reading to Supabase: ${errorMessage(error)}`,
        )
      }
    })()
  }

  function handleSerialLine(line: string) {
    const trimmedLine = line.trim()
    if (!trimmedLine) return
    setLastSerialLine(trimmedLine.slice(0, 160))

    const reading = parseSensorLine(trimmedLine)
    setLastLineWasReading(reading !== null)
    if (!reading) return
    const localReading: SensorReading = {
      id: `arduino-${Date.now()}-${Math.random()}`,
      ...reading,
      created_at: new Date().toISOString(),
    }
    setReadings((current) => mergeReadings(current, [localReading]))
    saveReading(localReading)
    setConnectionError(null)
  }

  useEffect(() => {
    if (!supabase) {
      setSupabaseStatus("not-configured")
      setSupabaseError(
        "Supabase configuration is missing. Set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in PersonalSensorDashboard/.env.",
      )
      return
    }

    const client = supabase
    let active = true
    setSupabaseStatus("connecting")
    setSupabaseError(null)

    const channel = client
      .channel("sensor-readings-live")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "readings",
        },
        (payload) => {
          const reading = parseSupabaseReading(payload.new)
          if (!reading) {
            setSupabaseError(
              "Supabase sent a sensor reading in an invalid format.",
            )
            return
          }
          setSupabaseError(null)
          setReadings((current) => {
            const alreadyShown = current.some(
              (item) =>
                item.sensor_value === reading.sensor_value &&
                item.led_on === reading.led_on &&
                Math.abs(
                  Date.parse(item.created_at) - Date.parse(reading.created_at),
                ) < 5000,
            )
            return alreadyShown ? current : mergeReadings(current, [reading])
          })
        },
      )
      .subscribe((status, error) => {
        if (!active) return
        if (status === "SUBSCRIBED") {
          setSupabaseStatus("connected")
        } else if (
          status === "CHANNEL_ERROR" ||
          status === "TIMED_OUT" ||
          status === "CLOSED"
        ) {
          setSupabaseStatus("disconnected")
          setSupabaseError(
            error?.message ?? `Supabase Realtime ${status.toLowerCase()}.`,
          )
        }
      })

    async function loadRecentReadings() {
      const { data, error } = await client
        .from("readings")
        .select("id, value, created_at")
        .order("created_at", { ascending: false })
        .limit(100)

      if (!active) return
      if (error) {
        setSupabaseStatus("disconnected")
        setSupabaseError(
          error.code === "PGRST205" ||
            error.message.includes("public.readings")
            ? "The readings table is missing. Run PersonalSensorDashboard/supabase/schema.sql in the Supabase SQL Editor, then refresh."
            : `Could not load Supabase readings: ${error.message}`,
        )
        return
      }

      const parsed = (data ?? []).map(parseSupabaseReading)
      if (parsed.some((reading) => reading === null)) {
        setSupabaseError("Supabase returned readings in an invalid format.")
        return
      }
      setReadings((current) =>
        mergeReadings(
          current,
          parsed.filter(
            (reading): reading is SensorReading => reading !== null,
          ),
        ),
      )
    }

    void loadRecentReadings()

    return () => {
      active = false
      void client.removeChannel(channel)
    }
  }, [])

  async function readSerialPort(
    port: SerialPort,
    reader: ReadableStreamDefaultReader<Uint8Array>,
  ) {
    const decoder = new TextDecoder()
    let pending = ""

    try {
      while (true) {
        const { value, done } = await reader.read()
        if (done) break

        pending += decoder.decode(value, { stream: true })
        const lines = pending.split(/\r\n|\n|\r/)
        pending = lines.pop() ?? ""
        lines.forEach(handleSerialLine)
      }

      pending += decoder.decode()
      if (pending.trim()) handleSerialLine(pending)
      if (!disconnectRequested.current) {
        setConnectionError("The Arduino serial connection ended.")
      }
    } catch (error) {
      if (!disconnectRequested.current) {
        setConnectionError(`Serial connection failed: ${errorMessage(error)}`)
      }
    } finally {
      if (readerRef.current === reader) readerRef.current = null
      if (portRef.current === port) portRef.current = null
      try {
        reader.releaseLock()
      } catch (error) {
        setConnectionError(
          `Could not release the serial reader: ${errorMessage(error)}`,
        )
      }
      try {
        await port.close()
      } catch (error) {
        setConnectionError(
          `Could not close the serial port: ${errorMessage(error)}`,
        )
      }
      disconnectRequested.current = false
      setConnectionStatus("disconnected")
    }
  }

  async function connectArduino() {
    const serial = (navigator as Navigator & { serial?: WebSerial }).serial
    if (!serial) {
      setConnectionError(
        "Web Serial is unavailable. Use Chrome or Edge over HTTPS or localhost.",
      )
      return
    }

    setConnectionStatus("connecting")
    setConnectionError(null)
    setLastSerialLine("")
    setLastLineWasReading(false)
    let port: SerialPort | null = null
    let portOpened = false
    try {
      port = await serial.requestPort()
      await port.open({ baudRate: 9600 })
      portOpened = true
      if (!port.readable) {
        throw new Error("The selected serial port cannot be read.")
      }

      const reader = port.readable.getReader()
      portRef.current = port
      readerRef.current = reader
      disconnectRequested.current = false
      setConnectionStatus("connected")
      void readSerialPort(port, reader)
    } catch (error) {
      if (port && portOpened && portRef.current !== port) {
        try {
          await port.close()
        } catch (closeError) {
          setConnectionError(
            `Could not close the serial port: ${errorMessage(closeError)}`,
          )
        }
      }
      setConnectionStatus("disconnected")
      if (error instanceof DOMException && error.name === "AbortError") return
      setConnectionError(`Could not connect to Arduino: ${errorMessage(error)}`)
    }
  }

  async function disconnectArduino() {
    const reader = readerRef.current
    if (!reader) return

    disconnectRequested.current = true
    setConnectionStatus("disconnecting")
    try {
      await reader.cancel()
    } catch (error) {
      setConnectionError(
        `Could not stop the serial reader: ${errorMessage(error)}`,
      )
    }
  }

  useEffect(
    () => () => {
      const reader = readerRef.current
      if (reader) {
        void reader
          .cancel()
          .catch((error: unknown) =>
            console.error("Could not stop the Arduino serial reader.", error),
          )
      }
    },
    [],
  )

  const currentReading = readings.at(-1)
  const average = currentReading
    ? Math.round(
        readings.reduce((sum, reading) => sum + reading.sensor_value, 0) /
          readings.length,
      )
    : null
  const highest = currentReading
    ? Math.max(...readings.map((reading) => reading.sensor_value))
    : null
  const ledIndicator =
    currentReading === undefined
      ? {
          text: "Waiting for data",
          color: "bg-[#b7b4c0]",
        }
      : currentReading.led_on === null
        ? { text: "LED state unavailable", color: "bg-[#b7b4c0]" }
        : currentReading.led_on
          ? { text: "LED ON", color: "bg-[#35b777]" }
          : { text: "LED OFF", color: "bg-[#e16a71]" }

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
              <p className="text-xs text-[#8b8995]">Flex sensor dashboard</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#e7e6eb] bg-white px-3.5 py-2 text-xs font-medium text-[#65636f] shadow-sm sm:gap-2.5">
            <span
              className={`h-2 w-2 rounded-full ${
                connectionStatus === "connected"
                  ? "bg-[#35b777] shadow-[0_0_0_4px_rgba(53,183,119,.12)]"
                  : connectionStatus === "connecting" ||
                      connectionStatus === "disconnecting"
                    ? "bg-[#e6a43b]"
                    : "bg-[#b7b4c0]"
              }`}
            />
            {connectionStatus === "connected"
              ? readings.length > 0
                ? "Arduino connected"
                : "Port open · waiting for data"
              : connectionStatus === "connecting"
                ? "Connecting"
                : connectionStatus === "disconnecting"
                  ? "Disconnecting"
                  : "Arduino disconnected"}
          </div>
          <div className="flex items-center gap-2 rounded-full border border-[#e7e6eb] bg-white px-3.5 py-2 text-xs font-medium text-[#65636f] shadow-sm sm:gap-2.5">
            <span
              className={`h-2 w-2 rounded-full ${
                supabaseStatus === "connected"
                  ? "bg-[#35b777]"
                  : supabaseStatus === "connecting"
                    ? "bg-[#e6a43b]"
                    : "bg-[#b7b4c0]"
              }`}
            />
            {supabaseStatus === "connected"
              ? "Supabase live"
              : supabaseStatus === "connecting"
                ? "Connecting to Supabase"
                : supabaseStatus === "not-configured"
                  ? "Supabase not configured"
                  : "Supabase disconnected"}
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
              Flex Sensor
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
            {currentReading
              ? `Updated ${new Date(currentReading.created_at).toLocaleTimeString()}`
              : "Waiting for first reading"}
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
                  Current sensor reading
                </span>
              </div>
              <div className="flex items-end gap-3">
                <span className="text-[82px] font-medium leading-[0.8] tracking-[-0.075em] sm:text-[112px]">
                  {currentReading?.sensor_value ?? "--"}
                </span>
                <span className="pb-1 text-lg font-medium text-white/45 sm:pb-2">
                  ADC
                </span>
              </div>
            </div>
            <div className="max-w-[330px] border-t border-white/10 pt-6 md:border-l md:border-t-0 md:pb-1 md:pl-9 md:pt-0">
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span
                  className={`h-2.5 w-2.5 rounded-full ${ledIndicator.color}`}
                  aria-hidden="true"
                />
                <span
                  className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                    currentReading?.led_on === true
                      ? "bg-[#35b777]/15 text-[#65d49c]"
                      : currentReading?.led_on === false
                        ? "bg-[#e16a71]/15 text-[#ff9298]"
                        : "bg-white/10 text-white/60"
                  }`}
                >
                  {ledIndicator.text}
                </span>
                <span className="text-xs text-white/40">
                  {currentReading?.led_on === null
                    ? "LED state not included in serial output"
                    : "Physical Arduino LED status"}
                </span>
              </div>
              <p className="text-sm leading-6 text-white/55">
                Connect your Arduino to save sensor readings to Supabase and
                stream them to this dashboard.
              </p>
              <button
                type="button"
                onClick={
                  connectionStatus === "connected"
                    ? disconnectArduino
                    : connectArduino
                }
                disabled={
                  connectionStatus === "connecting" ||
                  connectionStatus === "disconnecting"
                }
                className="mt-5 rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-[#302d45] transition hover:bg-[#efedff] disabled:cursor-wait disabled:opacity-60"
              >
                {connectionStatus === "connected"
                  ? "Disconnect Arduino"
                  : connectionStatus === "connecting"
                    ? "Connecting..."
                    : connectionStatus === "disconnecting"
                      ? "Disconnecting..."
                      : "Connect Arduino"}
              </button>
              <p className="mt-3 text-xs leading-5 text-white/40">
                9600 baud · Send a number per line, e.g.{" "}
                <code className="text-white/60">
                  Serial.println(analogRead(A0))
                </code>
              </p>
              <p
                aria-live="polite"
                className="mt-3 break-all font-mono text-xs leading-5 text-white/55"
              >
                {lastSerialLine
                  ? `Serial output: ${lastSerialLine}`
                  : connectionStatus === "connected"
                    ? "Serial output: waiting for Arduino data..."
                    : ""}
              </p>
              {lastSerialLine && !lastLineWasReading && (
                <p className="mt-1 text-xs leading-5 text-[#ffc2a8]">
                  That line was not recognized. Send a number per line or
                  SENSOR: 950, LED: ON.
                </p>
              )}
            </div>
          </div>
        </section>

        <section className="mt-6 rounded-[28px] border border-black/[0.055] bg-white p-6 shadow-[0_12px_40px_rgba(35,34,42,.05)] sm:p-8 lg:p-10">
          <div>
            <h2 className="text-xl font-semibold tracking-[-0.025em]">
              Live reading history
            </h2>
            <p className="mt-1.5 text-sm text-[#888690]">Latest 100 readings</p>
          </div>
          <Chart readings={readings} />
          <div className="mt-10 grid grid-cols-2 gap-4 border-t border-[#efeff2] pt-6 sm:grid-cols-3">
            <div>
              <p className="text-xs font-medium text-[#94929c]">
                Average of latest readings
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {average ?? "--"}{" "}
                {average !== null && (
                  <span className="text-xs font-normal text-[#94929c]">
                    ADC
                  </span>
                )}
              </p>
            </div>
            <div>
              <p className="text-xs font-medium text-[#94929c]">
                Highest in chart
              </p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {highest ?? "--"}{" "}
                {highest !== null && (
                  <span className="text-xs font-normal text-[#94929c]">
                    ADC
                  </span>
                )}
              </p>
            </div>
            <div className="hidden sm:block">
              <p className="text-xs font-medium text-[#94929c]">Data source</p>
              <p className="mt-1 text-lg font-semibold tracking-tight">
                {supabaseStatus === "connected"
                  ? connectionStatus === "connected"
                    ? "Supabase + Arduino"
                    : "Supabase"
                  : connectionStatus === "connected"
                    ? "Arduino serial"
                    : "Not connected"}
              </p>
            </div>
          </div>
        </section>

        {(connectionError || supabaseError) && (
          <div className="mt-5 space-y-2 text-center text-sm text-[#bd3e4a]">
            {connectionError && <p role="alert">{connectionError}</p>}
            {supabaseError && <p role="alert">{supabaseError}</p>}
          </div>
        )}

        <footer className="mt-6 flex items-center justify-center gap-2 text-xs text-[#9b99a2]">
          <span
            className={`h-1.5 w-1.5 rounded-full ${
              currentReading ? "bg-[#35b777]" : "bg-[#b7b4c0]"
            }`}
          />
          {currentReading
            ? "Showing live sensor data."
            : "No live sensor data is available."}
        </footer>
      </div>
    </main>
  )
}
