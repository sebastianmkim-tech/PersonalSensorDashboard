import { useState } from "react"

type PowerToggleProps = {
  power: boolean
  onChange: (nextPower: boolean) => Promise<boolean>
}

export function PowerToggle({ power, onChange }: PowerToggleProps) {
  const [hasError, setHasError] = useState(false)

  async function handleToggle() {
    setHasError(false)
    const succeeded = await onChange(!power)
    setHasError(!succeeded)
  }

  return (
    <div>
      <div className="control-row">
        <div className="control-copy">
          <span className="t-label">LED 전원</span>
          <span className="power-state t-caption">
            {power ? "켜짐" : "꺼짐"}
          </span>
        </div>
        <button
          className="switch-button"
          type="button"
          role="switch"
          aria-checked={power}
          aria-label="LED 전원"
          onClick={handleToggle}
        >
          <span className={`switch-track${power ? " switch-track-on" : ""}`}>
            <span className="switch-thumb" />
          </span>
        </button>
      </div>
      {hasError && (
        <p className="power-error t-caption">전원 변경 실패, 다시 시도</p>
      )}
    </div>
  )
}
