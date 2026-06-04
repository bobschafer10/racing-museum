"use client"

import Link from "next/link"
import { useEffect, useMemo, useState } from "react"
import type { RaceProgram } from "@/lib/race-programs"

export default function RaceProgramViewer({
  program,
}: {
  program: RaceProgram
}) {
  const pages = useMemo(() => {
    return program.images
      .filter((img) => {
        const lower = img.toLowerCase()
        return !lower.includes("front-cover") && !lower.includes("back-cover")
      })
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  }, [program])

  const [activeIndex, setActiveIndex] = useState<number | null>(null)
  const [zoom, setZoom] = useState(1)

  function openPage(index: number) {
    setActiveIndex(index)
    setZoom(1)
  }

  function closeViewer() {
    setActiveIndex(null)
    setZoom(1)
  }

  function goPrev() {
    setActiveIndex((current) => {
      if (current === null) return current
      return Math.max(current - 1, 0)
    })
    setZoom(1)
  }

  function goNext() {
    setActiveIndex((current) => {
      if (current === null) return current
      return Math.min(current + 1, pages.length - 1)
    })
    setZoom(1)
  }

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (activeIndex === null) return

      if (event.key === "Escape") {
        closeViewer()
      } else if (event.key === "ArrowRight") {
        goNext()
      } else if (event.key === "ArrowLeft") {
        goPrev()
      } else if (event.key === "+" || event.key === "=") {
        setZoom((z) => Math.min(z + 0.2, 4))
      } else if (event.key === "-") {
        setZoom((z) => Math.max(z - 0.2, 1))
      } else if (event.key === "0") {
        setZoom(1)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [activeIndex, pages.length])

  const activeImage = activeIndex !== null ? pages[activeIndex] : null

  const activeLabel =
    activeImage?.match(/\/(\d+)\.(jpg|jpeg|png|webp)$/i)?.[1] ?? null

  const pageLabel = activeLabel
    ? `Pages ${Number(activeLabel)}–${Number(activeLabel) + 1}`
    : "Scanned Spread"

  return (
    <main style={pageWrap}>
      <Link href="/media/race-programs" style={backLink}>
        ← Back to Race Programs
      </Link>

      <section style={heroGrid}>
        <div style={coverCard}>
          {program.coverImage ? (
            <img
              src={program.coverImage}
              alt={program.title}
              style={coverImage}
            />
          ) : (
            <div style={coverPlaceholder}>No cover yet</div>
          )}
        </div>

        <div style={contentCard}>
          <div style={metaChipRow}>
            <span style={metaChip}>{program.year ?? "Unknown Year"}</span>
            <span style={metaChip}>Yearbook / Race Program</span>
          </div>

          <h1 style={{ marginTop: 0, marginBottom: 10, color: "#2f2419" }}>
            {program.title}
          </h1>

          <p style={{ fontSize: 16, lineHeight: 1.7, color: "#554332" }}>
            Archived race program artifact from the museum collection.
          </p>
        </div>
      </section>

      <section style={sectionStyle}>
        <h2 style={sectionTitle}>Scanned Publication</h2>
        <p style={sectionIntro}>
          Click any scanned spread to open the reader.
        </p>

        {pages.length === 0 ? (
          <div style={contentCard}>No scanned pages found yet.</div>
        ) : (
          <div style={grid}>
            {pages.map((img, i) => {
              const label =
                img.match(/\/(\d+)\.(jpg|jpeg|png|webp)$/i)?.[1] ?? `${i + 1}`

              return (
                <button
                  key={img}
                  type="button"
                  style={thumbButton}
                  onClick={() => openPage(i)}
                >
                  <img
                    src={img}
                    alt={`${program.title} spread ${label}`}
                    style={thumbImage}
                  />
                </button>
              )
            })}
          </div>
        )}
      </section>

      {activeIndex !== null && activeImage ? (
        <div style={modalOverlay} onClick={closeViewer}>
          <div style={modalInner} onClick={(e) => e.stopPropagation()}>
            <div style={modalTopBar}>
              <div>
                <div style={modalTitle}>{program.title}</div>
                <div style={modalSub}>
                  {pageLabel} • Spread {activeIndex + 1} of {pages.length} • Zoom{" "}
                  {Math.round(zoom * 100)}%
                </div>
              </div>

              <div style={modalControls}>
                <button
                  type="button"
                  style={controlButton}
                  onClick={() => setZoom((z) => Math.max(z - 0.2, 1))}
                >
                  −
                </button>
                <button
                  type="button"
                  style={controlButton}
                  onClick={() => setZoom((z) => Math.min(z + 0.2, 4))}
                >
                  +
                </button>
                <button
                  type="button"
                  style={controlButton}
                  onClick={() => setZoom(1)}
                >
                  Reset
                </button>
                <button
                  type="button"
                  style={controlButton}
                  onClick={closeViewer}
                >
                  Close
                </button>
              </div>
            </div>

            <div style={helpBar}>
              <div>Arrow keys to move • Esc to close</div>
              <div>{pageLabel}</div>
            </div>

            <div style={stageShell}>
              <button
                type="button"
                style={navLeft}
                onClick={goPrev}
                disabled={activeIndex === 0}
              >
                ← Prev
              </button>

              <div style={singleSpreadWrap}>
                <img
                  src={activeImage}
                  alt={`${program.title} ${pageLabel}`}
                  style={{
                    ...singleSpreadImage,
                    transform: `scale(${zoom})`,
                  }}
                />
              </div>

              <button
                type="button"
                style={navRight}
                onClick={goNext}
                disabled={activeIndex === pages.length - 1}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </main>
  )
}

const pageWrap: React.CSSProperties = {
  maxWidth: 1200,
  margin: "0 auto",
  padding: "30px 20px 80px",
}

const backLink: React.CSSProperties = {
  display: "inline-block",
  marginBottom: 16,
  textDecoration: "none",
  color: "#6c4d22",
  fontWeight: 700,
}

const heroGrid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "340px 1fr",
  gap: 28,
  alignItems: "start",
}

const coverCard: React.CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  padding: 16,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const coverImage: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  borderRadius: 10,
}

const coverPlaceholder: React.CSSProperties = {
  width: "100%",
  aspectRatio: "3 / 4",
  borderRadius: 10,
  background: "#eadcc3",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  color: "#7a6348",
  fontWeight: 700,
}

const contentCard: React.CSSProperties = {
  background: "#f5eddc",
  border: "1px solid rgba(115, 88, 52, 0.22)",
  borderRadius: 16,
  padding: 22,
  boxShadow: "0 8px 24px rgba(60, 40, 20, 0.06)",
}

const metaChipRow: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 10,
  marginBottom: 14,
}

const metaChip: React.CSSProperties = {
  display: "inline-block",
  padding: "6px 10px",
  borderRadius: 999,
  background: "#eadcc3",
  color: "#664f39",
  fontSize: 12,
  fontWeight: 700,
}

const sectionStyle: React.CSSProperties = {
  marginTop: 30,
}

const sectionTitle: React.CSSProperties = {
  fontSize: 28,
  marginBottom: 10,
  color: "#2f2419",
}

const sectionIntro: React.CSSProperties = {
  fontSize: 15,
  color: "#555",
  marginBottom: 20,
}

const grid: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
  gap: 16,
}

const thumbButton: React.CSSProperties = {
  padding: 0,
  border: "none",
  background: "transparent",
  cursor: "zoom-in",
}

const thumbImage: React.CSSProperties = {
  width: "100%",
  height: "auto",
  display: "block",
  border: "1px solid rgba(115, 88, 52, 0.18)",
  borderRadius: 8,
  background: "#fffdf8",
  boxShadow: "0 8px 20px rgba(40, 28, 15, 0.08)",
}

const modalOverlay: React.CSSProperties = {
  position: "fixed",
  inset: 0,
  background: "rgba(12, 8, 4, 0.9)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  padding: 18,
  zIndex: 1000,
}

const modalInner: React.CSSProperties = {
  width: "min(1600px, 98vw)",
  height: "min(94vh, 1100px)",
  display: "grid",
  gridTemplateRows: "auto auto 1fr",
  gap: 12,
}

const modalTopBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  color: "#f7efe1",
  gap: 12,
}

const modalTitle: React.CSSProperties = {
  fontSize: 16,
  fontWeight: 700,
}

const modalSub: React.CSSProperties = {
  fontSize: 13,
  opacity: 0.82,
  marginTop: 2,
}

const modalControls: React.CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
  alignItems: "center",
}

const controlButton: React.CSSProperties = {
  border: "1px solid rgba(255,255,255,0.2)",
  background: "rgba(255,255,255,0.08)",
  color: "#fff",
  borderRadius: 999,
  padding: "10px 14px",
  fontWeight: 700,
  cursor: "pointer",
}

const helpBar: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  alignItems: "center",
  color: "rgba(247,239,225,0.88)",
  fontSize: 13,
}

const stageShell: React.CSSProperties = {
  position: "relative",
  borderRadius: 16,
  overflow: "hidden",
  border: "1px solid rgba(255,255,255,0.08)",
  background: "rgba(0,0,0,0.18)",
  height: "100%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const singleSpreadWrap: React.CSSProperties = {
  maxWidth: "88%",
  maxHeight: "82%",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
}

const singleSpreadImage: React.CSSProperties = {
  maxWidth: "100%",
  maxHeight: "78vh",
  width: "auto",
  height: "auto",
  borderRadius: 8,
  boxShadow: "0 18px 36px rgba(0,0,0,0.28)",
  background: "#fffdf8",
}

const navLeft: React.CSSProperties = {
  position: "absolute",
  left: 16,
  padding: "12px 16px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(15, 10, 5, 0.55)",
  color: "#fff",
  borderRadius: 999,
  cursor: "pointer",
}

const navRight: React.CSSProperties = {
  position: "absolute",
  right: 16,
  padding: "12px 16px",
  border: "1px solid rgba(255,255,255,0.16)",
  background: "rgba(15, 10, 5, 0.55)",
  color: "#fff",
  borderRadius: 999,
  cursor: "pointer",
}