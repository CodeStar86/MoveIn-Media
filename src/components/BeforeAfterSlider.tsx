import { useRef, useState, useCallback } from 'react'

interface Props {
  beforeSrc: string
  afterSrc: string
  beforeLabel?: string
  afterLabel?: string
  height?: string
}

export default function BeforeAfterSlider({ beforeSrc, afterSrc, beforeLabel = 'Before', afterLabel = 'After', height = '480px' }: Props) {
  const [position, setPosition] = useState(50)
  const dragging = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)

  const getPosition = useCallback((clientX: number) => {
    const rect = containerRef.current?.getBoundingClientRect()
    if (!rect) return
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width))
    setPosition((x / rect.width) * 100)
  }, [])

  const onMouseMove = useCallback((e: React.MouseEvent) => {
    if (!dragging.current) return
    getPosition(e.clientX)
  }, [getPosition])

  const onTouchMove = useCallback((e: React.TouchEvent) => {
    getPosition(e.touches[0].clientX)
  }, [getPosition])

  return (
    <div
      ref={containerRef}
      className="ba-slider select-none"
      style={{ height, borderRadius: 'var(--radius)' }}
      onMouseDown={() => { dragging.current = true }}
      onMouseUp={() => { dragging.current = false }}
      onMouseLeave={() => { dragging.current = false }}
      onMouseMove={onMouseMove}
      onTouchMove={onTouchMove}
    >
      {/* Before image */}
      <img src={beforeSrc} alt={beforeLabel} className="ba-slider-before" draggable={false} />

      {/* After image clipped */}
      <div
        className="absolute inset-0 overflow-hidden"
        style={{ clipPath: `inset(0 ${100 - position}% 0 0)` }}
      >
        <img src={afterSrc} alt={afterLabel} className="ba-slider-before" draggable={false} />
      </div>

      {/* Labels */}
      <div className="absolute top-4 left-4 text-xs tracking-widest uppercase font-500 px-3 py-1" style={{ background: 'rgba(12,28,46,0.8)', color: 'white', opacity: position > 10 ? 1 : 0, transition: 'opacity 0.2s' }}>
        {beforeLabel}
      </div>
      <div className="absolute top-4 right-4 text-xs tracking-widest uppercase font-500 px-3 py-1" style={{ background: 'rgba(201,162,86,0.9)', color: '#0c1c2e', opacity: position < 90 ? 1 : 0, transition: 'opacity 0.2s' }}>
        {afterLabel}
      </div>

      {/* Handle */}
      <div
        className="ba-handle"
        style={{ left: `calc(${position}% - 1px)` }}
      >
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-10 rounded-full bg-white shadow-lg flex items-center justify-center z-20" style={{ boxShadow: '0 2px 16px rgba(0,0,0,0.25)' }}>
          <svg width="20" height="14" viewBox="0 0 20 14" fill="none">
            <path d="M6 1L1 7L6 13M14 1L19 7L14 13" stroke="#0c1c2e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
