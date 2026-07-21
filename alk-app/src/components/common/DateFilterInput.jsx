import { useEffect, useRef, useState } from 'react'

const WEEKDAY_LABELS = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa']
const MONTH_YEAR_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' })

function DateFilterInput({ id, value, onChange, disabled = false }) {
  const rootRef = useRef(null)
  const selectedDate = parseDateInputValue(value)
  const [isOpen, setIsOpen] = useState(false)
  const [visibleMonth, setVisibleMonth] = useState(() => startOfMonth(selectedDate ?? new Date()))

  useEffect(() => {
    if (!isOpen) return

    function handleDocumentMouseDown(event) {
      if (!rootRef.current?.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleDocumentMouseDown)
    return () => document.removeEventListener('mousedown', handleDocumentMouseDown)
  }, [isOpen])

  function openCalendar() {
    if (disabled) return
    setVisibleMonth(startOfMonth(selectedDate ?? new Date()))
    setIsOpen(true)
  }

  function moveMonth(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function selectDate(date) {
    onChange(formatDateInputValue(date))
    setIsOpen(false)
  }

  const calendarDays = buildCalendarDays(visibleMonth)

  return (
    <div className="date-filter-input" ref={rootRef}>
      <button
        id={id}
        type="button"
        className={`date-filter-trigger${value ? '' : ' is-empty'}`}
        onClick={openCalendar}
        aria-haspopup="dialog"
        aria-expanded={isOpen}
        disabled={disabled}
      >
        <span>{value || 'yyyy-mm-dd'}</span>
      </button>
      {value && !disabled ? (
        <button type="button" className="date-filter-clear" onClick={() => onChange('')} aria-label="Clear date">
          x
        </button>
      ) : null}
      {isOpen ? (
        <div className="date-filter-calendar" role="dialog" aria-label="Choose date">
          <div className="date-filter-calendar-header">
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
              &lt;
            </button>
            <strong>{MONTH_YEAR_FORMATTER.format(visibleMonth)}</strong>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
              &gt;
            </button>
          </div>
          <div className="date-filter-weekdays" aria-hidden="true">
            {WEEKDAY_LABELS.map((label) => (
              <span key={label}>{label}</span>
            ))}
          </div>
          <div className="date-filter-days">
            {calendarDays.map((date) => {
              const dateValue = formatDateInputValue(date)
              const isVisibleMonth = date.getMonth() === visibleMonth.getMonth()
              const isSelected = dateValue === value

              return (
                <button
                  key={dateValue}
                  type="button"
                  className={`${isVisibleMonth ? '' : 'is-muted'}${isSelected ? ' is-selected' : ''}`}
                  onClick={() => selectDate(date)}
                >
                  {date.getDate()}
                </button>
              )
            })}
          </div>
        </div>
      ) : null}
    </div>
  )
}

function parseDateInputValue(value) {
  if (!value) return null

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return null

  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
  return Number.isNaN(date.getTime()) ? null : date
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1)
}

function formatDateInputValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

function buildCalendarDays(monthDate) {
  const firstDay = startOfMonth(monthDate)
  const startDate = new Date(firstDay)
  startDate.setDate(firstDay.getDate() - firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return date
  })
}

export default DateFilterInput
