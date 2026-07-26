const DEFAULT_MAX_VISIBLE_PAGES = 3
const DEFAULT_PAGE_SIZE_OPTIONS = [50, 100]

function PaginationBar({
  currentPage = 1,
  lastPage = 1,
  totalRecords = 0,
  onPageChange,
  pageSize,
  onPageSizeChange,
  disabled = false,
  className = '',
  maxVisiblePages = DEFAULT_MAX_VISIBLE_PAGES,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}) {
  const safeLastPage = Math.max(1, Number(lastPage) || 1)
  const safeCurrentPage = Math.min(Math.max(1, Number(currentPage) || 1), safeLastPage)
  const safeTotalRecords = Math.max(0, Number(totalRecords) || 0)
  const safePageSizeOptions = pageSizeOptions
    .map((option) => Number(option))
    .filter((option) => Number.isFinite(option) && option > 0)
  const safePageSize = safePageSizeOptions.includes(Number(pageSize))
    ? Number(pageSize)
    : safePageSizeOptions[0]
  const canChangePage = typeof onPageChange === 'function' && !disabled
  const canChangePageSize = typeof onPageSizeChange === 'function' && !disabled
  const canGoPrevious = safeCurrentPage > 1
  const canGoNext = safeCurrentPage < safeLastPage
  const pageNumbers = getVisiblePageNumbers(safeCurrentPage, safeLastPage, maxVisiblePages)

  function goToPage(targetPage) {
    if (!canChangePage) return
    const nextPage = Math.min(Math.max(1, targetPage), safeLastPage)
    if (nextPage !== safeCurrentPage) {
      onPageChange(nextPage)
    }
  }

  return (
    <div className={`compact-pagination${className ? ` ${className}` : ''}`}>
      <div className="compact-pagination-controls" aria-label="Table pagination">
        <button type="button" onClick={() => goToPage(1)} disabled={!canChangePage || !canGoPrevious} aria-label="First page">
          {'<<'}
        </button>
        <button type="button" onClick={() => goToPage(safeCurrentPage - 1)} disabled={!canChangePage || !canGoPrevious} aria-label="Previous page">
          {'<'}
        </button>
        {pageNumbers.map((pageNumber) => (
          <button
            key={pageNumber}
            type="button"
            className={pageNumber === safeCurrentPage ? 'active' : ''}
            onClick={() => goToPage(pageNumber)}
            disabled={!canChangePage || pageNumber === safeCurrentPage}
            aria-label={`Page ${pageNumber}`}
            aria-current={pageNumber === safeCurrentPage ? 'page' : undefined}
          >
            {pageNumber}
          </button>
        ))}
        <button type="button" onClick={() => goToPage(safeCurrentPage + 1)} disabled={!canChangePage || !canGoNext} aria-label="Next page">
          {'>'}
        </button>
        <button type="button" onClick={() => goToPage(safeLastPage)} disabled={!canChangePage || !canGoNext} aria-label="Last page">
          {'>>'}
        </button>
      </div>
      <div className="compact-pagination-meta">
        {typeof onPageSizeChange === 'function' ? (
          <label className="compact-pagination-size">
            <span>Page Count</span>
            <select
              value={safePageSize}
              onChange={(event) => onPageSizeChange(Number(event.target.value))}
              disabled={!canChangePageSize}
              aria-label="Page Count"
            >
              {safePageSizeOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <div className="compact-pagination-summary">
          Page {safeCurrentPage} of {safeLastPage} ({safeTotalRecords} records)
        </div>
      </div>
    </div>
  )
}

function getVisiblePageNumbers(currentPage, lastPage, maxVisiblePages) {
  const visibleCount = Math.max(1, Math.min(Number(maxVisiblePages) || DEFAULT_MAX_VISIBLE_PAGES, lastPage))
  if (lastPage <= visibleCount) {
    return Array.from({ length: lastPage }, (_, index) => index + 1)
  }

  const halfWindow = Math.floor(visibleCount / 2)
  let start = currentPage - halfWindow
  let end = start + visibleCount - 1

  if (start < 1) {
    start = 1
    end = visibleCount
  }

  if (end > lastPage) {
    end = lastPage
    start = lastPage - visibleCount + 1
  }

  return Array.from({ length: end - start + 1 }, (_, index) => start + index)
}

export default PaginationBar
