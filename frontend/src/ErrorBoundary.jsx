import React from 'react'

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props)
    this.state = { hasError: false, error: null }
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error }
  }

  componentDidCatch(error, errorInfo) {
    console.error('ErrorBoundary caught an error in chat area:', error, errorInfo)
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null })
    if (this.props.onReset) {
      this.props.onReset()
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '100%',
            padding: 32,
            textAlign: 'center',
            background: 'var(--tg-chat-bg, #0f172a)',
            color: '#f8fafc',
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: '50%',
              background: 'rgba(239, 68, 68, 0.15)',
              color: '#ef4444',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              marginBottom: 16,
            }}
          >
            ⚠️
          </div>
          <h3 style={{ fontSize: 18, fontWeight: 600, marginBottom: 8 }}>
            Không thể tải cuộc trò chuyện này
          </h3>
          <p style={{ fontSize: 13, color: '#94a3b8', maxWidth: 420, marginBottom: 20 }}>
            Đã xảy ra sự cố khi hiển thị tin nhắn. Bạn hãy bấm thử lại hoặc chọn một đoạn chat khác.
          </p>
          <button
            type="button"
            onClick={this.handleReset}
            style={{
              padding: '8px 20px',
              borderRadius: 8,
              background: '#3b82f6',
              color: '#ffffff',
              border: 'none',
              fontWeight: 600,
              fontSize: 14,
              cursor: 'pointer',
              transition: 'background 0.2s',
            }}
          >
            Thử lại
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
export default ErrorBoundary
