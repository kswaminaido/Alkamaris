export function toDateInputValue(value) {
  const text = normalizeText(value)
  if (!text) return ''

  const isoDate = text.match(/^(\d{4})-(\d{2})-(\d{2})(?:[T\s].*)?$/)
  if (isoDate) return `${isoDate[1]}-${isoDate[2]}-${isoDate[3]}`

  const slashDate = text.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (slashDate) {
    return [
      slashDate[3],
      slashDate[2].padStart(2, '0'),
      slashDate[1].padStart(2, '0'),
    ].join('-')
  }

  const date = new Date(`${text}T00:00:00`)
  if (Number.isNaN(date.getTime())) return ''

  return [
    date.getFullYear(),
    String(date.getMonth() + 1).padStart(2, '0'),
    String(date.getDate()).padStart(2, '0'),
  ].join('-')
}

export function formatDateForDisplay(value, emptyValue = '-') {
  const inputDate = toDateInputValue(value)
  if (!inputDate) return value ? String(value) : emptyValue

  const [yyyy, mm, dd] = inputDate.split('-')
  return `${dd}/${mm}/${yyyy}`
}

function normalizeText(value) {
  if (value === null || value === undefined) return null
  const text = String(value).trim()
  return text === '' ? null : text
}
