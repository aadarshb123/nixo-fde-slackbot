import type { Theme } from '../types'

interface HeaderProps {
  darkMode: boolean
  theme: Theme
  onToggleDarkMode: () => void
}

export default function Header({ darkMode, theme, onToggleDarkMode }: HeaderProps) {
  return (
    <div style={{
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '48px'
    }}>
      <div>
        <h1 style={{
          fontSize: '48px',
          fontWeight: '900',
          color: theme.accent,
          margin: '0 0 12px 0',
          letterSpacing: '-0.03em',
          textShadow: darkMode
            ? '0 2px 8px rgba(30, 64, 175, 0.4), 0 4px 16px rgba(30, 64, 175, 0.2)'
            : '0 2px 8px rgba(30, 58, 138, 0.3), 0 4px 16px rgba(30, 58, 138, 0.1)',
        }}>
          FDE Dashboard
        </h1>
        <p style={{
          fontSize: '18px',
          color: theme.textSecondary,
          margin: 0,
          fontWeight: '500'
        }}>
          Monitor and manage customer issues in real-time
        </p>
      </div>

      <button
        onClick={onToggleDarkMode}
        style={{
          padding: '12px 24px',
          backgroundColor: theme.cardBg,
          border: `2px solid ${theme.border}`,
          borderRadius: '12px',
          color: theme.text,
          fontSize: '16px',
          fontWeight: '600',
          cursor: 'pointer',
          boxShadow: darkMode
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          transition: 'all 0.2s ease'
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'translateY(-2px)'
          e.currentTarget.style.boxShadow = darkMode
            ? '0 10px 15px -3px rgba(0, 0, 0, 0.4), 0 4px 6px -2px rgba(0, 0, 0, 0.3)'
            : '0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'translateY(0)'
          e.currentTarget.style.boxShadow = darkMode
            ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
            : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        }}
      >
        {darkMode ? '☀️ Light' : '🌙 Dark'}
      </button>
    </div>
  )
}
