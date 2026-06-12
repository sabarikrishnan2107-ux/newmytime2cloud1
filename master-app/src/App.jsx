import { Routes, Route, Navigate } from 'react-router-dom'
import MainLayout from './layouts/MainLayout'
import Login from './pages/Login'
import Dashboard from './pages/Dashboard'
import CompaniesList from './pages/companies/CompaniesList'
import CompanyCreate from './pages/companies/CompanyCreate'
import CompanyEdit from './pages/companies/CompanyEdit'
import PaymentsList from './pages/payments/PaymentsList'
import PaymentCreate from './pages/payments/PaymentCreate'
import InvoicesList from './pages/invoices/InvoicesList'
import InvoiceDetail from './pages/invoices/InvoiceDetail'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />

      <Route element={<MainLayout title="Dashboard" />}>
        <Route path="/dashboard" element={<Dashboard />} />
      </Route>

      <Route element={<MainLayout title="Companies" />}>
        <Route path="/companies" element={<CompaniesList />} />
        <Route path="/companies/create" element={<CompanyCreate />} />
        <Route path="/companies/:id" element={<CompanyEdit />} />
      </Route>

      <Route element={<MainLayout title="Payments" />}>
        <Route path="/payments" element={<PaymentsList />} />
        <Route path="/payments/create" element={<PaymentCreate />} />
      </Route>

      <Route element={<MainLayout title="Invoices" />}>
        <Route path="/invoices" element={<InvoicesList />} />
        <Route path="/invoices/:id" element={<InvoiceDetail />} />
      </Route>

      <Route path="/" element={<Navigate to="/dashboard" replace />} />
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  )
}
