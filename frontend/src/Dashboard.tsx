import { useEffect, useState } from 'react'
import { supabase } from './supabaseClient'

interface IssueGroup {
  id: string
  title: string
  summary: string
  category: string
  status: string
  created_at: string
  updated_at: string
}

const CATEGORIES = ['all', 'support', 'bug', 'feature', 'question'] as const
type CategoryFilter = typeof CATEGORIES[number]

export default function Dashboard() {
  const [issueGroups, setIssueGroups] = useState<IssueGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')

  useEffect(() => {
    fetchIssueGroups()

    // Subscribe to real-time changes
    const subscription = supabase
      .channel('issue_groups_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issue_groups'
        },
        () => {
          // Refetch when any change occurs
          fetchIssueGroups()
        }
      )
      .subscribe()

    // Cleanup subscription on unmount
    return () => {
      subscription.unsubscribe()
    }
  }, [])

  async function fetchIssueGroups() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('issue_groups')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setIssueGroups(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div style={{ padding: '20px' }}>Loading issue groups...</div>
  }

  if (error) {
    return <div style={{ padding: '20px', color: 'red' }}>Error: {error}</div>
  }

  // Filter groups by category
  const filteredGroups = selectedCategory === 'all'
    ? issueGroups
    : issueGroups.filter(group => group.category === selectedCategory)

  return (
    <div style={{ padding: '20px' }}>
      <h1>FDE Dashboard - Issue Groups</h1>

      {/* Category Filter */}
      <div style={{ marginTop: '20px', marginBottom: '20px' }}>
        <strong>Filter by category: </strong>
        {CATEGORIES.map((category) => (
          <button
            key={category}
            onClick={() => setSelectedCategory(category)}
            style={{
              marginLeft: '10px',
              padding: '8px 16px',
              backgroundColor: selectedCategory === category ? '#646cff' : '#f0f0f0',
              color: selectedCategory === category ? 'white' : 'black',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer',
              textTransform: 'capitalize'
            }}
          >
            {category}
          </button>
        ))}
      </div>

      <p>
        Showing {filteredGroups.length} of {issueGroups.length} groups
        {selectedCategory !== 'all' && ` (${selectedCategory})`}
      </p>

      <div style={{ marginTop: '20px' }}>
        {filteredGroups.map((group) => (
          <div
            key={group.id}
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '5px'
            }}
          >
            <h3>{group.title}</h3>
            <p><strong>Category:</strong> {group.category}</p>
            <p><strong>Status:</strong> {group.status}</p>
            <p><strong>Summary:</strong> {group.summary}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Created: {new Date(group.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>
    </div>
  )
}
