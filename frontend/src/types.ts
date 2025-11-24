export type Priority = 'critical' | 'high' | 'medium' | 'low'
export type WorkflowStatus = 'backlog' | 'todo' | 'in_progress' | 'blocked' | 'resolved' | 'closed'

export interface IssueGroup {
  id: string
  title: string
  summary: string
  category: string
  status: string  // Legacy field (keeping for backwards compatibility)
  priority: Priority
  workflow_status: WorkflowStatus
  assignee: string | null
  due_date: string | null
  created_at: string
  updated_at: string
}

export interface Message {
  id: string
  text: string
  user_name: string
  channel_name: string
  channel_id: string
  timestamp: string
  summary: string
  confidence: number
}

export const CATEGORIES = ['all', 'support', 'bug', 'feature', 'question'] as const

export const PRIORITIES: Priority[] = ['critical', 'high', 'medium', 'low']

export const WORKFLOW_STATUSES: { value: WorkflowStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: '#6B7280' },
  { value: 'todo', label: 'To Do', color: '#3B82F6' },
  { value: 'in_progress', label: 'In Progress', color: '#F59E0B' },
  { value: 'blocked', label: 'Blocked', color: '#EF4444' },
  { value: 'resolved', label: 'Resolved', color: '#10B981' },
  { value: 'closed', label: 'Closed', color: '#6B7280' },
]

export const TIME_FILTERS = [
  { label: 'All time', value: 'all' },
  { label: 'Last 24 hours', value: '24h' },
  { label: 'Last 7 days', value: '7d' },
  { label: 'Last 30 days', value: '30d' },
] as const

export type CategoryFilter = typeof CATEGORIES[number]
export type TimeFilter = typeof TIME_FILTERS[number]['value']

export interface Toast {
  id: string
  title: string
  category: string
}

export interface Theme {
  bg: string
  cardBg: string
  text: string
  textSecondary: string
  border: string
  hover: string
  accent: string
}
