const USER_PAGE_SIZE = 100
const SALES_PERSON_ROLE_VALUES = ['sales']

export async function fetchAllUsers(authFetch, params = {}) {
  const users = []
  const searchParams = new URLSearchParams({
    ...params,
    per_page: String(USER_PAGE_SIZE),
  })

  let page = 1
  let lastPage = 1

  do {
    searchParams.set('page', String(page))

    const response = await authFetch(`/users?${searchParams.toString()}`)
    const payload = await response.json()

    if (!response.ok || !Array.isArray(payload?.data)) return null

    users.push(...payload.data)
    lastPage = Number(payload?.pagination?.last_page) || page
    page += 1
  } while (page <= lastPage)

  return users
}

export async function fetchSalesPersonOptions(authFetch, currentUser = null) {
  try {
    const users = await fetchAllUsers(authFetch, { roles: SALES_PERSON_ROLE_VALUES.join(',') })
    return extractSalesPersonOptions(users, currentUser)
  } catch {
    return extractSalesPersonOptions([], currentUser)
  }
}

export function extractSalesPersonOptions(users, currentUser = null) {
  const userMap = new Map()
  const fallbackUsers = SALES_PERSON_ROLE_VALUES.includes(currentUser?.role) ? [currentUser] : []

  for (const user of [...fallbackUsers, ...(Array.isArray(users) ? users : [])]) {
    if (!user?.id) continue
    const label = [user.name, user.email].find((value) => typeof value === 'string' && value.trim()) ?? `User #${user.id}`
    userMap.set(String(user.id), {
      id: String(user.id),
      label,
    })
  }

  return [...userMap.values()]
}
