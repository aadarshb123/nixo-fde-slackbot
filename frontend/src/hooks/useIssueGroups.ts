import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import type { IssueGroup, Message } from '../types'

export function useIssueGroups(onNewGroup: (group: IssueGroup) => void) {
  const [issueGroups, setIssueGroups] = useState<IssueGroup[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [messageCounts, setMessageCounts] = useState<Record<string, number>>({})

  async function fetchIssueGroups() {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('issue_groups')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error

      setIssueGroups(data || [])
      await fetchMessageCounts(data || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  async function fetchMessageCounts(groups: IssueGroup[]) {
    try {
      const { data, error } = await supabase
        .from('message_groups')
        .select('group_id')

      if (error) throw error

      const counts: Record<string, number> = {}
      data?.forEach((row) => {
        counts[row.group_id] = (counts[row.group_id] || 0) + 1
      })

      setMessageCounts(counts)
    } catch (err) {
      console.error('Error fetching message counts:', err)
    }
  }

  async function toggleGroupStatus(groupId: string, currentStatus: string) {
    const newStatus = currentStatus === 'open' ? 'resolved' : 'open'

    try {
      const { error } = await supabase
        .from('issue_groups')
        .update({ status: newStatus })
        .eq('id', groupId)

      if (error) throw error

      setIssueGroups(prev =>
        prev.map(group =>
          group.id === groupId ? { ...group, status: newStatus } : group
        )
      )
    } catch (err) {
      console.error('Error updating status:', err)
    }
  }

  useEffect(() => {
    fetchIssueGroups()

    // Subscribe to both issue_groups AND message_groups for real-time updates
    const subscription = supabase
      .channel('realtime_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'issue_groups'
        },
        (payload) => {
          if (payload.eventType === 'INSERT' && payload.new) {
            const newGroup = payload.new as IssueGroup
            onNewGroup(newGroup)
          }
          // Refetch everything when issue_groups change
          fetchIssueGroups()
        }
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'message_groups'
        },
        () => {
          // When a message is added to a group, refetch to update counts
          fetchIssueGroups()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return {
    issueGroups,
    loading,
    error,
    messageCounts,
    toggleGroupStatus
  }
}

export function useGroupMessages() {
  const [groupMessages, setGroupMessages] = useState<Message[]>([])
  const [loadingMessages, setLoadingMessages] = useState(false)

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

  function clearMessages() {
    setGroupMessages([])
  }

  return {
    groupMessages,
    loadingMessages,
    fetchGroupMessages,
    clearMessages
  }
}
