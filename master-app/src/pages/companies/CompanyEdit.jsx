import { useState, useEffect, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import Toast from '../../components/Toast'
import DatePicker from '../../components/DatePicker'
import { useToast } from '../../hooks/useToast'
import PaymentRow from '../payments/PaymentRow'
import InvoiceEmailModal from '../invoices/InvoiceEmailModal'

const TABS = [
  { id: 'info',     label: 'Company Info',   icon: 'companies' },
  { id: 'license',  label: 'Trade License',  icon: 'log' },
  { id: 'contact',  label: 'Contact Person', icon: 'users' },
  { id: 'geo',      label: 'Geographic',     icon: 'pin' },
  { id: 'security', label: 'Security',       icon: 'lock' },
  // { id: 'payments', label: 'Payments',       icon: 'payment' },
  // { id: 'whatsapp', label: 'WhatsApp',       icon: 'whatsapp' },
  // { id: 'modules',  label: 'Modules',        icon: 'module' },
]

const SECTION_META = {
  info:     { icon: 'companies', title: 'Company Information', subtitle: 'Basic details and account limits' },
  license:  { icon: 'log',       title: 'Trade License',       subtitle: 'Legal registration and expiry' },
  contact:  { icon: 'users',     title: 'Contact Person',      subtitle: 'Primary point of contact' },
  geo:      { icon: 'pin',       title: 'Geographic Location', subtitle: 'Coordinates and address' },
  security: { icon: 'lock',      title: 'Security',            subtitle: 'Login password for the company user' },
  payments: { icon: 'payment',   title: 'Payment History',     subtitle: 'All payments recorded for this company' },
  whatsapp: { icon: 'whatsapp',  title: 'WhatsApp Settings',   subtitle: 'Notification and OTP configuration' },
  modules:  { icon: 'module',    title: 'Modules',             subtitle: 'Enable or disable optional modules' },
}

function SectionHeader({ tab }) {
  const meta = SECTION_META[tab]
  if (!meta) return null
  return (
    <div className="section-header">
      <div className="section-header-icon"><Icon name={meta.icon} size={18} /></div>
      <div>
        <div className="section-header-title">{meta.title}</div>
        <div className="section-header-sub">{meta.subtitle}</div>
      </div>
    </div>
  )
}

function Toggle({ value, onChange, label }) {
  return (
    <label className="flex items-center gap-3 cursor-pointer">
      <div
        onClick={() => onChange(!value)}
        className={`w-[42px] h-6 rounded-xl relative transition-colors duration-200 shrink-0 ${value ? 'bg-success' : 'bg-border-2'}`}
      >
        <div className={`absolute top-[3px] w-[18px] h-[18px] rounded-full bg-white transition-all duration-200 shadow-[0_1px_4px_rgba(0,0,0,.3)] ${value ? 'left-[21px]' : 'left-[3px]'}`} />
      </div>
      <span className="text-base text-content-secondary">{label}</span>
    </label>
  )
}

function TabContent({ tab, state, setState, onSave, loading, notifySuccess, notifyError }) {
  const FE = ({ field }) => state.errors?.[field]
    ? <span className="field-error">{Array.isArray(state.errors[field]) ? state.errors[field][0] : state.errors[field]}</span>
    : null

  if (tab === 'info') {
    const { company, user, logoPreview } = state
    const fileRef = useRef(null)
    return (
      <div>
        <SectionHeader tab={tab} />
        <div className="flex gap-6 mb-6">
          {/* Logo */}
          <div>
            <div
              onClick={() => fileRef.current?.click()}
              className="w-[90px] h-[90px] rounded-xl cursor-pointer border-2 border-dashed border-border-2 overflow-hidden flex items-center justify-center bg-surface-2 hover:border-accent transition-colors duration-150"
            >
              {(logoPreview || company.logo)
                ? <img src={logoPreview || company.logo} alt="logo" className="w-full h-full object-cover" />
                : <Icon name="upload" size={22} color="#8b949e" />
              }
            </div>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={e => {
              const file = e.target.files[0]
              if (!file) return
              setState(s => ({ ...s, logoFile: file }))
              const reader = new FileReader()
              reader.onload = ev => setState(s => ({ ...s, logoPreview: ev.target.result }))
              reader.readAsDataURL(file)
            }} />
          </div>

          <div className="grid-2 flex-1">
            {[
              { label: 'Company Code', key: 'company_code', obj: 'company' },
              { label: 'Company Name *', key: 'name', obj: 'company' },
              { label: 'Email', key: 'email', obj: 'user' },
              { label: 'MOL ID', key: 'mol_id', obj: 'company' },
              { label: 'P.O Box', key: 'p_o_box_no', obj: 'company' },
              { label: 'Member From', key: 'member_from', type: 'date', obj: 'company' },
              { label: 'Expiry Date', key: 'expiry', type: 'date', obj: 'company' },
              { label: 'Max Branches', key: 'max_branches', type: 'number', obj: 'company' },
              { label: 'Max Employees', key: 'max_employee', type: 'number', obj: 'company' },
              { label: 'Max Devices', key: 'max_devices', type: 'number', obj: 'company' },
              { label: 'Max Mobile Devices', key: 'max_mobile_devices', type: 'number', obj: 'company' },
              { label: 'Max Mobile Trackers', key: 'max_mobile_trackers', type: 'number', obj: 'company' },
            ].map(f => {
              const val = f.obj === 'user' ? (state.user?.[f.key] || '') : (state.company?.[f.key] || '')
              const setVal = v => {
                if (f.obj === 'user') setState(s => ({ ...s, user: { ...s.user, [f.key]: v } }))
                else setState(s => ({ ...s, company: { ...s.company, [f.key]: v } }))
              }
              return (
                <div key={f.key} className="field">
                  <label>{f.label}</label>
                  {f.type === 'date' ? (
                    <DatePicker
                      value={val}
                      onChange={setVal}
                      error={!!state.errors?.[f.key]}
                      placeholder={f.label}
                    />
                  ) : (
                    <input
                      className={`input ${state.errors?.[f.key] ? 'input-error' : ''}`}
                      type={f.type || 'text'}
                      value={val}
                      onChange={e => setVal(e.target.value)}
                    />
                  )}
                  <FE field={f.key} />
                </div>
              )
            })}
          </div>
        </div>
        <SaveBtn loading={loading} onClick={onSave} />
      </div>
    )
  }

  if (tab === 'license') {
    const fields = [
      { label: 'License No', key: 'license_no' },
      { label: 'License Type', key: 'license_type' },
      { label: 'Emirate', key: 'emirate' },
      { label: 'Makeem No', key: 'makeem_no' },
      { label: 'Manager', key: 'manager' },
      { label: 'Issue Date', key: 'issue_date', type: 'date' },
      { label: 'Expiry Date', key: 'expiry_date', type: 'date' },
    ]
    return (
      <div>
        <SectionHeader tab={tab} />
        <div className="grid-2 mb-6">
          {fields.map(f => (
            <div key={f.key} className="field">
              <label>{f.label}</label>
              {f.type === 'date' ? (
                <DatePicker
                  value={state.license?.[f.key] || ''}
                  onChange={v => setState(s => ({ ...s, license: { ...s.license, [f.key]: v } }))}
                  placeholder={f.label}
                />
              ) : (
                <input
                  className="input"
                  type={f.type || 'text'}
                  value={state.license?.[f.key] || ''}
                  onChange={e => setState(s => ({ ...s, license: { ...s.license, [f.key]: e.target.value } }))}
                />
              )}
            </div>
          ))}
        </div>
        <SaveBtn loading={loading} onClick={onSave} />
      </div>
    )
  }

  if (tab === 'contact') {
    return (
      <div>
        <SectionHeader tab={tab} />
        <div className="grid-2 mb-6">
          {[
            { label: 'Contact Name', key: 'name' },
            { label: 'Phone Number', key: 'number' },
            { label: 'Position', key: 'position' },
            { label: 'WhatsApp', key: 'whatsapp' },
          ].map(f => (
            <div key={f.key} className="field">
              <label>{f.label}</label>
              <input
                className={`input ${state.errors?.[f.key] ? 'input-error' : ''}`}
                type="text"
                value={state.contact?.[f.key] || ''}
                onChange={e => setState(s => ({ ...s, contact: { ...s.contact, [f.key]: e.target.value } }))}
              />
              <FE field={f.key} />
            </div>
          ))}
        </div>
        <SaveBtn loading={loading} onClick={onSave} />
      </div>
    )
  }

  if (tab === 'geo') {
    return (
      <div>
        <SectionHeader tab={tab} />
        <div className="grid-2 mb-[14px]">
          <div className="field">
            <label>Latitude</label>
            <input className="input" type="number" step="any"
              value={state.geo?.lat || ''}
              onChange={e => setState(s => ({ ...s, geo: { ...s.geo, lat: e.target.value } }))} />
          </div>
          <div className="field">
            <label>Longitude</label>
            <input className="input" type="number" step="any"
              value={state.geo?.lon || ''}
              onChange={e => setState(s => ({ ...s, geo: { ...s.geo, lon: e.target.value } }))} />
          </div>
        </div>
        <div className="field mb-6">
          <label>Address / Location</label>
          <textarea className="input resize-y" rows={3}
            value={state.geo?.location || ''}
            onChange={e => setState(s => ({ ...s, geo: { ...s.geo, location: e.target.value } }))} />
        </div>
        <SaveBtn loading={loading} onClick={onSave} />
      </div>
    )
  }

  if (tab === 'security') {
    const [show, setShow] = useState({ pw: false, cpw: false })
    return (
      <div>
        <SectionHeader tab={tab} />
        <div className="grid-2 mb-6">
          <div className="field">
            <label>New Password *</label>
            <div className="input-wrap">
              <input
                className={`input pr-9 ${state.errors?.password ? 'input-error' : ''}`}
                type={show.pw ? 'text' : 'password'}
                value={state.user?.password || ''}
                onChange={e => setState(s => ({ ...s, user: { ...s.user, password: e.target.value } }))}
              />
              <button type="button" className="input-action" onClick={() => setShow(v => ({ ...v, pw: !v.pw }))}>
                <Icon name={show.pw ? 'eyeOff' : 'eye'} size={14} />
              </button>
            </div>
            <FE field="password" />
          </div>
          <div className="field">
            <label>Confirm Password *</label>
            <div className="input-wrap">
              <input
                className="input pr-9"
                type={show.cpw ? 'text' : 'password'}
                value={state.user?.password_confirmation || ''}
                onChange={e => setState(s => ({ ...s, user: { ...s.user, password_confirmation: e.target.value } }))}
              />
              <button type="button" className="input-action" onClick={() => setShow(v => ({ ...v, cpw: !v.cpw }))}>
                <Icon name={show.cpw ? 'eyeOff' : 'eye'} size={14} />
              </button>
            </div>
          </div>
        </div>
        <SaveBtn loading={loading} onClick={onSave} />
      </div>
    )
  }

  if (tab === 'payments') {
    const navigate = useNavigate()
    const companyId = state.company?.id
    const companyName = state.company?.name || 'this company'
    const [rows, setRows] = useState([])
    const [loadingRows, setLoadingRows] = useState(true)
    const [emailTarget, setEmailTarget] = useState(null)

    const fetchRows = () => {
      if (!companyId) return
      setLoadingRows(true)
      api.get(`/master/companies/${companyId}/payments`, { params: { per_page: 100 } })
        .then(({ data }) => setRows(data.data || []))
        .catch(() => notifyError?.('Failed to load payments'))
        .finally(() => setLoadingRows(false))
    }

    useEffect(() => { fetchRows() }, [companyId])

    return (
      <div>
        <SectionHeader tab={tab} />

        <div className="flex items-center justify-between mb-4">
          <span className="text-sm text-content-muted">
            {loadingRows ? 'Loading…' : `${rows.length} payment(s) on record`}
          </span>
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/payments/create?company_id=${companyId}`)}
          >
            <Icon name="plus" size={14} /> Record Payment for {companyName}
          </button>
        </div>

        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th style={{ width: 40 }}>#</th>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Invoice #</th>
                <th>Status</th>
                <th style={{ width: 140, textAlign: 'center' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {loadingRows ? (
                <tr><td colSpan={7} className="text-center py-10">
                  <div className="flex justify-center"><span className="spinner" /></div>
                </td></tr>
              ) : rows.length === 0 ? (
                <tr><td colSpan={7}>
                  <div className="empty-state">
                    <Icon name="payment" size={32} />
                    <h4>No payments yet</h4>
                    <p>Record the first payment for this company</p>
                  </div>
                </td></tr>
              ) : rows.map((p, idx) => (
                <PaymentRow
                  key={p.id}
                  payment={p}
                  index={idx + 1}
                  showCompany={false}
                  onEmail={(invoice) => setEmailTarget(invoice)}
                  onError={(msg) => notifyError?.(msg)}
                />
              ))}
            </tbody>
          </table>
        </div>

        {emailTarget && (
          <InvoiceEmailModal
            invoice={emailTarget}
            onClose={() => setEmailTarget(null)}
            onSent={() => {
              notifySuccess?.('Invoice emailed successfully')
              setEmailTarget(null)
              fetchRows()
            }}
            onError={(msg) => notifyError?.(msg)}
          />
        )}
      </div>
    )
  }

  if (tab === 'whatsapp') {
    return (
      <div>
        <SectionHeader tab={tab} />
        <div className="flex flex-col gap-4 mb-6">
          <Toggle
            value={!!state.company?.enable_desktop_whatsapp}
            onChange={v => setState(s => ({ ...s, company: { ...s.company, enable_desktop_whatsapp: v } }))}
            label="Desktop WhatsApp Notifications"
          />
          <Toggle
            value={!!state.company?.enable_whatsapp_otp}
            onChange={v => setState(s => ({ ...s, company: { ...s.company, enable_whatsapp_otp: v } }))}
            label="WhatsApp Login OTP for all users"
          />
          <div className="grid-2">
            <div className="field">
              <label>WhatsApp Instance ID</label>
              <input className="input" type="text"
                value={state.company?.whatsapp_instance_id || ''}
                onChange={e => setState(s => ({ ...s, company: { ...s.company, whatsapp_instance_id: e.target.value } }))} />
            </div>
            <div className="field">
              <label>WhatsApp Token *</label>
              <input className="input" type="text"
                value={state.company?.whatsapp_access_token || ''}
                onChange={e => setState(s => ({ ...s, company: { ...s.company, whatsapp_access_token: e.target.value } }))} />
            </div>
          </div>
        </div>
        <SaveBtn loading={loading} onClick={onSave} />
      </div>
    )
  }

  if (tab === 'modules') {
    const mods = state.modules || { access_control: true, community: true, visitors: true }
    return (
      <div>
        <SectionHeader tab={tab} />
        <div className="flex flex-col gap-5 mb-7">
          {[
            { key: 'access_control', label: '1. Access Control Module' },
            { key: 'community',      label: '2. Community Module' },
            { key: 'visitors',       label: '3. Visitors Module' },
          ].map(m => (
            <Toggle key={m.key}
              value={!!mods[m.key]}
              onChange={v => setState(s => ({ ...s, modules: { ...s.modules, [m.key]: v } }))}
              label={m.label}
            />
          ))}
        </div>
        <SaveBtn loading={loading} onClick={onSave} />
      </div>
    )
  }

  return null
}

function SaveBtn({ loading, onClick }) {
  return (
    <div className="form-footer">
      <button className="btn btn-primary" onClick={onClick} disabled={loading}>
        {loading ? <span className="spinner spinner-sm" /> : <Icon name="check" size={14} />}
        {loading ? 'Saving…' : 'Save Changes'}
      </button>
    </div>
  )
}

export default function CompanyEdit() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()

  const [activeTab, setActiveTab] = useState('info')
  const [pageLoading, setPageLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const [state, setState] = useState({
    company: {}, user: {}, contact: {}, license: {},
    geo: {}, modules: { access_control: true, community: true, visitors: true },
    logoFile: null, logoPreview: null, errors: {}
  })

  useEffect(() => {
    api.get(`company/${id}`).then(({ data }) => {
      const r = data.record
      const fmt = (v) => {
        if (!v) return ''
        const [year, month, date] = v.split('/')
        return `${year}-${month}-${date}`
      }
      setState({
        company: { ...r, member_from: fmt(r.member_from), expiry: fmt(r.expiry) },
        user: r.user || {},
        contact: r.contact || {},
        license: r.trade_license || {},
        geo: { lat: r.lat || '', lon: r.lon || '', location: r.location || '' },
        modules: r.display_modules ? JSON.parse(r.display_modules) : { access_control: true, community: true, visitors: true },
        logoFile: null, logoPreview: null, errors: {}
      })
      setPageLoading(false)
    }).catch(() => {
      error('Failed to load company')
      setPageLoading(false)
    })
  }, [id])

  const handleSave = async () => {
    setSaving(true)
    setState(s => ({ ...s, errors: {} }))
    try {
      let endpoint, payload, isFormData = false

      if (activeTab === 'info') {
        const fd = new FormData()
        fd.append('name', state.company.name || '')
        if (state.logoFile) fd.append('logo', state.logoFile)
        fd.append('location', state.company.location || '')
        fd.append('member_from', state.company.member_from || '')
        fd.append('expiry', state.company.expiry || '')
        fd.append('max_employee', state.company.max_employee || '')
        fd.append('max_branches', state.company.max_branches || '')
        fd.append('max_devices', state.company.max_devices || '')
        fd.append('max_mobile_devices', state.company.max_mobile_devices || '')
        fd.append('max_mobile_trackers', state.company.max_mobile_trackers || '')
        fd.append('mol_id', state.company.mol_id || '')
        fd.append('p_o_box_no', state.company.p_o_box_no || '')
        fd.append('email', state.user.email || '')
        endpoint = `company/${id}/update`
        payload = fd; isFormData = true
      } else if (activeTab === 'license') {
        endpoint = `company/${id}/trade-license`
        payload = state.license
      } else if (activeTab === 'contact') {
        endpoint = `company/${id}/update/contact`
        payload = state.contact
      } else if (activeTab === 'geo') {
        endpoint = `company/${id}/update/geographic`
        payload = state.geo
      } else if (activeTab === 'security') {
        endpoint = `company/${id}/update/user`
        payload = { password: state.user.password, password_confirmation: state.user.password_confirmation }
      } else if (activeTab === 'whatsapp') {
        endpoint = `company/${id}/update/whatsapp_settings`
        payload = {
          whatsapp_access_token: state.company.whatsapp_access_token,
          whatsapp_instance_id: state.company.whatsapp_instance_id,
          enable_whatsapp_otp: state.company.enable_whatsapp_otp,
          enable_desktop_whatsapp: state.company.enable_desktop_whatsapp,
        }
      } else if (activeTab === 'modules') {
        endpoint = `company/${id}/update/modules_settings`
        payload = { modules: state.modules }
      }

      const cfg = isFormData ? { headers: { 'Content-Type': 'multipart/form-data' } } : {}
      const { data } = await api.post(endpoint, payload, cfg)

      if (data && data.status === false) {
        setState(s => ({ ...s, errors: data.errors || {} }))
        error('Please fix the errors and try again')
      } else {
        success('Changes saved successfully!')
      }
    } catch (e) {
      const errs = e.response?.data?.errors
      if (errs) setState(s => ({ ...s, errors: errs }))
      error(e.response?.data?.message || 'Failed to save changes')
    } finally {
      setSaving(false)
    }
  }

  if (pageLoading) return (
    <div className="flex justify-center pt-20">
      <span className="spinner" style={{ width: 28, height: 28 }} />
    </div>
  )

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="page-title">{state.company.name || 'Edit Company'}</div>
          <div className="page-subtitle">Company ID: {id}</div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/companies')}>
          <Icon name="back" size={14} /> Back
        </button>
      </div>

      <div className="card">
        <div className="tabs px-1.5 overflow-x-auto">
          {TABS.map(t => (
            <button
              key={t.id}
              className={`tab-btn ${activeTab === t.id ? 'active' : ''}`}
              onClick={() => { setActiveTab(t.id); setState(s => ({ ...s, errors: {} })) }}
            >
              <Icon name={t.icon} size={16} />
              {t.label}
            </button>
          ))}
        </div>

        <div className="card-body fade-up" key={activeTab}>
          <TabContent
            tab={activeTab}
            state={state}
            setState={setState}
            onSave={handleSave}
            loading={saving}
            notifySuccess={success}
            notifyError={error}
          />
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
