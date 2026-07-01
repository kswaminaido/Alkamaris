import PackerSalesReportPage from './PackerSalesReportPage'

function PaymentStatusReportPage() {
  return (
    <PackerSalesReportPage
      title="Payment Status"
      heading="Reports > Payment Status"
      forcedStatus="D"
      showSummaryCards={false}
      showStatusFilter={false}
      loadingText="Loading paid records, please wait..."
      emptyText="No paid records found."
      exportFilePrefix="payment-status"
      errorLabel="payment status"
    />
  )
}

export default PaymentStatusReportPage
