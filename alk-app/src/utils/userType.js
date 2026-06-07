import { USER_ROLES, normalizeRole } from './userRoles'

export function getUserIdentifierLabel(userType) {
  const normalizedUserType = normalizeRole(userType)

  if (normalizedUserType === USER_ROLES.CUSTOMER) {
    return 'Firm Number'
  }

  if (normalizedUserType === USER_ROLES.SALES) {
    return 'Factory Approval Number'
  }

  return 'Registration Number'
}

export function getVisibleUserTypeOptions(options, selectedUserType) {
  const normalizedSelected = typeof selectedUserType === 'string' ? selectedUserType.trim() : ''

  if (!normalizedSelected || options.includes(normalizedSelected)) {
    return options
  }

  return [normalizedSelected, ...options]
}
