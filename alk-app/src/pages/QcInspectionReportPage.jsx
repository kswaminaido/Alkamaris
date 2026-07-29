import PackerSalesReportPage from './PackerSalesReportPage'

function QcInspectionReportPage() {
  return (
    <PackerSalesReportPage
      title="QC Inspection Status"
      heading="Transactions > QC Inspection Status"
      showSummaryCards={false}
      showStatusFilter={false}
      loadingText="Loading QC inspection records, please wait..."
      emptyText="No transactions with QC inspection dates found."
      exportFilePrefix="qc-inspection-status"
      errorLabel="QC inspection status"
      filterByQcInspectionDate
      showQcInspectionColumn
      qcInspectionColumnLabel="QC Data"
      allowedRoles={['admin', 'accounts', 'logistics']}
    />
  )
}

export default QcInspectionReportPage
