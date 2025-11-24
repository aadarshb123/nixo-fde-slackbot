import type { IssueGroup, Theme, Priority } from '../types'
import { getCategoryColor, truncateTitle } from '../utils'
import { WORKFLOW_STATUSES } from '../types'

interface IssueCardProps {
  group: IssueGroup
  messageCount: number
  darkMode: boolean
  theme: Theme
  onCardClick: (group: IssueGroup) => void
}

// Helper function to get priority color
function getPriorityColor(priority: Priority): string {
  switch (priority) {
    case 'critical':
      return '#EF4444' // Red
    case 'high':
      return '#F59E0B' // Orange
    case 'medium':
      return '#F59E0B' // Yellow
    case 'low':
      return '#10B981' // Green
    default:
      return '#6B7280' // Gray
  }
}

// Helper function to get priority emoji
function getPriorityEmoji(priority: Priority): string {
  switch (priority) {
    case 'critical':
      return '🔴'
    case 'high':
      return '🟠'
    case 'medium':
      return '🟡'
    case 'low':
      return '🟢'
    default:
      return '⚪'
  }
}

export default function IssueCard({
  group,
  messageCount,
  darkMode,
  theme,
  onCardClick
}: IssueCardProps) {
  return (
    <div
      onClick={() => onCardClick(group)}
      style={{
        backgroundColor: theme.cardBg,
        padding: '28px',
        borderRadius: '16px',
        border: `1px solid ${theme.border}`,
        cursor: 'pointer',
        transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
        boxShadow: darkMode
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        position: 'relative',
        overflow: 'hidden'
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'translateY(-4px) scale(1.02)'
        e.currentTarget.style.boxShadow = darkMode
          ? '0 20px 25px -5px rgba(0, 0, 0, 0.4), 0 10px 10px -5px rgba(0, 0, 0, 0.3)'
          : '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
        e.currentTarget.style.borderColor = getCategoryColor(group.category, darkMode) || theme.accent
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'translateY(0) scale(1)'
        e.currentTarget.style.boxShadow = darkMode
          ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
          : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
        e.currentTarget.style.borderColor = theme.border
      }}
    >
      {/* Category badge, priority badge, and message count */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{
          display: 'inline-block',
          padding: '6px 14px',
          backgroundColor: `${getCategoryColor(group.category, darkMode)}20`,
          color: getCategoryColor(group.category, darkMode),
          borderRadius: '8px',
          fontSize: '13px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          {group.category}
        </div>
        {group.priority && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '6px 12px',
            backgroundColor: `${getPriorityColor(group.priority)}20`,
            color: getPriorityColor(group.priority),
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            <span>{getPriorityEmoji(group.priority)}</span>
            <span>{group.priority}</span>
          </div>
        )}
        {messageCount > 0 && (
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '6px 12px',
            backgroundColor: theme.accent + '20',
            color: theme.accent,
            borderRadius: '8px',
            fontSize: '13px',
            fontWeight: '700'
          }}>
            <span>💬</span>
            <span>{messageCount}</span>
          </div>
        )}
      </div>

      <h3
        title={group.title}
        style={{
          fontSize: '20px',
          fontWeight: '700',
          color: theme.text,
          margin: '0 0 12px 0',
          lineHeight: '1.4',
          cursor: 'default'
        }}
      >
        {truncateTitle(group.title, 8).truncated}
      </h3>

      <p style={{
        fontSize: '15px',
        color: theme.textSecondary,
        margin: '0 0 20px 0',
        lineHeight: '1.6'
      }}>
        {group.summary}
      </p>

      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingTop: '16px',
        borderTop: `1px solid ${theme.border}`
      }}>
        <div style={{
          fontSize: '13px',
          color: theme.textSecondary,
          fontWeight: '600'
        }}>
          {new Date(group.created_at).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric'
          })}
        </div>
        <div style={{
          fontSize: '14px',
          color: theme.accent,
          fontWeight: '700',
          display: 'flex',
          alignItems: 'center',
          gap: '6px'
        }}>
          View Details →
        </div>
      </div>
    </div>
  )
}
