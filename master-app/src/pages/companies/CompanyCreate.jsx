import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import Toast from '../../components/Toast'
import DatePicker from '../../components/DatePicker'
import { useToast } from '../../hooks/useToast'

const STEPS = [
  { label: 'Company Info',    icon: 'companies', subtitle: 'Basic details and account limits' },
  { label: 'Contact Info',    icon: 'users',     subtitle: 'Primary point of contact' },
  { label: 'Geographic Info', icon: 'pin',       subtitle: 'Coordinates and address' },
]

function StepIndicator({ current }) {
  return (
    <div className="stepper">
      {STEPS.map((s, i) => {
        const step = i + 1
        const done = current > step
        const active = current === step
        return (
          <div key={step} className="step-item">
            <div className={`step-circle ${done ? 'done' : active ? 'active' : ''}`}>
              {done ? <Icon name="check" size={16} color="#fff" /> : step}
            </div>
            <div className="step-body">
              <span className={`step-label ${active ? 'active' : done ? 'done' : ''}`}>
                {s.label}
              </span>
              <span className="step-sub">Step {step} of {STEPS.length}</span>
            </div>
            {i < STEPS.length - 1 && <div className={`step-line ${done ? 'done' : ''}`} />}
          </div>
        )
      })}
    </div>
  )
}

function SectionHeader({ icon, title, subtitle }) {
  return (
    <div className="section-header">
      <div className="section-header-icon"><Icon name={icon} size={18} /></div>
      <div>
        <div className="section-header-title">{title}</div>
        <div className="section-header-sub">{subtitle}</div>
      </div>
    </div>
  )
}

export default function CompanyCreate() {
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()
  const fileRef = useRef(null)

  const [step, setStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [errors, setErrors] = useState({})

  const [logoFile, setLogoFile] = useState(null)
  const [logoPreview, setLogoPreview] = useState(null)

  const [company, setCompany] = useState({
    name: '', email: '', member_from: '', expiry: '',
    max_branches: '', max_employee: '', max_devices: '', max_mobile_devices: '', max_mobile_trackers: ''
  })
  const [contact, setContact] = useState({ name: '', number: '', position: '', whatsapp: '' })
  const [geo, setGeo] = useState({ lat: '', lon: '', location: '' })

  const handleLogoChange = (e) => {
    const file = e.target.files[0]
    if (!file) return
    setLogoFile(file)
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)
  }

  const validateStep1 = async () => {
    setLoading(true)
    setErrors({})
    try {
      const fd = new FormData()
      Object.entries(company).forEach(([k, v]) => fd.append(k, v))
      if (logoFile) fd.append('logo', logoFile)
      const { data } = await api.post('company/validate', fd)
      if (!data.status) { setErrors(data.errors || {}); return false }
      return true
    } catch (e) {
      setErrors(e.response?.data?.errors || {})
      return false
    } finally { setLoading(false) }
  }

  const validateStep2 = async () => {
    setLoading(true)
    setErrors({})
    try {
      const { data } = await api.post('company/contact/validate', contact)
      if (!data.status) { setErrors(data.errors || {}); return false }
      return true
    } catch (e) {
      setErrors(e.response?.data?.errors || {})
      return false
    } finally { setLoading(false) }
  }

  const validateStep3 = async () => {
    setLoading(true)
    setErrors({})
    try {
      const { data } = await api.post('company/user/validate', geo)
      if (!data.status) { setErrors(data.errors || {}); return false }
      return true
    } catch (e) {
      setErrors(e.response?.data?.errors || {})
      return false
    } finally { setLoading(false) }
  }

  const handleNext = async () => {
    let ok = false
    if (step === 1) ok = await validateStep1()
    if (step === 2) ok = await validateStep2()
    if (ok) setStep(s => s + 1)
  }

  const handleSubmit = async () => {
    const ok = await validateStep3()
    if (!ok) return
    setLoading(true)
    try {
      const fd = new FormData()
      if (logoFile) fd.append('logo', logoFile)
      fd.append('company_name', company.name)
      fd.append('email', company.email)
      fd.append('member_from', company.member_from)
      fd.append('expiry', company.expiry)
      fd.append('max_branches', company.max_branches)
      fd.append('max_employee', company.max_employee)
      fd.append('max_devices', company.max_devices)
      fd.append('max_mobile_devices', company.max_mobile_devices)
      fd.append('max_mobile_trackers', company.max_mobile_trackers)
      fd.append('contact_name', contact.name)
      fd.append('number', contact.number)
      fd.append('position', contact.position)
      fd.append('whatsapp', contact.whatsapp)
      fd.append('lat', geo.lat)
      fd.append('lon', geo.lon)
      fd.append('location', geo.location || 'no location')

      const { data } = await api.post('company', fd)
      if (!data.status) {
        setErrors(data.errors || {})
        error('Please fix the errors and try again')
      } else {
        success('Company created successfully!')
        setTimeout(() => navigate('/companies'), 800)
      }
    } catch (e) {
      error(e.response?.data?.message || 'Failed to create company')
    } finally { setLoading(false) }
  }

  const FE = ({ field }) => errors[field]
    ? <span className="field-error">{Array.isArray(errors[field]) ? errors[field][0] : errors[field]}</span>
    : null

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="page-title">New Company</div>
          <div className="page-subtitle">Fill in the details to create a new company</div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/companies')}>
          <Icon name="back" size={14} /> Back
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <StepIndicator current={step} />

          {/* Step 1 */}
          {step === 1 && (
            <div className="fade-up">
              <SectionHeader icon={STEPS[0].icon} title={STEPS[0].label} subtitle={STEPS[0].subtitle} />
              <div className="flex gap-6 mb-6">
                {/* Logo upload */}
                <div className="shrink-0">
                  <div
                    onClick={() => fileRef.current?.click()}
                    className="w-[100px] h-[100px] rounded-xl border-2 border-dashed border-border-2 cursor-pointer flex items-center justify-center overflow-hidden bg-surface-2 hover:border-accent transition-colors duration-150"
                  >
                    {logoPreview
                      ? <img src={logoPreview} alt="logo" className="w-full h-full object-cover" />
                      : <div className="text-center text-content-muted">
                          <Icon name="upload" size={24} /><div className="text-[10px] mt-1">Logo</div>
                        </div>
                    }
                  </div>
                  <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                </div>

                <div className="grid-2 flex-1">
                  {[
                    { label: 'Company Name *', key: 'name', type: 'text' },
                    { label: 'Company Email *', key: 'email', type: 'email' },
                    { label: 'Member From *', key: 'member_from', type: 'date' },
                    { label: 'Expiry Date *', key: 'expiry', type: 'date' },
                    { label: 'Max Branches *', key: 'max_branches', type: 'number' },
                    { label: 'Max Employees *', key: 'max_employee', type: 'number' },
                    { label: 'Max Devices *', key: 'max_devices', type: 'number' },
                    { label: 'Max Mobile Devices *', key: 'max_mobile_devices', type: 'number' },
                    { label: 'Max Mobile Trackers *', key: 'max_mobile_trackers', type: 'number' },
                  ].map(f => (
                    <div key={f.key} className="field">
                      <label>{f.label}</label>
                      {f.type === 'date' ? (
                        <DatePicker
                          value={company[f.key]}
                          onChange={v => setCompany(c => ({ ...c, [f.key]: v }))}
                          error={!!errors[f.key]}
                          placeholder={f.label.replace(' *', '')}
                        />
                      ) : (
                        <input
                          className={`input ${errors[f.key] ? 'input-error' : ''}`}
                          type={f.type}
                          value={company[f.key]}
                          onChange={e => setCompany(c => ({ ...c, [f.key]: e.target.value }))}
                        />
                      )}
                      <FE field={f.key} />
                    </div>
                  ))}
                </div>
              </div>
              <div className="form-footer">
                <button className="btn btn-ghost" onClick={() => navigate('/companies')}>Cancel</button>
                <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                  {loading ? <span className="spinner spinner-sm" /> : null}
                  Next <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 2 */}
          {step === 2 && (
            <div className="fade-up">
              <SectionHeader icon={STEPS[1].icon} title={STEPS[1].label} subtitle={STEPS[1].subtitle} />
              <div className="grid-2 mb-6">
                {[
                  { label: 'Contact Person Name *', key: 'name', type: 'text' },
                  { label: 'Contact Person Number *', key: 'number', type: 'tel' },
                  { label: 'Contact Person Position *', key: 'position', type: 'text' },
                  { label: 'WhatsApp (ex: 971XXX) *', key: 'whatsapp', type: 'tel' },
                ].map(f => (
                  <div key={f.key} className="field">
                    <label>{f.label}</label>
                    <input
                      className={`input ${errors[f.key] ? 'input-error' : ''}`}
                      type={f.type}
                      value={contact[f.key]}
                      onChange={e => setContact(c => ({ ...c, [f.key]: e.target.value }))}
                    />
                    <FE field={f.key} />
                  </div>
                ))}
              </div>
              <div className="form-footer">
                <button className="btn btn-ghost" onClick={() => setStep(1)}>
                  <Icon name="back" size={14} /> Back
                </button>
                <button className="btn btn-primary" onClick={handleNext} disabled={loading}>
                  {loading ? <span className="spinner spinner-sm" /> : null}
                  Next <Icon name="chevronRight" size={14} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 */}
          {step === 3 && (
            <div className="fade-up">
              <SectionHeader icon={STEPS[2].icon} title={STEPS[2].label} subtitle={STEPS[2].subtitle} />
              <div className="grid-2 mb-[14px]">
                <div className="field">
                  <label>Latitude *</label>
                  <input
                    className={`input ${errors.lat ? 'input-error' : ''}`}
                    type="number" step="any"
                    placeholder="e.g. 25.2048"
                    value={geo.lat}
                    onChange={e => setGeo(g => ({ ...g, lat: e.target.value }))}
                  />
                  <FE field="lat" />
                </div>
                <div className="field">
                  <label>Longitude *</label>
                  <input
                    className={`input ${errors.lon ? 'input-error' : ''}`}
                    type="number" step="any"
                    placeholder="e.g. 55.2708"
                    value={geo.lon}
                    onChange={e => setGeo(g => ({ ...g, lon: e.target.value }))}
                  />
                  <FE field="lon" />
                </div>
              </div>
              <div className="field mb-6">
                <label>Address / Location</label>
                <textarea
                  className="input resize-y"
                  rows={3}
                  value={geo.location}
                  onChange={e => setGeo(g => ({ ...g, location: e.target.value }))}
                />
                <FE field="location" />
              </div>
              <div className="form-footer">
                <button className="btn btn-ghost" onClick={() => setStep(2)}>
                  <Icon name="back" size={14} /> Back
                </button>
                <button className="btn btn-primary" onClick={handleSubmit} disabled={loading}>
                  {loading ? <span className="spinner spinner-sm" /> : <Icon name="check" size={14} />}
                  {loading ? 'Creating…' : 'Create Company'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
