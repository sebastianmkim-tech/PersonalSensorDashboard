import type { RealtimeChannel } from "@supabase/supabase-js"
import { DEVICE_ID, MAX_POINTS, SENSOR_MAX, SENSOR_MIN } from "../product"
import { db, IS_DEMO_MODE } from "./supabase"

export type Reading = {
  value: number
  created_at: string
}
export type Status = "disconnected" | "connecting" | "connected" | "error"

type ConnectOptions = {
  onInit: (rows: Reading[]) => void
  onReading: (row: Reading) => void
  onStatus: (status: Status) => void
}

let channel: RealtimeChannel | null = null
let demoTimer: ReturnType<typeof setInterval> | null = null
let demoPower = false

function demoReading(step: number): Reading {
  const midpoint = (SENSOR_MAX + SENSOR_MIN) / 2
  const amplitude = (SENSOR_MAX - SENSOR_MIN) * 0.42

  return {
    value: Math.round(midpoint + Math.sin(step / 7) * amplitude),
    created_at: new Date().toISOString(),
  }
}

export async function connectSensor({
  onInit,
  onReading,
  onStatus,
}: ConnectOptions): Promise<void> {
  onStatus("connecting")

  if (IS_DEMO_MODE || !db) {
    onInit([])
    let step = 0
    onStatus("connected")
    demoTimer = setInterval(() => {
      onReading(demoReading(step))
      step += 1
    }, 500)
    return
  }

  try {
    const { data, error } = await db
      .from("sensor_readings")
      .select("value, created_at")
      .eq("device_id", DEVICE_ID)
      .order("created_at", { ascending: false })
      .limit(MAX_POINTS)

    if (error) throw error
    onInit((data as Reading[]).reverse())

    channel = db
      .channel(`sensor-readings-${DEVICE_ID}`)
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "sensor_readings",
          filter: `device_id=eq.${DEVICE_ID}`,
        },
        (payload) => onReading(payload.new as Reading),
      )
      .subscribe((subscriptionStatus) => {
        if (subscriptionStatus === "SUBSCRIBED") onStatus("connected")
        if (
          subscriptionStatus === "CHANNEL_ERROR" ||
          subscriptionStatus === "TIMED_OUT"
        ) {
          onStatus("error")
        }
      })
  } catch {
    onStatus("error")
  }
}

export async function disconnectSensor(): Promise<void> {
  if (demoTimer) {
    clearInterval(demoTimer)
    demoTimer = null
  }

  if (channel && db) {
    await db.removeChannel(channel)
    channel = null
  }
}

export async function setLedPower(on: boolean): Promise<boolean> {
  if (IS_DEMO_MODE || !db) {
    demoPower = on
    return true
  }

  const { data, error } = await db
    .from("device_state")
    .update({ led_on: on })
    .eq("device_id", DEVICE_ID)
    .select("led_on")
    .maybeSingle()

  return !error && data?.led_on === on
}

export async function loadPower(): Promise<boolean> {
  if (IS_DEMO_MODE || !db) return demoPower

  const { data, error } = await db
    .from("device_state")
    .select("led_on")
    .eq("device_id", DEVICE_ID)
    .maybeSingle()

  return error ? false : Boolean(data?.led_on)
}
