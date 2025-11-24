import { CATEGORIES, TIME_FILTERS } from '../types'
import type { CategoryFilter, TimeFilter, IssueGroup, Theme } from '../types'

interface CombinedFiltersProps {
  selectedCategory: CategoryFilter
  selectedTimeFilter: TimeFilter
  issueGroups: IssueGroup[]
  darkMode: boolean
  theme: Theme
  onCategoryChange: (category: CategoryFilter) => void
  onTimeFilterChange: (filter: TimeFilter) => void
}

export default function CombinedFilters({
  selectedCategory,
  selectedTimeFilter,
  issueGroups,
  darkMode,
  theme,
  onCategoryChange,
  onTimeFilterChange
}: CombinedFiltersProps) {
  return (
    <div style={{
      backgroundColor: theme.cardBg,
      padding: '24px 32px',
      borderRadius: '16px',
      marginBottom: '32px',
      border: `1px solid ${theme.border}`,
      boxShadow: darkMode
        ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
        : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
    }}>
      {/* Category Filters */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{
          fontSize: '14px',
          fontWeight: '700',
          color: theme.text,
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Category
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {CATEGORIES.map((category) => (
            <button
              key={category}
              onClick={() => onCategoryChange(category)}
              style={{
                padding: '10px 24px',
                backgroundColor: selectedCategory === category ? theme.accent : 'transparent',
                color: selectedCategory === category ? '#FFFFFF' : theme.text,
                border: selectedCategory === category ? 'none' : `2px solid ${theme.border}`,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'capitalize',
                transition: 'all 0.2s ease',
                boxShadow: selectedCategory === category
                  ? '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)'
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = theme.hover
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedCategory !== category) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {category}
              {category !== 'all' && ` (${issueGroups.filter(g => g.category === category).length})`}
            </button>
          ))}
        </div>
      </div>

      {/* Divider */}
      <div style={{
        height: '1px',
        backgroundColor: theme.border,
        marginBottom: '24px'
      }} />

      {/* Time Filters */}
      <div>
        <div style={{
          fontSize: '14px',
          fontWeight: '700',
          color: theme.text,
          marginBottom: '16px',
          textTransform: 'uppercase',
          letterSpacing: '0.05em'
        }}>
          Time Range
        </div>
        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          {TIME_FILTERS.map((filter) => (
            <button
              key={filter.value}
              onClick={() => onTimeFilterChange(filter.value)}
              style={{
                padding: '10px 24px',
                backgroundColor: selectedTimeFilter === filter.value ? theme.accent : 'transparent',
                color: selectedTimeFilter === filter.value ? '#FFFFFF' : theme.text,
                border: selectedTimeFilter === filter.value ? 'none' : `2px solid ${theme.border}`,
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: selectedTimeFilter === filter.value
                  ? '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)'
                  : 'none'
              }}
              onMouseEnter={(e) => {
                if (selectedTimeFilter !== filter.value) {
                  e.currentTarget.style.backgroundColor = theme.hover
                  e.currentTarget.style.transform = 'translateY(-2px)'
                }
              }}
              onMouseLeave={(e) => {
                if (selectedTimeFilter !== filter.value) {
                  e.currentTarget.style.backgroundColor = 'transparent'
                  e.currentTarget.style.transform = 'translateY(0)'
                }
              }}
            >
              {filter.label}
            </button>
          ))}
        </div>
      </div>
    </div>
  )
}
