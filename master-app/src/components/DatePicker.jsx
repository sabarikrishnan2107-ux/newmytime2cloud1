import { useState, useEffect, useRef, useMemo, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import Icon from './Icon'

const POPOVER_W = 280
const POPOVER_H = 330
const GAP = 6

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const WEEKDAYS = ['Mo','Tu','We','Th','Fr','Sa','Su']

function parseISO(s) {
  if (!s) return null
  const m = /^(\d{4})-(\d{1,2})-(\d{1,2})$/.exec(String(s).replace(/\//g, '-'))
  if (!m) return null
  const d = new Date(+m[1], +m[2] - 1, +m[3])
  return isNaN(d) ? null : d
}

function formatISO(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function formatDisplay(d) {
  return `${String(d.getDate()).padStart(2, '0')} ${MONTHS[d.getMonth()].slice(0,3)} ${d.getFullYear()}`
}

function sameDay(a, b) {
  return a && b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
}

function buildMonthGrid(year, month) {
  const first = new Date(year, month, 1)
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const daysInPrev = new Date(year, month, 0).getDate()
  const startWeekday = (first.getDay() + 6) % 7 // Mon-first (0 = Mon)

  const cells = []
  for (let i = startWeekday - 1; i >= 0; i--) {
    cells.push({ day: daysInPrev - i, month: month - 1, year: month === 0 ? year - 1 : year, outside: true })
  }
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({ day: d, month, year, outside: false })
  }
  while (cells.length % 7 !== 0 || cells.length < 42) {
    const last = cells[cells.length - 1]
    const next = new Date(last.year, last.month, last.day + 1)
    cells.push({ day: next.getDate(), month: next.getMonth(), year: next.getFullYear(), outside: true })
    if (cells.length >= 42) break
  }
  return cells
}

export default function DatePicker({
  value,
  onChange,
  placeholder = 'Select date',
  error = false,
  disabled = false,
  min,
  max,
  className = '',
}) {
  const wrapRef = useRef(null)
  const popRef  = useRef(null)
  const [open, setOpen] = useState(false)
  const [view, setView] = useState('days') // 'days' | 'months' | 'years'
  const [pos, setPos] = useState({ top: 0, left: 0 })

  const selected = useMemo(() => parseISO(value), [value])
  const minDate  = useMemo(() => parseISO(min),   [min])
  const maxDate  = useMemo(() => parseISO(max),   [max])

  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const [viewYear, setViewYear]   = useState((selected || today).getFullYear())
  const [viewMonth, setViewMonth] = useState((selected || today).getMonth())

  useEffect(() => {
    if (open) {
      const d = selected || today
      setViewYear(d.getFullYear())
      setViewMonth(d.getMonth())
      setView('days')
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    const onDown = (e) => {
      if (wrapRef.current?.contains(e.target)) return
      if (popRef.current?.contains(e.target)) return
      setOpen(false)
    }
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !wrapRef.current) return
    const compute = () => {
      const r = wrapRef.current.getBoundingClientRect()
      const vw = window.innerWidth
      const vh = window.innerHeight
      let left = r.left
      if (left + POPOVER_W + 8 > vw) left = Math.max(8, vw - POPOVER_W - 8)
      let top = r.bottom + GAP
      if (top + POPOVER_H + 8 > vh && r.top - GAP - POPOVER_H > 8) {
        top = r.top - GAP - POPOVER_H
      }
      setPos({ top, left })
    }
    compute()
    window.addEventListener('resize', compute)
    window.addEventListener('scroll', compute, true)
    return () => {
      window.removeEventListener('resize', compute)
      window.removeEventListener('scroll', compute, true)
    }
  }, [open])

  const cells = useMemo(() => buildMonthGrid(viewYear, viewMonth), [viewYear, viewMonth])

  const isDisabled = (d) => {
    if (minDate && d < minDate) return true
    if (maxDate && d > maxDate) return true
    return false
  }

  const pick = (cell) => {
    const d = new Date(cell.year, cell.month, cell.day)
    if (isDisabled(d)) return
    onChange?.(formatISO(d))
    setOpen(false)
  }

  const shift = (delta) => {
    let y = viewYear, m = viewMonth + delta
    while (m < 0)   { m += 12; y -= 1 }
    while (m > 11)  { m -= 12; y += 1 }
    setViewYear(y); setViewMonth(m)
  }

  const yearRangeStart = Math.floor(viewYear / 12) * 12

  return (
    <div className={`relative ${className}`} ref={wrapRef}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen(o => !o)}
        className={`input w-full flex items-center justify-between gap-2 text-left
          ${error ? 'input-error' : ''}
          ${open ? 'border-accent' : ''}
          ${disabled ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
        `}
      >
        <span className={selected ? 'text-content' : 'text-content-disabled'}>
          {selected ? formatDisplay(selected) : placeholder}
        </span>
        <Icon name="calendar" size={14} className={open ? 'text-accent' : 'text-content-muted'} />
      </button>

      {open && createPortal(
        <div
          ref={popRef}
          style={{ position: 'fixed', top: pos.top, left: pos.left, width: POPOVER_W }}
          className="z-[9999] bg-surface border border-border-2 rounded-md shadow-[0_12px_32px_rgba(0,0,0,.5)] p-3 fade-in"
        >
          {/* Header */}
          <div className="flex items-center justify-between mb-2.5">
            <button
              type="button"
              onClick={() => view === 'days' ? shift(-1) : view === 'months' ? setViewYear(y => y - 1) : setViewYear(y => y - 12)}
              className="w-7 h-7 rounded flex items-center justify-center text-content-muted hover:text-content hover:bg-surface-2 transition-colors"
            >
              <Icon name="chevronLeft" size={14} />
            </button>

            <button
              type="button"
              onClick={() => setView(v => v === 'days' ? 'months' : v === 'months' ? 'years' : 'days')}
              className="px-2 py-1 rounded text-base font-semibold text-content hover:bg-surface-2 transition-colors"
            >
              {view === 'days'   && `${MONTHS[viewMonth]} ${viewYear}`}
              {view === 'months' && `${viewYear}`}
              {view === 'years'  && `${yearRangeStart} – ${yearRangeStart + 11}`}
            </button>

            <button
              type="button"
              onClick={() => view === 'days' ? shift(1) : view === 'months' ? setViewYear(y => y + 1) : setViewYear(y => y + 12)}
              className="w-7 h-7 rounded flex items-center justify-center text-content-muted hover:text-content hover:bg-surface-2 transition-colors"
            >
              <Icon name="chevronRight" size={14} />
            </button>
          </div>

          {/* Days view */}
          {view === 'days' && (
            <>
              <div className="grid grid-cols-7 gap-0.5 mb-1">
                {WEEKDAYS.map(d => (
                  <div key={d} className="text-[10.5px] font-semibold text-content-muted text-center py-1 uppercase tracking-wider">
                    {d}
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-0.5">
                {cells.map((c, i) => {
                  const d = new Date(c.year, c.month, c.day)
                  const isToday    = sameDay(d, today)
                  const isSelected = sameDay(d, selected)
                  const disabledDay = isDisabled(d)
                  return (
                    <button
                      key={i}
                      type="button"
                      disabled={disabledDay}
                      onClick={() => pick(c)}
                      className={`h-8 rounded text-sm font-medium transition-colors
                        ${c.outside ? 'text-content-disabled' : 'text-content-secondary'}
                        ${isSelected ? 'bg-accent text-white hover:bg-accent-hover' : ''}
                        ${!isSelected && !disabledDay ? 'hover:bg-surface-2' : ''}
                        ${isToday && !isSelected ? 'text-accent font-bold' : ''}
                        ${disabledDay ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}
                      `}
                    >
                      {c.day}
                    </button>
                  )
                })}
              </div>
            </>
          )}

          {/* Months view */}
          {view === 'months' && (
            <div className="grid grid-cols-3 gap-1.5">
              {MONTHS.map((m, i) => {
                const isCurrent = selected && selected.getFullYear() === viewYear && selected.getMonth() === i
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => { setViewMonth(i); setView('days') }}
                    className={`h-10 rounded text-sm font-medium transition-colors
                      ${isCurrent ? 'bg-accent text-white' : 'text-content-secondary hover:bg-surface-2'}
                    `}
                  >
                    {m.slice(0, 3)}
                  </button>
                )
              })}
            </div>
          )}

          {/* Years view */}
          {view === 'years' && (
            <div className="grid grid-cols-3 gap-1.5">
              {Array.from({ length: 12 }).map((_, i) => {
                const y = yearRangeStart + i
                const isCurrent = selected && selected.getFullYear() === y
                return (
                  <button
                    key={y}
                    type="button"
                    onClick={() => { setViewYear(y); setView('months') }}
                    className={`h-10 rounded text-sm font-medium transition-colors
                      ${isCurrent ? 'bg-accent text-white' : 'text-content-secondary hover:bg-surface-2'}
                    `}
                  >
                    {y}
                  </button>
                )
              })}
            </div>
          )}

          {/* Footer actions */}
          <div className="flex items-center justify-between mt-3 pt-2.5 border-t border-border">
            <button
              type="button"
              onClick={() => { onChange?.(formatISO(today)); setOpen(false) }}
              className="text-xs font-semibold text-accent hover:text-accent-hover transition-colors px-1"
            >
              Today
            </button>
            {value && (
              <button
                type="button"
                onClick={() => { onChange?.(''); setOpen(false) }}
                className="text-xs font-semibold text-content-muted hover:text-error transition-colors px-1"
              >
                Clear
              </button>
            )}
          </div>
        </div>,
        document.body
      )}
    </div>
  )
}
