export function getUserIdentifierLabel(userType) {
  const normalizedUserType = typeof userType === 'string' ? userType.trim().toLowerCase() : ''

  if (normalizedUserType === 'customer') {
    return 'Firm Number'
  }

  if (normalizedUserType === 'sales') {
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
