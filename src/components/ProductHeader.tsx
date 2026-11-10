import { useEffect } from "react"
import { PRODUCT } from "../product"

const placeholders = {
  name: "[제품 이름]",
  concept: "[제품 컨셉, 한 줄]",
  description: "[제품 설명, 2~3문장]",
}

export function ProductHeader({ isDemo }: { isDemo: boolean }) {
  useEffect(() => {
    document.title = PRODUCT.name || placeholders.name
  }, [])

  return (
    <header className="product-header">
      <h1 className={`t-display${PRODUCT.name ? "" : " placeholder"}`}>
        {PRODUCT.name || placeholders.name}
      </h1>
      <p className={`t-label${PRODUCT.concept ? "" : " placeholder"}`}>
        {PRODUCT.concept || placeholders.concept}
      </p>
      <p
        className={`product-description t-body${
          PRODUCT.description ? "" : " placeholder"
        }`}
      >
        {PRODUCT.description || placeholders.description}
      </p>
      {isDemo && <p className="demo-note t-caption">데모 데이터로 표시 중</p>}
    </header>
  )
}
