import React from 'react';
import '../styles/LoginPage.css';

function AuthPage({ 
  tenantId, setTenantId, 
  clientId, setClientId, 
  clientSecret, setClientSecret, 
  authConnected, 
  saveAuthConfig, 
  busyAction, 
  showStatus,
  tenantIdHistory = [],
  clientIdHistory = []
}) {

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!tenantId || !clientId || !clientSecret) {
      showStatus('Please enter all credentials', 'error');
      return;
    }
    await saveAuthConfig();
  };

  return (
    <div className="login-page">
      <div className="login-container">
        {/* Left Section - Branding */}
        <div className="login-branding">
          <div className="branding-content">
            <div className="logo-icon">🔐</div>
            <h1>PBIP Converter</h1>
            <p>Power BI Project Processing</p>
            <div className="feature-list">
              <div className="feature-item">
                <span className="feature-icon">📥</span>
                <span>Download & Convert</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📤</span>
                <span>Publish & Refresh</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">🔗</span>
                <span>Connection Management</span>
              </div>
              <div className="feature-item">
                <span className="feature-icon">📊</span>
                <span>Metadata Viewer</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Section - Login Form */}
        <div className="login-form-section">
          <div className="login-form-card">
            <div className="login-header">
              <h2>Azure AD Login</h2>
              <p>Enter your Azure credentials to continue</p>
            </div>

            {/* Status Message */}
            {authConnected && (
              <div className="login-success-banner">
                <span className="success-icon">✓</span>
                <span>Authentication successful! Redirecting...</span>
              </div>
            )}

            {!authConnected && (
              <div className="login-info-banner">
                <span className="info-icon">ℹ</span>
                <span>Provide your Azure AD credentials</span>
              </div>
            )}

            {/* Login Form */}
            <form className="login-form" onSubmit={handleLogin} autoComplete="off">
              <div className="form-group">
                <label htmlFor="tenantId">Tenant ID</label>
                <input
                  id="tenantId"
                  type="text"
                  value={tenantId}
                  onChange={(e) => setTenantId(e.target.value)}
                  placeholder="Tenant (directory) ID"
                  className="form-input"
                  disabled={authConnected}
                  autoComplete="off"
                  list="tenantId-history"
                />
                <datalist id="tenantId-history">
                  {tenantIdHistory.map((id, idx) => (
                    <option key={idx} value={id} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label htmlFor="clientId">Client ID</label>
                <input
                  id="clientId"
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  placeholder="Application (client) ID"
                  className="form-input"
                  disabled={authConnected}
                  autoComplete="off"
                  list="clientId-history"
                />
                <datalist id="clientId-history">
                  {clientIdHistory.map((id, idx) => (
                    <option key={idx} value={id} />
                  ))}
                </datalist>
              </div>

              <div className="form-group">
                <label htmlFor="clientSecret">Client Secret</label>
                <input
                  id="clientSecret"
                  type="password"
                  value={clientSecret}
                  onChange={(e) => setClientSecret(e.target.value)}
                  placeholder="Client secret value"
                  className="form-input"
                  disabled={authConnected}
                  autoComplete="new-password"
                />
              </div>

              <button
                type="submit"
                className={`login-button ${authConnected ? 'success' : ''}`}
                disabled={busyAction !== null || authConnected}
              >
                {authConnected ? (
                  <>
                    <span className="button-icon">✓</span>
                    Authenticated
                  </>
                ) : busyAction === 'auth-save' ? (
                  <>
                    <span className="button-spinner"></span>
                    Authenticating...
                  </>
                ) : (
                  <>
                    <span className="button-icon">→</span>
                    Login
                  </>
                )}
              </button>
            </form>

            {/* Footer */}
            <div className="login-footer">
              <p>
                Need help? Check the{' '}
                <a href="#docs" onClick={(e) => { e.preventDefault(); showStatus('Documentation coming soon', 'info'); }}>
                  documentation
                </a>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default AuthPage;
