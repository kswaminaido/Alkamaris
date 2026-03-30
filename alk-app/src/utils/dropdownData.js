export const DROPDOWN_FIELD_GROUPS = [
  {
    key: 'transaction',
    title: 'Transaction Details',
    fields: [
      { key: 'transaction.category', label: 'Category', source: 'config', type: 'transaction_category', fallback: ['Food Grade', 'Feed Grade', 'Industrial'], pages: ['New Booking'] },
      { key: 'transaction.type', label: 'Type', source: 'config', type: 'transaction_type', fallback: ['Trade', 'Service', 'Commission'], pages: ['New Booking'] },
      { key: 'transaction.country', label: 'Country', source: 'countries', fallback: [] },
      { key: 'transaction.product_origin', label: 'Product Origin', source: 'countries', fallback: ['India (Singapore)'] },
      { key: 'transaction.destination', label: 'Destination', source: 'countries', fallback: [] },
      { key: 'transaction.certified', label: 'Certified', source: 'config', type: 'transaction_certified', fallback: ['Yes', 'No'], pages: ['New Booking'] },
    ],
  },
  {
    key: 'general_customer',
    title: 'General Info - Customer',
    fields: [
      { key: 'general_info_customer.customer', label: 'Customer', source: 'users', role: 'customer', fallback: [], pages: ['New Booking'] },
      { key: 'general_info_customer.attention', label: 'Attn', source: 'config', type: 'customer_attention', fallback: ['Accounts', 'Purchase', 'Logistics'], pages: ['New Booking'] },
      { key: 'general_info_customer.ship_to', label: 'Ship To', source: 'config', type: 'customer_ship_to', fallback: ['Main Warehouse', 'Port Facility', 'Client Yard'], pages: ['New Booking'] },
      { key: 'general_info_customer.buyer', label: 'Buyer', source: 'config', type: 'customer_buyer', fallback: ['Buyer A', 'Buyer B', 'Buyer C'], pages: ['New Booking'] },
      { key: 'general_info_customer.end_customer', label: 'End Customer', source: 'config', type: 'customer_end_customer', fallback: ['Retail Group', 'Wholesale Group', 'Distributor X'], pages: ['New Booking'] },
      { key: 'general_info_customer.prices_customer_type', label: 'Prices Customer Type', source: 'config', type: 'customer_price_type', fallback: ['USD/MT', 'INR/MT', 'SGD/MT'], pages: ['New Booking'] },
      { key: 'general_info_customer.payment_customer_type', label: 'Payment Customer Type', source: 'config', type: 'customer_payment_type', fallback: ['LC', 'TT', 'CAD'], pages: ['New Booking'] },
      { key: 'general_info_customer.payment_customer_term', label: 'Payment Customer Term', source: 'config', type: 'customer_payment_term', fallback: ['Advance', '30 Days', '60 Days'], pages: ['New Booking'] },
      { key: 'general_info_customer.tolerance', label: 'Tolerance', source: 'config', type: 'transaction_tolerance', fallback: ['+/- 1%', '+/- 2%', '+/- 5%'], pages: ['New Booking'] },
    ],
  },
  {
    key: 'general_packer',
    title: 'General Info - Packer',
    fields: [
      { key: 'general_info_packer.vendor', label: 'Vendor', source: 'users', role: 'vendor', fallback: [], pages: ['New Booking'] },
      { key: 'general_info_packer.packer_name', label: 'Packer Name', source: 'config', type: 'packer_name', fallback: ['Packer One', 'Packer Two', 'Packer Three'], pages: ['New Booking'] },
      { key: 'general_info_packer.packed_by', label: 'Packed By', source: 'config', type: 'packer_packed_by', fallback: ['Factory', 'Third Party', 'Vendor'], pages: ['New Booking'] },
      { key: 'general_info_packer.prices_packer_type', label: 'Prices Packer Type', source: 'config', type: 'packer_price_type', fallback: ['USD/MT', 'INR/MT', 'SGD/MT'], pages: ['New Booking'] },
      { key: 'general_info_packer.payment_packer_type', label: 'Payment Packer Type', source: 'config', type: 'packer_payment_type', fallback: ['LC', 'TT', 'CAD'], pages: ['New Booking'] },
      { key: 'general_info_packer.payment_packer_term', label: 'Payment Packer Term', source: 'config', type: 'packer_payment_term', fallback: ['Advance', '30 Days', '60 Days'], pages: ['New Booking'] },
      { key: 'general_info_packer.tolerance', label: 'Tolerance', source: 'config', type: 'transaction_tolerance', fallback: ['+/- 1%', '+/- 2%', '+/- 5%'], pages: ['New Booking'] },
      { key: 'general_info_packer.consignee', label: 'Consignee', source: 'config', type: 'packer_consignee', fallback: ['Consignee A', 'Consignee B', 'Consignee C'], pages: ['New Booking'] },
    ],
  },
  {
    key: 'revenue',
    title: 'Revenue',
    fields: [
      { key: 'revenue_customer.total_selling_currency', label: 'Total Selling Currency', source: 'config', type: 'transaction_currency', fallback: ['USD', 'INR', 'SGD', 'EUR'], pages: ['New Booking'] },
      { key: 'revenue_customer.amount_currency', label: 'Customer Amount Currency', source: 'config', type: 'transaction_currency', fallback: ['USD', 'INR', 'SGD', 'EUR'], pages: ['New Booking'] },
      { key: 'revenue_packer.total_buying_currency', label: 'Total Buying Currency', source: 'config', type: 'transaction_currency', fallback: ['USD', 'INR', 'SGD', 'EUR'], pages: ['New Booking'] },
      { key: 'revenue_packer.amount_currency', label: 'Packer Amount Currency', source: 'config', type: 'transaction_currency', fallback: ['USD', 'INR', 'SGD', 'EUR'], pages: ['New Booking'] },
    ],
  },
]

export function buildConfigMap(configs) {
  return Object.fromEntries(
    (Array.isArray(configs) ? configs : [])
      .filter((config) => typeof config?.type === 'string')
      .map((config) => [config.type, config]),
  )
}

export function normalizeOptions(options) {
  return [...new Set(
    (Array.isArray(options) ? options : [])
      .filter((option) => typeof option === 'string')
      .map((option) => option.trim())
      .filter(Boolean),
  )]
}

export function getFieldOptions(field, resources) {
  if (field.source === 'config') {
    return normalizeOptions(resources.configMap?.[field.type]?.data ?? field.fallback)
  }

  if (field.source === 'users') {
    return normalizeOptions(resources?.usersByRole?.[field.role] ?? field.fallback)
  }

  if (field.source === 'countries') {
    const countries = normalizeOptions(resources.countries)
    if (field.key === 'transaction.product_origin') {
      return normalizeOptions([...field.fallback, ...countries])
    }
    return countries.length ? countries : normalizeOptions(field.fallback)
  }

  return normalizeOptions(field.fallback)
}
