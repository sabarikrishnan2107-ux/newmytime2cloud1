import { useState, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import api from '../../services/api'
import Icon from '../../components/Icon'
import Toast from '../../components/Toast'
import DatePicker from '../../components/DatePicker'
import { useToast } from '../../hooks/useToast'

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

export default function LicenseGenerate() {
  const navigate = useNavigate()
  const { toasts, success, error } = useToast()

  // Free-text label only — shown on the license for admin reference. It is NOT
  // linked to a real company record.
  const [companyName, setCompanyName] = useState('')

  const [machineFp, setMachineFp] = useState('')
  const [serials, setSerials] = useState([])
  const [serialInput, setSerialInput] = useState('')
  const [maxEmployees, setMaxEmployees] = useState('')
  const [maxDevices, setMaxDevices] = useState('')
  const [expiry, setExpiry] = useState('')

  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)          // { token, license_id, download_name }
  const [errors, setErrors] = useState({})

  const addSerial = () => {
    const v = serialInput.trim()
    if (!v) return
    if (serials.includes(v)) { setSerialInput(''); return }
    const next = [...serials, v]
    setSerials(next)
    setSerialInput('')
    // Default max devices to the number of whitelisted serials (editable).
    if (!maxDevices || Number(maxDevices) < next.length) setMaxDevices(String(next.length))
  }

  const removeSerial = (s) => setSerials(serials.filter(x => x !== s))

  const validate = () => {
    const e = {}
    if (!companyName.trim()) e.company = 'Company is required'
    if (!machineFp.trim()) e.machine_fp = 'Machine fingerprint is required'
    if (maxEmployees === '' || Number(maxEmployees) < 0) e.max_employees = 'Enter max employees'
    if (maxDevices === '' || Number(maxDevices) < 0) e.max_devices = 'Enter max devices'
    if (!expiry) e.expiry = 'Expiry date is required'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleGenerate = async () => {
    if (!validate()) return
    setLoading(true)
    setResult(null)
    try {
      const { data } = await api.post('licenses/generate', {
        company_id: null,
        company_name: companyName.trim(),
        machine_fp: machineFp.trim(),
        allowed_devices: serials,
        max_devices: Number(maxDevices),
        max_employees: Number(maxEmployees),
        expiry,
      })
      if (data.status) {
        setResult({ token: data.token, license_id: data.license_id, download_name: data.download_name })
        success('License generated successfully')
      } else {
        error(data.message || 'Failed to generate license')
      }
    } catch (e) {
      setErrors(e.response?.data?.errors || {})
      error(e.response?.data?.message || 'Failed to generate license')
    } finally { setLoading(false) }
  }

  const copyToken = async () => {
    try { await navigator.clipboard.writeText(result.token); success('License key copied') }
    catch { error('Copy failed — select and copy manually') }
  }

  const downloadLic = () => {
    const blob = new Blob([result.token], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = result.download_name || 'license.lic'
    a.click()
    URL.revokeObjectURL(url)
  }

  const FE = ({ field }) => errors[field]
    ? <span className="field-error">{Array.isArray(errors[field]) ? errors[field][0] : errors[field]}</span>
    : null

  return (
    <div className="fade-up">
      <div className="page-header">
        <div>
          <div className="page-title">Generate License</div>
          <div className="page-subtitle">Issue a signed, machine-bound desktop license key</div>
        </div>
        <button className="btn btn-ghost" onClick={() => navigate('/licenses')}>
          <Icon name="back" size={14} /> Back
        </button>
      </div>

      <div className="card">
        <div className="card-body">
          <SectionHeader icon="key" title="License Details" subtitle="The customer reads the Activation Code off their desktop app" />

          <div className="grid-2 mb-[14px]">
            {/* Company label (free text — admin reference only) */}
            <div className="field">
              <label>Company *</label>
              <input
                className={`input ${errors.company ? 'input-error' : ''}`}
                placeholder="Company / customer name for this license"
                value={companyName}
                onChange={e => setCompanyName(e.target.value)}
              />
              <FE field="company" />
            </div>

            {/* Machine fingerprint */}
            <div className="field">
              <label>Machine Fingerprint (Activation Code) *</label>
              <input
                className={`input ${errors.machine_fp ? 'input-error' : ''}`}
                placeholder="Paste the code from the desktop"
                value={machineFp}
                onChange={e => setMachineFp(e.target.value)}
              />
              <FE field="machine_fp" />
            </div>
          </div>

          {/* Allowed device serials */}
          <div className="field mb-[14px]">
            <label>Allowed Device Serials</label>
            <div className="flex gap-2">
              <input
                className="input flex-1"
                placeholder="Enter a device serial / ID, then Add"
                value={serialInput}
                onChange={e => setSerialInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addSerial() } }}
              />
              <button className="btn btn-ghost" onClick={addSerial} type="button">
                <Icon name="plus" size={14} /> Add
              </button>
            </div>
            {serials.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {serials.map(s => (
                  <span key={s} className="inline-flex items-center gap-1.5 bg-accent-dim text-accent px-2.5 py-1 rounded-full text-xs font-semibold">
                    {s}
                    <button onClick={() => removeSerial(s)} className="bg-transparent p-0 text-accent">
                      <Icon name="close" size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}
            <span className="text-[11px] text-content-muted mt-1">
              After activation the desktop can only add devices whose serial is in this list. Leave empty to allow any serial up to Max Devices.
            </span>
          </div>

          <div className="grid-3 mb-6">
            <div className="field">
              <label>Max Employees *</label>
              <input className={`input ${errors.max_employees ? 'input-error' : ''}`} type="number" min="0"
                value={maxEmployees} onChange={e => setMaxEmployees(e.target.value)} />
              <FE field="max_employees" />
            </div>
            <div className="field">
              <label>Max Devices *</label>
              <input className={`input ${errors.max_devices ? 'input-error' : ''}`} type="number" min="0"
                value={maxDevices} onChange={e => setMaxDevices(e.target.value)} />
              <FE field="max_devices" />
            </div>
            <div className="field">
              <label>Expiry Date *</label>
              <DatePicker value={expiry} onChange={setExpiry} error={!!errors.expiry} placeholder="Expiry date" />
              <FE field="expiry" />
            </div>
          </div>

          <div className="form-footer">
            <button className="btn btn-ghost" onClick={() => navigate('/licenses')}>Cancel</button>
            <button className="btn btn-primary" onClick={handleGenerate} disabled={loading}>
              {loading ? <span className="spinner spinner-sm" /> : <Icon name="key" size={14} />}
              {loading ? 'Generating…' : 'Generate License'}
            </button>
          </div>

          {/* Result */}
          {result && (
            <div className="mt-6 border-t border-border pt-5 fade-up">
              <SectionHeader icon="check" title={`License ${result.license_id}`} subtitle="Send this key to the customer to activate their desktop" />
              <div className="field">
                <label>License Key</label>
                <textarea readOnly rows={4} className="input resize-y font-mono text-xs"
                  value={result.token} onClick={e => e.target.select()} />
              </div>
              <div className="flex gap-2 mt-2">
                <button className="btn btn-ghost" onClick={copyToken}><Icon name="copy" size={14} /> Copy Key</button>
                <button className="btn btn-primary" onClick={downloadLic}><Icon name="download" size={14} /> Download .lic</button>
              </div>
            </div>
          )}
        </div>
      </div>

      <Toast toasts={toasts} />
    </div>
  )
}
