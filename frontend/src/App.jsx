import { useEffect, useState } from 'react'

const API_BASE = '/api'

function App() {
  const [user, setUser] = useState(null)
  const [authMode, setAuthMode] = useState('login')
  const [authForm, setAuthForm] = useState({ username: '', email: '', password: '' })
  const [reports, setReports] = useState([])
  const [selectedReportId, setSelectedReportId] = useState(null)
  const [selectedReport, setSelectedReport] = useState(null)
  const [reportForm, setReportForm] = useState({
    jobDescription: '',
    selfDescription: '',
  })
  const [resumeFile, setResumeFile] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const fetchJson = async (url, options = {}) => {
    const response = await fetch(`${API_BASE}${url}`, {
      credentials: 'include',
      headers: {
        ...(options.body instanceof FormData ? {} : { 'Content-Type': 'application/json' }),
        ...(options.headers || {}),
      },
      ...options,
    })

    const contentType = response.headers.get('content-type') || ''
    const isJson = contentType.includes('application/json')
    const payload = isJson ? await response.json() : await response.text()

    if (!response.ok) {
      throw new Error(payload?.message || 'Something went wrong')
    }

    return payload
  }

  const fetchReports = async () => {
    const data = await fetchJson('/interview/')
    setReports(data.interviewReports || [])
    if (data.interviewReports?.length) {
      setSelectedReportId(data.interviewReports[0]._id)
    }
  }

  const fetchCurrentUser = async () => {
    try {
      const data = await fetchJson('/auth/get-me')
      setUser(data.user)
      await fetchReports()
    } catch (err) {
      setUser(null)
      setReports([])
      setSelectedReport(null)
    }
  }

  useEffect(() => {
    fetchCurrentUser()
  }, [])

  useEffect(() => {
    if (!user) return

    const loadSelectedReport = async () => {
      if (!selectedReportId) {
        setSelectedReport(null)
        return
      }

      try {
        const data = await fetchJson(`/interview/report/${selectedReportId}`)
        setSelectedReport(data.interviewReport)
      } catch (err) {
        setError(err.message)
      }
    }

    loadSelectedReport()
  }, [selectedReportId, user])

  const handleAuthSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      const endpoint = authMode === 'login' ? '/auth/login' : '/auth/register'
      const payload =
        authMode === 'login'
          ? { email: authForm.email, password: authForm.password }
          : { username: authForm.username, email: authForm.email, password: authForm.password }

      const data = await fetchJson(endpoint, {
        method: 'POST',
        body: JSON.stringify(payload),
      })

      setUser(data.user)
      setAuthForm({ username: '', email: '', password: '' })

      try {
        await fetchReports()
      } catch (reportError) {
        console.warn('Auth success but report fetch failed:', reportError)
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleReportSubmit = async (event) => {
    event.preventDefault()
    setLoading(true)
    setError('')

    try {
      if (!resumeFile) {
        throw new Error('Please upload your resume PDF.')
      }

      const formData = new FormData()
      formData.append('resume', resumeFile)
      formData.append('jobDescription', reportForm.jobDescription)
      formData.append('selfDescription', reportForm.selfDescription)

      const result = await fetchJson('/interview/', {
        method: 'POST',
        body: formData,
      })

      setSelectedReportId(result.interviewReport._id)
      setReports((current) => [result.interviewReport, ...current])
      setReportForm({ jobDescription: '', selfDescription: '' })
      setResumeFile(null)
      setSelectedReport(result.interviewReport)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetchJson('/auth/logout')
    } catch (err) {
      console.error(err)
    } finally {
      setUser(null)
      setReports([])
      setSelectedReport(null)
      setSelectedReportId(null)
    }
  }

  const handleDownloadResume = async (reportId) => {
    try {
      const response = await fetch(`${API_BASE}/interview/resume/pdf/${reportId}`, {
        method: 'POST',
        credentials: 'include',
      })

      if (!response.ok) {
        throw new Error('Could not generate resume PDF')
      }

      const blob = await response.blob()
      const link = document.createElement('a')
      const url = URL.createObjectURL(blob)
      link.href = url
      link.download = `resume-${reportId}.pdf`
      link.click()
      URL.revokeObjectURL(url)
    } catch (err) {
      setError(err.message)
    }
  }

  if (!user) {
    return (
      <div className="auth-shell">
        <div className="auth-card">
          <div className="brand-row">
            <div className="logo">AI</div>
            <div>
              <p className="eyebrow">Career Accelerator</p>
              <h1>Interview AI</h1>
            </div>
          </div>

          <div className="auth-toggle">
            <button
              className={authMode === 'login' ? 'active' : ''}
              onClick={() => setAuthMode('login')}
              type="button"
            >
              Login
            </button>
            <button
              className={authMode === 'register' ? 'active' : ''}
              onClick={() => setAuthMode('register')}
              type="button"
            >
              Register
            </button>
          </div>

          <form onSubmit={handleAuthSubmit} className="auth-form">
            {authMode === 'register' && (
              <label>
                Username
                <input
                  type="text"
                  value={authForm.username}
                  onChange={(event) => setAuthForm({ ...authForm, username: event.target.value })}
                  placeholder="Your name"
                  required
                />
              </label>
            )}

            <label>
              Email
              <input
                type="email"
                value={authForm.email}
                onChange={(event) => setAuthForm({ ...authForm, email: event.target.value })}
                placeholder="you@example.com"
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                value={authForm.password}
                onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })}
                placeholder="********"
                required
              />
            </label>

            {error && <p className="error-text">{error}</p>}

            <button type="submit" className="primary-btn" disabled={loading}>
              {loading ? 'Please wait...' : authMode === 'login' ? 'Login' : 'Create account'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand-row">
          <div className="logo">AI</div>
          <div>
            <p className="eyebrow">Career Accelerator</p>
            <h2>Interview AI</h2>
          </div>
        </div>

        <div className="user-box">
          <span>Welcome back</span>
          <strong>{user.username}</strong>
        </div>

        <nav className="nav-links">
          <button type="button" className="nav-link active">Dashboard</button>
          <button type="button" className="nav-link" onClick={() => setSelectedReportId(null)}>New report</button>
        </nav>

        <button type="button" className="secondary-btn" onClick={handleLogout}>Logout</button>
      </aside>

      <main className="main-panel">
        <section className="topbar">
          <div>
            <p className="eyebrow">Interviews</p>
            <h3>Dashboard</h3>
          </div>
          <div className="score-pill">
            {selectedReport ? `${selectedReport.matchScore || 0}% match` : 'Ready to assess'}
          </div>
        </section>

        {error && <div className="alert">{error}</div>}

        <div className="content-grid">
          <section className="panel form-panel">
            <h4>Generate interview report</h4>
            <form onSubmit={handleReportSubmit} className="report-form">
              <label>
                Job description
                <textarea
                  rows="6"
                  value={reportForm.jobDescription}
                  onChange={(event) => setReportForm({ ...reportForm, jobDescription: event.target.value })}
                  placeholder="Paste the job description here..."
                  required
                />
              </label>

              <label>
                Self description
                <textarea
                  rows="5"
                  value={reportForm.selfDescription}
                  onChange={(event) => setReportForm({ ...reportForm, selfDescription: event.target.value })}
                  placeholder="Tell us about your experience and strengths..."
                  required
                />
              </label>

              <label>
                Resume PDF
                <input
                  type="file"
                  accept="application/pdf"
                  onChange={(event) => setResumeFile(event.target.files[0])}
                  required
                />
              </label>

              <button type="submit" className="primary-btn" disabled={loading}>
                {loading ? 'Generating...' : 'Generate report'}
              </button>
            </form>
          </section>

          <section className="panel list-panel">
            <h4>Previous reports</h4>
            <div className="report-list">
              {reports.length === 0 ? (
                <p className="empty-state">No saved reports yet.</p>
              ) : (
                reports.map((report) => (
                  <button
                    key={report._id}
                    type="button"
                    className={`report-item ${selectedReportId === report._id ? 'selected' : ''}`}
                    onClick={() => setSelectedReportId(report._id)}
                  >
                    <span>{report.title || 'Interview report'}</span>
                    <small>{report.matchScore ? `${report.matchScore}% Match` : 'Pending'}</small>
                  </button>
                ))
              )}
            </div>
          </section>
        </div>

        {selectedReport && (
          <section className="panel detail-panel">
            <div className="detail-header">
              <div>
                <p className="eyebrow">Selected report</p>
                <h4>{selectedReport.title}</h4>
              </div>
              <button type="button" className="secondary-btn" onClick={() => handleDownloadResume(selectedReport._id)}>
                Download resume PDF
              </button>
            </div>

            <div className="stats-grid">
              <div className="stat-card">
                <span>Match score</span>
                <strong>{selectedReport.matchScore}%</strong>
              </div>
              <div className="stat-card">
                <span>Technical questions</span>
                <strong>{selectedReport.technicalQuestions?.length || 0}</strong>
              </div>
              <div className="stat-card">
                <span>Behavioral questions</span>
                <strong>{selectedReport.behavioralQuestions?.length || 0}</strong>
              </div>
            </div>

            <div className="report-section">
              <h5>Skill gaps</h5>
              {selectedReport.skillGaps?.length ? (
                <ul>
                  {selectedReport.skillGaps.map((gap, index) => (
                    <li key={`${gap.skill}-${index}`}>
                      <strong>{gap.skill}</strong> <span className={`severity ${gap.severity}`}>{gap.severity}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p>No skill gaps identified.</p>
              )}
            </div>

            <div className="report-section">
              <h5>Technical questions</h5>
              <div className="qa-list">
                {selectedReport.technicalQuestions?.map((item, index) => (
                  <article key={`tech-${index}`} className="qa-card">
                    <h6>{item.question}</h6>
                    <p><strong>Intention:</strong> {item.intention}</p>
                    <p><strong>Answer:</strong> {item.answer}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="report-section">
              <h5>Behavioral questions</h5>
              <div className="qa-list">
                {selectedReport.behavioralQuestions?.map((item, index) => (
                  <article key={`behavior-${index}`} className="qa-card">
                    <h6>{item.question}</h6>
                    <p><strong>Intention:</strong> {item.intention}</p>
                    <p><strong>Answer:</strong> {item.answer}</p>
                  </article>
                ))}
              </div>
            </div>

            <div className="report-section">
              <h5>Preparation plan</h5>
              <div className="plan-list">
                {selectedReport.preparationPlan?.map((plan) => (
                  <div key={plan.day} className="plan-card">
                    <h6>Day {plan.day}: {plan.focus}</h6>
                    <ul>
                      {plan.tasks.map((task, index) => (
                        <li key={`${plan.day}-${index}`}>{task}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          </section>
        )}
      </main>
    </div>
  )
}

export default App