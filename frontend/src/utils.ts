import type { Theme, TimeFilter, IssueGroup, CategoryFilter } from './types'
import { CATEGORY_COLORS } from './constants'

export function getTheme(darkMode: boolean): Theme {
  return {
    bg: darkMode ? '#1c1c1c' : '#fafafa',
    cardBg: darkMode ? '#2a2a2a' : '#ffffff',
    text: darkMode ? '#ffffff' : '#1c1c1c',
    textSecondary: darkMode ? '#bdbdbd' : '#6d6d6d',
    border: darkMode ? '#3a3a3a' : '#eee',
    hover: darkMode ? '#3a3a3a' : '#f4f4f4',
    accent: darkMode ? '#e84a9a' : '#c41a76',
  }
}

export function getCategoryColor(category: string, darkMode: boolean): string {
  const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
  return darkMode ? colors?.dark : colors?.light
}

export function getTimeFilterDate(filter: TimeFilter): Date | null {
  if (filter === 'all') return null

  const now = new Date()
  switch (filter) {
    case '24h':
      return new Date(now.getTime() - 24 * 60 * 60 * 1000)
    case '7d':
      return new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    case '30d':
      return new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    default:
      return null
  }
}

export function filterIssueGroups(
  groups: IssueGroup[],
  selectedCategory: CategoryFilter,
  selectedTimeFilter: TimeFilter,
  searchQuery: string
): IssueGroup[] {
  return groups
    .filter(group => selectedCategory === 'all' || group.category === selectedCategory)
    .filter(group => {
      const timeFilterDate = getTimeFilterDate(selectedTimeFilter)
      if (!timeFilterDate) return true
      return new Date(group.created_at) >= timeFilterDate
    })
    .filter(group => {
      if (!searchQuery.trim()) return true
      const query = searchQuery.toLowerCase()
      return (
        group.title.toLowerCase().includes(query) ||
        group.summary.toLowerCase().includes(query)
      )
    })
}

export function getSlackLink(channelId: string, timestamp: string): string {
  return `https://slack.com/app_redirect?channel=${channelId}&message_ts=${timestamp}`
}
