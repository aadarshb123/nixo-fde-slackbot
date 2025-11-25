import { useState } from 'react'
import type { IssueGroup, Message, Theme, Priority, WorkflowStatus } from '../types'
import { PRIORITIES, WORKFLOW_STATUSES } from '../types'
import { getCategoryColor, getSlackLink, truncateTitle } from '../utils'
import { supabase } from '../supabaseClient'

interface IssueModalProps {
  selectedGroup: IssueGroup
  groupMessages: Message[]
  loadingMessages: boolean
  darkMode: boolean
  theme: Theme
  onClose: () => void
  onToggleStatus: (groupId: string, currentStatus: string) => void
}

export default function IssueModal({
  selectedGroup,
  groupMessages,
  loadingMessages,
  darkMode,
  theme,
  onClose,
  onToggleStatus
}: IssueModalProps) {
  const [isEditingTitle, setIsEditingTitle] = useState(false)
  const [editedTitle, setEditedTitle] = useState(selectedGroup.title)
  const [isSavingTitle, setIsSavingTitle] = useState(false)
  const [showMergeModal, setShowMergeModal] = useState(false)
  const [availableGroups, setAvailableGroups] = useState<IssueGroup[]>([])
  const [isMerging, setIsMerging] = useState(false)
  const [priority, setPriority] = useState<Priority>(selectedGroup.priority || 'medium')
  const [workflowStatus, setWorkflowStatus] = useState<WorkflowStatus>(selectedGroup.workflow_status || 'backlog')

  async function handleSaveTitle() {
    if (editedTitle.trim() === '' || editedTitle === selectedGroup.title) {
      setIsEditingTitle(false)
      setEditedTitle(selectedGroup.title)
      return
    }

    setIsSavingTitle(true)
    try {
      const { error } = await supabase
        .from('issue_groups')
        .update({ title: editedTitle.trim() })
        .eq('id', selectedGroup.id)

      if (error) throw error

      // Update local state
      selectedGroup.title = editedTitle.trim()
      setIsEditingTitle(false)
    } catch (error) {
      console.error('Error updating title:', error)
      setEditedTitle(selectedGroup.title) // Revert on error
    } finally {
      setIsSavingTitle(false)
    }
  }

  function handleCancelEdit() {
    setEditedTitle(selectedGroup.title)
    setIsEditingTitle(false)
  }

  async function handleSplitMessage(messageId: string) {
    if (!confirm('Split this message into a new ticket? This will create a separate issue group.')) {
      return
    }

    try {
      // Get message details to create new group
      const message = groupMessages.find(m => m.id === messageId)
      if (!message) return

      // Create new group
      const { data: newGroup, error: groupError } = await supabase
        .from('issue_groups')
        .insert({
          title: `${message.category.charAt(0).toUpperCase() + message.category.slice(1)}: ${message.summary.slice(0, 50)}`,
          summary: message.summary,
          category: message.category,
          status: 'open'
        })
        .select()
        .single()

      if (groupError) throw groupError

      // Remove from current group
      await supabase
        .from('message_groups')
        .delete()
        .eq('message_id', messageId)
        .eq('group_id', selectedGroup.id)

      // Add to new group
      await supabase
        .from('message_groups')
        .insert({
          message_id: messageId,
          group_id: newGroup.id,
          similarity_score: 1.0
        })

      // Close modal and let dashboard refresh
      onClose()
    } catch (error) {
      console.error('Error splitting message:', error)
      alert('Failed to split message. Please try again.')
    }
  }

  async function handleOpenMergeModal() {
    try {
      const { data, error } = await supabase
        .from('issue_groups')
        .select('*')
        .neq('id', selectedGroup.id)
        .eq('status', 'open')
        .order('created_at', { ascending: false })
        .limit(20)

      if (error) throw error
      setAvailableGroups(data || [])
      setShowMergeModal(true)
    } catch (error) {
      console.error('Error fetching groups:', error)
    }
  }

  async function handleMergeIntoGroup(targetGroupId: string) {
    const targetGroup = availableGroups.find(g => g.id === targetGroupId)
    if (!targetGroup) return

    if (!confirm(`Merge ${groupMessages.length} message(s) into "${targetGroup.title}"?`)) {
      return
    }

    setIsMerging(true)
    try {
      // Move all messages to target group
      for (const msg of groupMessages) {
        await supabase
          .from('message_groups')
          .delete()
          .eq('message_id', msg.id)
          .eq('group_id', selectedGroup.id)

        await supabase
          .from('message_groups')
          .insert({
            message_id: msg.id,
            group_id: targetGroupId,
            similarity_score: msg.similarity_score || 1.0
          })
      }

      // Delete the current group
      await supabase
        .from('issue_groups')
        .delete()
        .eq('id', selectedGroup.id)

      // Close both modals
      setShowMergeModal(false)
      onClose()
    } catch (error) {
      console.error('Error merging groups:', error)
      alert('Failed to merge groups. Please try again.')
    } finally {
      setIsMerging(false)
    }
  }

  async function handleUpdatePriority(newPriority: Priority) {
    try {
      const { error } = await supabase
        .from('issue_groups')
        .update({ priority: newPriority })
        .eq('id', selectedGroup.id)

      if (error) throw error
      setPriority(newPriority)
      selectedGroup.priority = newPriority
    } catch (error) {
      console.error('Error updating priority:', error)
    }
  }

  async function handleUpdateWorkflowStatus(newStatus: WorkflowStatus) {
    try {
      const { error } = await supabase
        .from('issue_groups')
        .update({ workflow_status: newStatus })
        .eq('id', selectedGroup.id)

      if (error) throw error
      setWorkflowStatus(newStatus)
      selectedGroup.workflow_status = newStatus
    } catch (error) {
      console.error('Error updating workflow status:', error)
    }
  }

  return (
    <div
      onClick={onClose}
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
            display: 'flex',
            gap: '12px',
            alignItems: 'center',
            flexWrap: 'wrap',
            marginBottom: '16px'
          }}>
            <div style={{
              display: 'inline-block',
              padding: '8px 16px',
              backgroundColor: `${getCategoryColor(selectedGroup.category, darkMode)}20`,
              color: getCategoryColor(selectedGroup.category, darkMode),
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '700',
              textTransform: 'uppercase',
              letterSpacing: '0.05em'
            }}>
              {selectedGroup.category}
            </div>

            <button
              onClick={() => onToggleStatus(selectedGroup.id, selectedGroup.status)}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: selectedGroup.status === 'open' ? '#10B98120' : theme.accent + '20',
                color: selectedGroup.status === 'open' ? '#10B981' : theme.accent,
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span>{selectedGroup.status === 'open' ? '✓' : '↻'}</span>
              <span>{selectedGroup.status === 'open' ? 'Mark Resolved' : 'Reopen'}</span>
            </button>

            <button
              onClick={handleOpenMergeModal}
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '8px 16px',
                backgroundColor: theme.accent + '20',
                color: theme.accent,
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '700',
                cursor: 'pointer',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
              }}
            >
              <span>⇄</span>
              <span>Merge</span>
            </button>
          </div>

          {/* JIRA-lite Controls */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, 1fr)',
            gap: '16px',
            marginBottom: '24px',
            padding: '20px',
            backgroundColor: theme.hover,
            borderRadius: '12px',
            border: `1px solid ${theme.border}`
          }}>
            {/* Priority Selector */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: theme.textSecondary,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => handleUpdatePriority(e.target.value as Priority)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {PRIORITIES.map(p => (
                  <option key={p} value={p}>
                    {p.charAt(0).toUpperCase() + p.slice(1)} {p === 'critical' ? '🔴' : p === 'high' ? '🟠' : p === 'medium' ? '🟡' : '🟢'}
                  </option>
                ))}
              </select>
            </div>

            {/* Workflow Status Selector */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '13px',
                fontWeight: '600',
                color: theme.textSecondary,
                marginBottom: '8px',
                textTransform: 'uppercase',
                letterSpacing: '0.05em'
              }}>
                Status
              </label>
              <select
                value={workflowStatus}
                onChange={(e) => handleUpdateWorkflowStatus(e.target.value as WorkflowStatus)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  backgroundColor: theme.cardBg,
                  color: theme.text,
                  border: `1px solid ${theme.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                {WORKFLOW_STATUSES.map(status => (
                  <option key={status.value} value={status.value}>
                    {status.label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isEditingTitle ? (
            <div style={{ marginBottom: '12px' }}>
              <input
                type="text"
                value={editedTitle}
                onChange={(e) => setEditedTitle(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSaveTitle()
                  if (e.key === 'Escape') handleCancelEdit()
                }}
                autoFocus
                style={{
                  width: '100%',
                  fontSize: '32px',
                  fontWeight: '800',
                  color: theme.text,
                  backgroundColor: darkMode ? '#1E293B' : '#F8FAFC',
                  border: `2px solid ${theme.accent}`,
                  borderRadius: '8px',
                  padding: '8px 12px',
                  outline: 'none',
                  fontFamily: 'inherit',
                  marginBottom: '8px',
                  boxSizing: 'border-box'
                }}
              />
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveTitle}
                  disabled={isSavingTitle}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: theme.accent,
                    color: '#FFFFFF',
                    border: 'none',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: isSavingTitle ? 'not-allowed' : 'pointer',
                    opacity: isSavingTitle ? 0.6 : 1
                  }}
                >
                  {isSavingTitle ? 'Saving...' : 'Save'}
                </button>
                <button
                  onClick={handleCancelEdit}
                  disabled={isSavingTitle}
                  style={{
                    padding: '8px 16px',
                    backgroundColor: 'transparent',
                    color: theme.text,
                    border: `2px solid ${theme.border}`,
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '700',
                    cursor: isSavingTitle ? 'not-allowed' : 'pointer'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <h2
              onClick={() => setIsEditingTitle(true)}
              style={{
                fontSize: '32px',
                fontWeight: '800',
                color: theme.text,
                margin: '0 0 12px 0',
                lineHeight: '1.3',
                cursor: 'pointer',
                padding: '4px',
                borderRadius: '4px',
                transition: 'background-color 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = theme.hover
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = 'transparent'
              }}
              title="Click to edit title"
            >
              {selectedGroup.title}
            </h2>
          )}

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
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
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
                    {groupMessages.length > 1 && (
                      <button
                        onClick={() => handleSplitMessage(message.id)}
                        title="Split into new ticket"
                        style={{
                          padding: '4px 8px',
                          backgroundColor: 'transparent',
                          border: `1px solid ${theme.border}`,
                          borderRadius: '6px',
                          color: theme.textSecondary,
                          fontSize: '12px',
                          fontWeight: '700',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.borderColor = theme.accent
                          e.currentTarget.style.color = theme.accent
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.borderColor = theme.border
                          e.currentTarget.style.color = theme.textSecondary
                        }}
                      >
                        ↗ Split
                      </button>
                    )}
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
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  flexWrap: 'wrap'
                }}>
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
                  <a
                    href={getSlackLink(message.channel_id, message.timestamp)}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '6px',
                      padding: '6px 12px',
                      backgroundColor: darkMode ? '#1E293B' : '#FFFFFF',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      fontSize: '13px',
                      fontWeight: '700',
                      color: theme.accent,
                      textDecoration: 'none',
                      transition: 'all 0.2s ease'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = theme.accent + '20'
                      e.currentTarget.style.borderColor = theme.accent
                      e.currentTarget.style.transform = 'translateY(-2px)'
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = darkMode ? '#1E293B' : '#FFFFFF'
                      e.currentTarget.style.borderColor = theme.border
                      e.currentTarget.style.transform = 'translateY(0)'
                    }}
                  >
                    <svg width="16" height="16" viewBox="0 0 127 127" fill="currentColor">
                      <path d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z"/>
                      <path d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z"/>
                      <path d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z"/>
                      <path d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z"/>
                    </svg>
                    <span>View in Slack</span>
                  </a>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Merge Modal */}
        {showMergeModal && (
          <div style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setShowMergeModal(false)}
          >
            <div
              onClick={(e) => e.stopPropagation()}
              style={{
                backgroundColor: theme.cardBg,
                padding: '32px',
                borderRadius: '16px',
                maxWidth: '600px',
                width: '90%',
                maxHeight: '70vh',
                overflow: 'auto',
                border: `1px solid ${theme.border}`
              }}
            >
              <h3 style={{
                fontSize: '24px',
                fontWeight: '700',
                color: theme.text,
                marginBottom: '16px'
              }}>
                Merge into another ticket
              </h3>
              <p style={{
                fontSize: '14px',
                color: theme.textSecondary,
                marginBottom: '24px'
              }}>
                Select a ticket to merge {groupMessages.length} message(s) into. The current ticket will be deleted.
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {availableGroups.map((group) => (
                  <div
                    key={group.id}
                    onClick={() => handleMergeIntoGroup(group.id)}
                    style={{
                      padding: '16px',
                      backgroundColor: darkMode ? '#1E293B' : '#F8FAFC',
                      border: `1px solid ${theme.border}`,
                      borderRadius: '8px',
                      cursor: isMerging ? 'not-allowed' : 'pointer',
                      transition: 'all 0.2s ease',
                      opacity: isMerging ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!isMerging) {
                        e.currentTarget.style.borderColor = theme.accent
                        e.currentTarget.style.backgroundColor = theme.accent + '10'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!isMerging) {
                        e.currentTarget.style.borderColor = theme.border
                        e.currentTarget.style.backgroundColor = darkMode ? '#1E293B' : '#F8FAFC'
                      }
                    }}
                  >
                    <div style={{
                      fontSize: '14px',
                      fontWeight: '700',
                      color: theme.text,
                      marginBottom: '4px'
                    }}>
                      {truncateTitle(group.title, 12).truncated}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: theme.textSecondary
                    }}>
                      {group.category} • {new Date(group.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>

              <button
                onClick={() => setShowMergeModal(false)}
                disabled={isMerging}
                style={{
                  marginTop: '24px',
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: theme.text,
                  border: `2px solid ${theme.border}`,
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '700',
                  cursor: isMerging ? 'not-allowed' : 'pointer',
                  width: '100%'
                }}
              >
                {isMerging ? 'Merging...' : 'Cancel'}
              </button>
            </div>
          </div>
        )}

        <button
          onClick={onClose}
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
  )
}
