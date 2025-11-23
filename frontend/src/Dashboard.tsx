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

interface Message {
  id: string
  text: string
  user_name: string
  channel_name: string
  timestamp: string
  summary: string
  confidence: number
}

const CATEGORIES = ['all', 'support', 'bug', 'feature', 'question'] as const
type CategoryFilter = typeof CATEGORIES[number]

export default function Dashboard() {
  const [issueGroups, setIssueGroups] = useState<IssueGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<IssueGroup | null>(null)
  const [groupMessages, setGroupMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

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

  async function fetchGroupMessages(groupId: string) {
    try {
      setLoadingMessages(true)
      const { data, error } = await supabase
        .from('message_groups')
        .select('messages(*)')
        .eq('group_id', groupId)

      if (error) throw error

      // Extract messages from the join result
      const messages = data?.map(row => row.messages).filter(Boolean) || []
      setGroupMessages(messages as Message[])
    } catch (err) {
      console.error('Error fetching messages:', err)
    } finally {
      setLoadingMessages(false)
    }
  }

  function openGroupDetails(group: IssueGroup) {
    setSelectedGroup(group)
    fetchGroupMessages(group.id)
  }

  function closeModal() {
    setSelectedGroup(null)
    setGroupMessages([])
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
            onClick={() => openGroupDetails(group)}
            style={{
              border: '1px solid #ccc',
              padding: '15px',
              marginBottom: '10px',
              borderRadius: '5px',
              cursor: 'pointer',
              transition: 'background-color 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f5f5f5'}
            onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
          >
            <h3>{group.title}</h3>
            <p><strong>Category:</strong> {group.category}</p>
            <p><strong>Status:</strong> {group.status}</p>
            <p><strong>Summary:</strong> {group.summary}</p>
            <p style={{ fontSize: '12px', color: '#666' }}>
              Created: {new Date(group.created_at).toLocaleString()}
            </p>
            <p style={{ fontSize: '12px', color: '#646cff', marginTop: '10px' }}>
              Click to view messages →
            </p>
          </div>
        ))}
      </div>

      {/* Modal for message details */}
      {selectedGroup && (
        <div
          onClick={closeModal}
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              backgroundColor: 'white',
              padding: '30px',
              borderRadius: '8px',
              maxWidth: '800px',
              maxHeight: '80vh',
              overflow: 'auto',
              width: '90%'
            }}
          >
            <h2>{selectedGroup.title}</h2>
            <p><strong>Category:</strong> {selectedGroup.category}</p>
            <p><strong>Status:</strong> {selectedGroup.status}</p>
            <p>{selectedGroup.summary}</p>

            <hr style={{ margin: '20px 0' }} />

            <h3>Messages ({groupMessages.length})</h3>

            {loadingMessages ? (
              <p>Loading messages...</p>
            ) : groupMessages.length === 0 ? (
              <p>No messages in this group</p>
            ) : (
              <div style={{ marginTop: '15px' }}>
                {groupMessages.map((message) => (
                  <div
                    key={message.id}
                    style={{
                      border: '1px solid #eee',
                      padding: '15px',
                      marginBottom: '10px',
                      borderRadius: '4px',
                      backgroundColor: '#fafafa'
                    }}
                  >
                    <p style={{ fontWeight: 'bold', marginBottom: '8px' }}>
                      {message.user_name} in #{message.channel_name}
                    </p>
                    <p style={{ marginBottom: '8px' }}>{message.text}</p>
                    <p style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>
                      Summary: {message.summary}
                    </p>
                    <p style={{ fontSize: '12px', color: '#666' }}>
                      {new Date(message.timestamp).toLocaleString()} • Confidence: {(message.confidence * 100).toFixed(0)}%
                    </p>
                  </div>
                ))}
              </div>
            )}

            <button
              onClick={closeModal}
              style={{
                marginTop: '20px',
                padding: '10px 20px',
                backgroundColor: '#646cff',
                color: 'white',
                border: 'none',
                borderRadius: '4px',
                cursor: 'pointer'
              }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
