export function getVisibleUserTypeOptions(options, selectedUserType) {
  const normalizedSelected = typeof selectedUserType === 'string' ? selectedUserType.trim() : ''

  if (!normalizedSelected || options.includes(normalizedSelected)) {
    return options
  }

  return [normalizedSelected, ...options]
}
