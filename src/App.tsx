import { useEffect, useState } from "react"
import { ConnectionControl } from "./components/ConnectionControl"
import { PowerToggle } from "./components/PowerToggle"
import { ProductHeader } from "./components/ProductHeader"
import { SensorChart } from "./components/SensorChart"
import { SensorMoon } from "./components/SensorMoon"
import {
  connectSensor,
  disconnectSensor,
  loadPower,
  setLedPower,
  type Reading,
  type Status,
} from "./lib/device"
import { IS_DEMO_MODE } from "./lib/supabase"
import { MAX_POINTS } from "./product"

export default function App() {
  const [status, setStatus] = useState<Status>("disconnected")
  const [power, setPower] = useState(false)
  const [readings, setReadings] = useState<Reading[]>([])

  useEffect(() => {
    void loadPower().then(setPower)
    return () => {
      void disconnectSensor()
    }
  }, [])

  function handleReading(reading: Reading) {
    setReadings((current) => [...current, reading].slice(-MAX_POINTS))
  }

  function handleConnect() {
    void connectSensor({
      onInit: (rows) => setReadings(rows.slice(-MAX_POINTS)),
      onReading: handleReading,
      onStatus: setStatus,
    })
  }

  function handleDisconnect() {
    void disconnectSensor().then(() => setStatus("disconnected"))
  }

  async function handlePowerChange(nextPower: boolean) {
    const previousPower = power
    setPower(nextPower)
    const succeeded = await setLedPower(nextPower)
    if (!succeeded) setPower(previousPower)
    return succeeded
  }

  return (
    <main className="app-shell">
      <ProductHeader isDemo={IS_DEMO_MODE} />
      <SensorMoon value={readings.at(-1)?.value} power={power} />
      <div className="dashboard-grid">
        <section className="controls" aria-label="조명 제어">
          <ConnectionControl
            status={status}
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
          <PowerToggle power={power} onChange={handlePowerChange} />
        </section>
        <SensorChart readings={readings} />
      </div>
    </main>
  )
}
