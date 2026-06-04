"use client"

import { useEffect, useState } from "react"
import Image from "next/image"
import type { CSSProperties } from "react"

type NewspaperPage = {
  label: string
  image: string
}

export default function NewspaperPageViewer({
  pages,
}: {
  pages: NewspaperPage[]
}) {
  const [openPageIndex, setOpenPageIndex] = useState<number | null>(null)

  const closeViewer = () => setOpenPageIndex(null)

  const goPrev = () => {
    if (openPageIndex === null) return
    setOpenPageIndex(openPageIndex === 0 ? pages.length - 1 : openPageIndex - 1)
  }

  const goNext = () => {
    if (openPageIndex === null) return
    setOpenPageIndex(openPageIndex === pages.length - 1 ? 0 : openPageIndex + 1)
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (openPageIndex === null) return

      if (event.key === "Escape") closeViewer()
      if (event.key === "ArrowLeft") goPrev()
      if (event.key === "ArrowRight") goNext()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [openPageIndex])

  return (
    <>
      <div style={pageGrid}>
        {pages.map((page, index) => (
          <button
            key={`${page.label}-${page.image}`}
            type="button"
            style={pageCardButton}
            onClick={() => setOpenPageIndex(index)}
            aria-label={`Open ${page.label}`}
          >
            <div style={pageImageWrap}>
              <Image
  src={page.image}
  alt={page.label}
  width={260}
  height={360}
  style={pageImage}
  unoptimized
/>
            </div>

            <div style={pageLabel}>{page.label}</div>
          </button>
        ))}
      </div>

      {openPageIndex !== null && (
        <div style={viewerOverlay} onClick={closeViewer}>
          <button
            type="button"
            style={viewerClose}
            onClick={(event) => {
              event.stopPropagation()
              closeViewer()
            }}
            aria-label="Close page viewer"
          >
            ×
          </button>

          {pages.length > 1 && (
            <button
              type="button"
              style={{ ...viewerArrow, ...viewerArrowLeft }}
              onClick={(event) => {
                event.stopPropagation()
                goPrev()
              }}
              aria-label="Previous page"
            >
              ‹
            </button>
          )}

          <div style={viewerImageShell} onClick={(event) => event.stopPropagation()}>
            <div style={viewerPageLabel}>{pages[openPageIndex].label}</div>

            <Image
  src={pages[openPageIndex].image}
  alt={pages[openPageIndex].label}
  width={1100}
  height={1500}
  style={viewerImage}
  priority
  unoptimized
/>
          </div>

          {pages.length > 1 && (
            <button
              type="button"
              style={{ ...viewerArrow, ...viewerArrowRight }}
              onClick={(event) => {
                event.stopPropagation()
                goNext()
              }}
              aria-label="Next page"
            >
              ›
            </button>
          )}
        </div>
      )}
    </>
  )
}

const pageGrid: CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(5, minmax(0, 1fr))",
  gap: "16px",
}

const pageCardButton: CSSProperties = {
  background: "#f1e5ce",
  border: "1px solid #c2a97d",
  padding: "10px",
  cursor: "pointer",
  fontFamily: "Georgia, serif",
  textAlign: "inherit",
}

const pageImageWrap: CSSProperties = {
  marginBottom: "10px",
}

const pageImage: CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  border: "1px solid #b29364",
  background: "#efe7d6",
}

const pageLabel: CSSProperties = {
  fontSize: "16px",
  fontWeight: 700,
  textAlign: "center",
  color: "#34271c",
}

const viewerOverlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 9999,
  background: "rgba(31, 24, 16, 0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: "28px",
}

const viewerImageShell: CSSProperties = {
  maxWidth: "88vw",
  maxHeight: "92vh",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
}

const viewerPageLabel: CSSProperties = {
  color: "#fff8ea",
  fontSize: "18px",
  fontWeight: 700,
  marginBottom: "10px",
  textShadow: "0 1px 2px rgba(0,0,0,0.55)",
}

const viewerImage: CSSProperties = {
  width: "auto",
  maxWidth: "88vw",
  height: "auto",
  maxHeight: "86vh",
  objectFit: "contain",
  background: "#f8f1e3",
  border: "2px solid #c2a97d",
  boxShadow: "0 18px 45px rgba(0,0,0,0.55)",
}

const viewerClose: CSSProperties = {
  position: "fixed",
  top: "18px",
  right: "28px",
  width: "48px",
  height: "48px",
  borderRadius: "999px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.14)",
  color: "#fff8ea",
  fontSize: "34px",
  lineHeight: "42px",
  cursor: "pointer",
}

const viewerArrow: CSSProperties = {
  position: "fixed",
  top: "50%",
  transform: "translateY(-50%)",
  width: "64px",
  height: "92px",
  border: "1px solid rgba(255,255,255,0.45)",
  background: "rgba(255,255,255,0.14)",
  color: "#fff8ea",
  fontSize: "72px",
  lineHeight: "72px",
  cursor: "pointer",
}

const viewerArrowLeft: CSSProperties = {
  left: "24px",
}

const viewerArrowRight: CSSProperties = {
  right: "24px",
}