import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.css'
import RequireAuth from './components/routing/RequireAuth'
import { AuthProvider } from './context/AuthContext'
import MasterData from './pages/master/index'
import DashboardPage from './pages/DashboardPage'
import DataPage from './pages/DataPage'
import LoginPage from './pages/LoginPage'
import ModulePlaceholderPage from './pages/ModulePlaceholderPage'
import SignupPage from './pages/SignupPage'
import TransactionCreatePage from './pages/TransactionCreatePage'
import TransactionsPage from './pages/TransactionsPage'

function App() {
  console.log('App rendered')
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="/signup" element={<SignupPage />} />
          <Route
            path="/dashboard"
            element={
              <RequireAuth>
                <DashboardPage />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/new"
            element={
              <RequireAuth>
                <TransactionCreatePage />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions"
            element={
              <RequireAuth>
                <TransactionsPage />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/specs"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Specs" />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/special-notes"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Special Notes" />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/qc-inspection"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="QC Inspection Date" />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/payment-request"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Payment Request" />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/payment-request-list"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Payment Request List" />
              </RequireAuth>
            }
          />
          <Route
            path="/transactions/overdue-invoice"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Overdue Invoice" />
              </RequireAuth>
            }
          />
          <Route
            path="/master"
            element={
              <RequireAuth>
                <MasterData />
              </RequireAuth>
            }
          />
          <Route
            path="/data"
            element={
              <RequireAuth>
                <DataPage />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/summary"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Summary Report" />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/vendor-sales"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Vendor Sales" />
              </RequireAuth>
            }
          />
          <Route
            path="/reports/payment-status"
            element={
              <RequireAuth>
                <ModulePlaceholderPage title="Payment Status" />
              </RequireAuth>
            }
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  )
}

export default App
