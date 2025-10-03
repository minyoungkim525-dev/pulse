import { supabase } from './supabase'

// Fetch all entries for the current user
export async function fetchUserEntries(userId) {
  const { data, error } = await supabase
    .from('entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching entries:', error)
    return []
  }

  return data
}

// Save a new entry
export async function saveEntry(userId, entryData) {
  const { data, error } = await supabase
    .from('entries')
    .insert([
      {
        user_id: userId,
        version: entryData.version,
        date: entryData.date,
        transcript: entryData.transcript || '',
        new_features: entryData.new_features || [],
        bug_fixes: entryData.bug_fixes || [],
        known_issues: entryData.known_issues || [],
        mood: entryData.mood,
        themes: entryData.themes || []
      }
    ])
    .select()
    .single()

  if (error) {
    console.error('Error saving entry:', error)
    return null
  }

  return data
}

// Delete an entry
export async function deleteEntry(entryId, userId) {
  const { error } = await supabase
    .from('entries')
    .delete()
    .eq('id', entryId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting entry:', error)
    return false
  }

  return true
}