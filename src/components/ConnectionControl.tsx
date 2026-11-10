import type { Status } from "../lib/device"

const statusCopy: Record<Status, string> = {
  disconnected: "연결 안 됨",
  connecting: "연결 중…",
  connected: "연결됨",
  error: "연결 실패, 다시 시도",
}

type ConnectionControlProps = {
  status: Status
  onConnect: () => void
  onDisconnect: () => void
}

export function ConnectionControl({
  status,
  onConnect,
  onDisconnect,
}: ConnectionControlProps) {
  const isConnected = status === "connected"
  const isConnecting = status === "connecting"

  return (
    <div className="control-row">
      <div className="control-copy">
        <span className="t-label">센서</span>
        <span className={`status status-${status} t-label`} role="status">
          <span className="status-dot" aria-hidden="true" />
          {statusCopy[status]}
        </span>
      </div>
      <button
        className={`connection-button t-label ${
          isConnected ? "connection-button-disconnect" : ""
        }`}
        type="button"
        disabled={isConnecting}
        onClick={isConnected ? onDisconnect : onConnect}
      >
        {isConnected ? "연결 끊기" : "센서 연결"}
      </button>
    </div>
  )
}
