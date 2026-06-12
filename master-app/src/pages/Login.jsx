import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'
import AuthLayout from '../layouts/AuthLayout'
import Icon from '../components/Icon'
import api from '../services/api'

export default function Login() {
  const { login } = useAuth()
  const navigate = useNavigate()

  const [form, setForm] = useState({ email: '', password: '' })
  const [showPass, setShowPass] = useState(false)
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)
  const [apiError, setApiError] = useState('')

  const [otpStep, setOtpStep] = useState(false)
  const [otp, setOtp] = useState('')
  const [otpUserId, setOtpUserId] = useState(null)
  const [otpLoading, setOtpLoading] = useState(false)

  const validate = () => {
    const e = {}
    if (!form.email) e.email = 'Email is required'
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email'
    if (!form.password) e.password = 'Password is required'
    setErrors(e)
    return !Object.keys(e).length
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setApiError('')
    setLoading(true)

    try {
      const { data } = await api.post('loginwith_otp', {
        email: form.email, password: form.password, source: 'admin'
      })
      if (data.enable_whatsapp_otp) {
        setOtpUserId(data.user_id)
        setOtpStep(true)
        setLoading(false)
        return
      }
    } catch {
      // OTP endpoint failed, fall through to normal login
    }

    const result = await login(form.email, form.password)
    setLoading(false)
    if (result.success) {
      navigate('/companies')
    } else {
      setApiError(result.message)
    }
  }

  const handleOtpVerify = async () => {
    if (!otp || otp.length < 4) return
    setOtpLoading(true)
    try {
      await api.post(`check_otp/${otp}`, { user_id: otpUserId })
      const result = await login(form.email, form.password)
      if (result.success) navigate('/companies')
      else setApiError(result.message)
    } catch {
      setApiError('Invalid OTP. Please try again.')
    } finally {
      setOtpLoading(false)
    }
  }

  return (
    <AuthLayout>
      <div className="w-full max-w-[400px] fade-up">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-12 h-12 rounded-xl bg-accent flex items-center justify-center mx-auto mb-4 shadow-[0_4px_20px_rgba(124,58,237,.4)]">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.2" strokeLinecap="round">
              <path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/>
            </svg>
          </div>
          <h1 className="text-3xl font-extrabold text-content mb-1.5">Master Panel</h1>
          <p className="text-base text-content-muted">Sign in to your master account</p>
        </div>

        {/* Card */}
        <div className="card p-7 pb-6">
          {!otpStep ? (
            <form onSubmit={handleSubmit} className="flex flex-col gap-4">
              {apiError && (
                <div className="px-[14px] py-2.5 rounded bg-error-dim border border-[rgba(239,68,68,.25)] text-error text-base">
                  {apiError}
                </div>
              )}

              <div className="field">
                <label>Email address</label>
                <div className="input-wrap">
                  <span className="input-icon"><Icon name="mail" size={15} /></span>
                  <input
                    className={`input ${errors.email ? 'input-error' : ''}`}
                    type="email"
                    placeholder="admin@example.com"
                    value={form.email}
                    onChange={e => { setForm(f => ({ ...f, email: e.target.value })); setErrors(er => ({ ...er, email: '' })) }}
                    autoComplete="email"
                  />
                </div>
                {errors.email && <span className="field-error">{errors.email}</span>}
              </div>

              <div className="field">
                <label>Password</label>
                <div className="input-wrap">
                  <span className="input-icon"><Icon name="lock" size={15} /></span>
                  <input
                    className={`input pr-9 ${errors.password ? 'input-error' : ''}`}
                    type={showPass ? 'text' : 'password'}
                    placeholder="Enter your password"
                    value={form.password}
                    onChange={e => { setForm(f => ({ ...f, password: e.target.value })); setErrors(er => ({ ...er, password: '' })) }}
                    autoComplete="current-password"
                  />
                  <button type="button" className="input-action" onClick={() => setShowPass(v => !v)}>
                    <Icon name={showPass ? 'eyeOff' : 'eye'} size={15} />
                  </button>
                </div>
                {errors.password && <span className="field-error">{errors.password}</span>}
              </div>

              <button
                type="submit"
                className="btn btn-primary w-full justify-center mt-1 py-[10px]"
                disabled={loading}
              >
                {loading ? <span className="spinner spinner-sm" /> : null}
                {loading ? 'Signing in…' : 'Sign in'}
              </button>
            </form>
          ) : (
            <div className="flex flex-col gap-4">
              <div className="text-center">
                <div className="w-10 h-10 rounded-[10px] bg-success-dim flex items-center justify-center mx-auto mb-3">
                  <Icon name="whatsapp" size={20} color="#10b981" />
                </div>
                <p className="text-base text-content-secondary">
                  Enter the OTP sent to your WhatsApp
                </p>
              </div>

              {apiError && (
                <div className="px-[14px] py-2.5 rounded bg-error-dim border border-[rgba(239,68,68,.25)] text-error text-base">
                  {apiError}
                </div>
              )}

              <div className="field">
                <label>OTP Code</label>
                <input
                  className="input text-center text-[20px] tracking-[6px] font-bold"
                  type="text"
                  placeholder="Enter 6-digit OTP"
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  maxLength={6}
                />
              </div>

              <div className="flex gap-2">
                <button
                  className="btn btn-ghost flex-1 justify-center"
                  onClick={() => { setOtpStep(false); setOtp(''); setApiError('') }}
                >
                  Back
                </button>
                <button
                  className="btn btn-primary flex-1 justify-center"
                  onClick={handleOtpVerify}
                  disabled={otpLoading || !otp}
                >
                  {otpLoading ? <span className="spinner spinner-sm" /> : 'Verify'}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center mt-5 text-sm text-content-disabled">
          MyTime2Cloud — Master Control Panel
        </p>
      </div>
    </AuthLayout>
  )
}
