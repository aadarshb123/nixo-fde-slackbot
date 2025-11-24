import { useState } from 'react'
import type { CategoryFilter, TimeFilter, IssueGroup } from './types'
import { getTheme, filterIssueGroups } from './utils'
import { useIssueGroups, useGroupMessages } from './hooks/useIssueGroups'
import { useToasts } from './hooks/useToasts'
import Header from './components/Header'
import SearchBar from './components/SearchBar'
import StatsCards from './components/StatsCards'
import CombinedFilters from './components/CombinedFilters'
import IssueCard from './components/IssueCard'
import IssueModal from './components/IssueModal'
import ToastContainer from './components/ToastContainer'

export default function Dashboard() {
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [selectedTimeFilter, setSelectedTimeFilter] = useState<TimeFilter>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedGroup, setSelectedGroup] = useState<IssueGroup | null>(null)
  const [darkMode, setDarkMode] = useState(false)

  const { toasts, showToast, dismissToast } = useToasts()
  const { issueGroups, loading, error, messageCounts, toggleGroupStatus } = useIssueGroups(showToast)
  const { groupMessages, loadingMessages, fetchGroupMessages, clearMessages } = useGroupMessages()

  const theme = getTheme(darkMode)

  function openGroupDetails(group: IssueGroup) {
    setSelectedGroup(group)
    fetchGroupMessages(group.id)
  }

  function closeModal() {
    setSelectedGroup(null)
    clearMessages()
  }

  async function handleToggleStatus(groupId: string, currentStatus: string) {
    await toggleGroupStatus(groupId, currentStatus)

    if (selectedGroup && selectedGroup.id === groupId) {
      const newStatus = currentStatus === 'open' ? 'resolved' : 'open'
      setSelectedGroup({ ...selectedGroup, status: newStatus })
    }
  }

  const filteredGroups = filterIssueGroups(
    issueGroups,
    selectedCategory,
    selectedTimeFilter,
    searchQuery
  )

  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: theme.text,
        fontSize: '18px',
        fontWeight: '500'
      }}>
        Loading issue groups...
      </div>
    )
  }

  if (error) {
    return (
      <div style={{
        minHeight: '100vh',
        backgroundColor: theme.bg,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#EF4444',
        fontSize: '18px',
        fontWeight: '500'
      }}>
        Error: {error}
      </div>
    )
  }

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: theme.bg,
      padding: '48px 48px',
      transition: 'background-color 0.3s ease'
    }}>
      <div style={{ maxWidth: '100%', margin: '0 auto' }}>
        <Header
          darkMode={darkMode}
          theme={theme}
          onToggleDarkMode={() => setDarkMode(!darkMode)}
        />

        <StatsCards
          issueGroups={issueGroups}
          darkMode={darkMode}
          theme={theme}
        />

        <SearchBar
          searchQuery={searchQuery}
          darkMode={darkMode}
          theme={theme}
          onSearchChange={setSearchQuery}
        />

        <CombinedFilters
          selectedCategory={selectedCategory}
          selectedTimeFilter={selectedTimeFilter}
          issueGroups={issueGroups}
          darkMode={darkMode}
          theme={theme}
          onCategoryChange={setSelectedCategory}
          onTimeFilterChange={setSelectedTimeFilter}
        />

        {/* Issue Groups */}
        <div style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))'
        }}>
          {filteredGroups.map((group) => (
            <IssueCard
              key={group.id}
              group={group}
              messageCount={messageCounts[group.id] || 0}
              darkMode={darkMode}
              theme={theme}
              onCardClick={openGroupDetails}
            />
          ))}
        </div>

        {filteredGroups.length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '80px 20px',
            color: theme.textSecondary,
            fontSize: '18px',
            fontWeight: '600'
          }}>
            No {selectedCategory !== 'all' ? selectedCategory : ''} issues found
          </div>
        )}

        {selectedGroup && (
          <IssueModal
            selectedGroup={selectedGroup}
            groupMessages={groupMessages}
            loadingMessages={loadingMessages}
            darkMode={darkMode}
            theme={theme}
            onClose={closeModal}
            onToggleStatus={handleToggleStatus}
          />
        )}

        <ToastContainer
          toasts={toasts}
          darkMode={darkMode}
          theme={theme}
          onDismiss={dismissToast}
        />
      </div>
    </div>
  )
}
