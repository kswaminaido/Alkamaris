import { useEffect, useRef, useState } from 'react'

const WEEKDAY_LABELS = ['Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa', 'Su']
const MONTH_LABELS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const MONTH_FORMATTER = new Intl.DateTimeFormat(undefined, { month: 'long' })
const COREUI_LOCALE = 'en-US'
const DEFAULT_COREUI_START_DATE = '2000/01/01'

function DateFilterInput({ id, value, onChange, disabled = false }) {
  const rootRef = useRef(null)
  const selectedDate = parseDateInputValue(value)
  const [isOpen, setIsOpen] = useState(false)
  const [viewMode, setViewMode] = useState('days')
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
    setViewMode('days')
    setIsOpen(true)
  }

  function moveMonth(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear(), current.getMonth() + offset, 1))
  }

  function moveYear(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear() + offset, current.getMonth(), 1))
  }

  function moveYearPage(offset) {
    setVisibleMonth((current) => new Date(current.getFullYear() + offset * 12, current.getMonth(), 1))
  }

  function selectMonth(monthIndex) {
    setVisibleMonth((current) => new Date(current.getFullYear(), monthIndex, 1))
    setViewMode('days')
  }

  function selectYear(year) {
    setVisibleMonth((current) => new Date(year, current.getMonth(), 1))
    setViewMode('months')
  }

  function selectDate(date) {
    onChange(formatDateInputValue(date))
    setIsOpen(false)
  }

  const calendarDays = buildCalendarDays(visibleMonth)
  const visibleYear = visibleMonth.getFullYear()
  const yearOptions = buildYearOptions(visibleYear)

  return (
    <div className="date-filter-input d-flex justify-content-center" ref={rootRef}>
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
        <div
          className="date-filter-calendar border rounded"
          data-coreui-locale={COREUI_LOCALE}
          data-coreui-start-date={selectedDate ? formatCoreUiDateValue(selectedDate) : DEFAULT_COREUI_START_DATE}
          data-coreui-toggle="calendar"
          role="dialog"
          aria-label="Choose date"
        >
          <div className="date-filter-calendar-header">
            <button type="button" onClick={() => (viewMode === 'years' ? moveYearPage(-1) : moveYear(-1))} aria-label="Previous year">
              &laquo;
            </button>
            <button type="button" onClick={() => moveMonth(-1)} aria-label="Previous month">
              &lsaquo;
            </button>
            <div className="date-filter-heading">
              <button type="button" onClick={() => setViewMode(viewMode === 'months' ? 'days' : 'months')}>
                {viewMode === 'years' ? `${yearOptions[0]} - ${yearOptions[yearOptions.length - 1]}` : MONTH_FORMATTER.format(visibleMonth)}
              </button>
              {viewMode !== 'years' ? (
                <button type="button" onClick={() => setViewMode('years')}>
                  {visibleYear}
                </button>
              ) : null}
            </div>
            <button type="button" onClick={() => moveMonth(1)} aria-label="Next month">
              &rsaquo;
            </button>
            <button type="button" onClick={() => (viewMode === 'years' ? moveYearPage(1) : moveYear(1))} aria-label="Next year">
              &raquo;
            </button>
          </div>
          {viewMode === 'days' ? (
            <>
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
            </>
          ) : null}
          {viewMode === 'months' ? (
            <div className="date-filter-picker-grid">
              {MONTH_LABELS.map((month, index) => (
                <button
                  key={month}
                  type="button"
                  className={index === visibleMonth.getMonth() ? 'is-selected' : ''}
                  onClick={() => selectMonth(index)}
                >
                  {month}
                </button>
              ))}
            </div>
          ) : null}
          {viewMode === 'years' ? (
            <div className="date-filter-picker-grid">
              {yearOptions.map((year) => (
                <button
                  key={year}
                  type="button"
                  className={year === visibleYear ? 'is-selected' : ''}
                  onClick={() => selectYear(year)}
                >
                  {year}
                </button>
              ))}
            </div>
          ) : null}
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

function formatCoreUiDateValue(date) {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}/${month}/${day}`
}

function buildCalendarDays(monthDate) {
  const firstDay = startOfMonth(monthDate)
  const startDate = new Date(firstDay)
  const mondayFirstOffset = (firstDay.getDay() + 6) % 7
  startDate.setDate(firstDay.getDate() - mondayFirstOffset)

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate)
    date.setDate(startDate.getDate() + index)
    return date
  })
}

function buildYearOptions(year) {
  const startYear = year - (year % 12)
  return Array.from({ length: 12 }, (_, index) => startYear + index)
}

export default DateFilterInput
