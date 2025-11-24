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

const CATEGORY_COLORS = {
  support: { light: '#8B5CF6', dark: '#A78BFA' },
  bug: { light: '#EF4444', dark: '#F87171' },
  feature: { light: '#3B82F6', dark: '#60A5FA' },
  question: { light: '#10B981', dark: '#34D399' },
}

export default function Dashboard() {
  const [issueGroups, setIssueGroups] = useState<IssueGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedCategory, setSelectedCategory] = useState<CategoryFilter>('all')
  const [selectedGroup, setSelectedGroup] = useState<IssueGroup | null>(null)
  const [groupMessages, setGroupMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    fetchIssueGroups()

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
          fetchIssueGroups()
        }
      )
      .subscribe()

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

  const filteredGroups = selectedCategory === 'all'
    ? issueGroups
    : issueGroups.filter(group => group.category === selectedCategory)

  const getCategoryColor = (category: string) => {
    const colors = CATEGORY_COLORS[category as keyof typeof CATEGORY_COLORS]
    return darkMode ? colors?.dark : colors?.light
  }

  const theme = {
    bg: darkMode ? '#0F172A' : '#F8FAFC',
    cardBg: darkMode ? '#1E293B' : '#FFFFFF',
    text: darkMode ? '#F1F5F9' : '#0F172A',
    textSecondary: darkMode ? '#94A3B8' : '#64748B',
    border: darkMode ? '#334155' : '#E2E8F0',
    hover: darkMode ? '#334155' : '#F1F5F9',
    accent: darkMode ? '#818CF8' : '#6366F1',
  }

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
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '48px'
        }}>
          <div>
            <h1 style={{
              fontSize: '42px',
              fontWeight: '800',
              color: theme.text,
              margin: '0 0 12px 0',
              letterSpacing: '-0.02em'
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

          {/* Dark mode toggle */}
          <button
            onClick={() => setDarkMode(!darkMode)}
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

        {/* Stats */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '24px',
          marginBottom: '48px'
        }}>
          <div style={{
            backgroundColor: theme.cardBg,
            padding: '32px',
            borderRadius: '16px',
            border: `1px solid ${theme.border}`,
            boxShadow: darkMode
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: theme.accent, marginBottom: '8px' }}>
              {issueGroups.length}
            </div>
            <div style={{ fontSize: '16px', color: theme.textSecondary, fontWeight: '600' }}>
              Total Groups
            </div>
          </div>
          <div style={{
            backgroundColor: theme.cardBg,
            padding: '32px',
            borderRadius: '16px',
            border: `1px solid ${theme.border}`,
            boxShadow: darkMode
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: '#EF4444', marginBottom: '8px' }}>
              {issueGroups.filter(g => g.category === 'bug').length}
            </div>
            <div style={{ fontSize: '16px', color: theme.textSecondary, fontWeight: '600' }}>
              Bug Reports
            </div>
          </div>
          <div style={{
            backgroundColor: theme.cardBg,
            padding: '32px',
            borderRadius: '16px',
            border: `1px solid ${theme.border}`,
            boxShadow: darkMode
              ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
              : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
          }}>
            <div style={{ fontSize: '48px', fontWeight: '800', color: '#10B981', marginBottom: '8px' }}>
              {issueGroups.filter(g => g.status === 'open').length}
            </div>
            <div style={{ fontSize: '16px', color: theme.textSecondary, fontWeight: '600' }}>
              Open Issues
            </div>
          </div>
        </div>

        {/* Category Filter */}
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
          <div style={{
            fontSize: '16px',
            fontWeight: '700',
            color: theme.text,
            marginBottom: '20px',
            textTransform: 'uppercase',
            letterSpacing: '0.05em'
          }}>
            Filter by Category
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {CATEGORIES.map((category) => (
              <button
                key={category}
                onClick={() => setSelectedCategory(category)}
                style={{
                  padding: '12px 28px',
                  backgroundColor: selectedCategory === category ? theme.accent : 'transparent',
                  color: selectedCategory === category ? '#FFFFFF' : theme.text,
                  border: selectedCategory === category ? 'none' : `2px solid ${theme.border}`,
                  borderRadius: '10px',
                  fontSize: '15px',
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

        {/* Issue Groups */}
        <div style={{
          display: 'grid',
          gap: '24px',
          gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))'
        }}>
          {filteredGroups.map((group) => (
            <div
              key={group.id}
              onClick={() => openGroupDetails(group)}
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
                e.currentTarget.style.borderColor = getCategoryColor(group.category) || theme.accent
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0) scale(1)'
                e.currentTarget.style.boxShadow = darkMode
                  ? '0 4px 6px -1px rgba(0, 0, 0, 0.3), 0 2px 4px -1px rgba(0, 0, 0, 0.2)'
                  : '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                e.currentTarget.style.borderColor = theme.border
              }}
            >
              {/* Category badge */}
              <div style={{
                display: 'inline-block',
                padding: '6px 14px',
                backgroundColor: `${getCategoryColor(group.category)}20`,
                color: getCategoryColor(group.category),
                borderRadius: '8px',
                fontSize: '13px',
                fontWeight: '700',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                marginBottom: '16px'
              }}>
                {group.category}
              </div>

              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: theme.text,
                margin: '0 0 12px 0',
                lineHeight: '1.4'
              }}>
                {group.title}
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

        {/* Modal */}
        {selectedGroup && (
          <div
            onClick={closeModal}
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.7)',
              backdropFilter: 'blur(4px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
              padding: '20px'
            }}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: theme.cardBg,
                padding: '40px',
                borderRadius: '24px',
                maxWidth: '900px',
                maxHeight: '85vh',
                overflow: 'auto',
                width: '100%',
                boxShadow: darkMode
                  ? '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
                  : '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
                border: `1px solid ${theme.border}`
              }}
            >
              {/* Modal header */}
              <div style={{ marginBottom: '32px' }}>
                <div style={{
                  display: 'inline-block',
                  padding: '8px 16px',
                  backgroundColor: `${getCategoryColor(selectedGroup.category)}20`,
                  color: getCategoryColor(selectedGroup.category),
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  textTransform: 'uppercase',
                  letterSpacing: '0.05em',
                  marginBottom: '16px'
                }}>
                  {selectedGroup.category}
                </div>

                <h2 style={{
                  fontSize: '32px',
                  fontWeight: '800',
                  color: theme.text,
                  margin: '0 0 12px 0',
                  lineHeight: '1.3'
                }}>
                  {selectedGroup.title}
                </h2>

                <p style={{
                  fontSize: '16px',
                  color: theme.textSecondary,
                  margin: 0,
                  lineHeight: '1.6'
                }}>
                  {selectedGroup.summary}
                </p>
              </div>

              <div style={{
                height: '1px',
                backgroundColor: theme.border,
                margin: '32px 0'
              }} />

              <h3 style={{
                fontSize: '20px',
                fontWeight: '700',
                color: theme.text,
                marginBottom: '24px'
              }}>
                Messages ({groupMessages.length})
              </h3>

              {loadingMessages ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: theme.textSecondary,
                  fontSize: '16px'
                }}>
                  Loading messages...
                </div>
              ) : groupMessages.length === 0 ? (
                <div style={{
                  textAlign: 'center',
                  padding: '40px',
                  color: theme.textSecondary,
                  fontSize: '16px'
                }}>
                  No messages in this group
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {groupMessages.map((message) => (
                    <div
                      key={message.id}
                      style={{
                        backgroundColor: darkMode ? '#0F172A' : '#F8FAFC',
                        padding: '24px',
                        borderRadius: '12px',
                        border: `1px solid ${theme.border}`
                      }}
                    >
                      <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'start',
                        marginBottom: '12px'
                      }}>
                        <div>
                          <div style={{
                            fontWeight: '700',
                            color: theme.text,
                            fontSize: '15px',
                            marginBottom: '4px'
                          }}>
                            {message.user_name}
                          </div>
                          <div style={{
                            fontSize: '13px',
                            color: theme.textSecondary,
                            fontWeight: '600'
                          }}>
                            #{message.channel_name}
                          </div>
                        </div>
                        <div style={{
                          fontSize: '13px',
                          color: theme.textSecondary,
                          fontWeight: '600'
                        }}>
                          {new Date(message.timestamp).toLocaleDateString('en-US', {
                            month: 'short',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>

                      <p style={{
                        fontSize: '15px',
                        color: theme.text,
                        margin: '0 0 12px 0',
                        lineHeight: '1.6',
                        fontWeight: '500'
                      }}>
                        {message.text}
                      </p>

                      <div style={{
                        fontSize: '13px',
                        color: theme.textSecondary,
                        fontStyle: 'italic',
                        marginBottom: '8px'
                      }}>
                        Summary: {message.summary}
                      </div>

                      <div style={{
                        display: 'inline-block',
                        padding: '4px 10px',
                        backgroundColor: theme.accent + '20',
                        color: theme.accent,
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '700'
                      }}>
                        {(message.confidence * 100).toFixed(0)}% confidence
                      </div>
                    </div>
                  ))}
                </div>
              )}

              <button
                onClick={closeModal}
                style={{
                  marginTop: '32px',
                  padding: '14px 32px',
                  backgroundColor: theme.accent,
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '12px',
                  fontSize: '16px',
                  fontWeight: '700',
                  cursor: 'pointer',
                  width: '100%',
                  boxShadow: '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)'
                  e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(99, 102, 241, 0.4), 0 4px 6px -2px rgba(99, 102, 241, 0.3)'
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)'
                  e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(99, 102, 241, 0.3), 0 2px 4px -1px rgba(99, 102, 241, 0.2)'
                }}
              >
                Close
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
