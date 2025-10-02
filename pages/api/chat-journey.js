import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  try {
    const { question, entries, previousMessages } = req.body;
    
    if (!question || !entries) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    // Rate limiting checks
    if (entries.length === 0) {
      return res.status(400).json({ error: 'No entries to analyze' });
    }
    
    if (entries.length > 50) {
      entries = entries.slice(0, 50); // Limit context size
    }
    
    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    
    const context = entries.map(e =>
      `${e.version} (${e.date}): Mood ${e.mood}/10. New: ${(e.new_features || e.newFeatures)?.join(', ') || 'None'}. Fixed: ${(e.bug_fixes || e.bugFixes)?.join(', ') || 'None'}. Issues: ${(e.known_issues || e.knownIssues)?.join(', ') || 'None'}`
    ).join('\n');
    
    const messages = previousMessages && previousMessages.length > 0
      ? [
          ...previousMessages.map(m => ({ role: m.role, content: m.content })),
          { role: 'user', content: question }
        ]
      : [{ role: 'user', content: question }];
    
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      system: `You are a compassionate AI analyzing someone's personal growth journey. 

THEIR HISTORY:
${context}

INSTRUCTIONS:
- Reference specific weeks/versions when relevant (e.g., "In Week 32, you mentioned...")
- Compare patterns across entries
- Be encouraging but truthful
- If they're improving, acknowledge it specifically
- If they're struggling, validate it and look for past coping strategies
- Keep responses under 200 words
- Never give medical advice

Answer their question with empathy and insight.`,
      messages
    });
    
    // Debug logging
    console.log('API response:', response);
    console.log('Answer:', response.content[0].text);
    
    res.json({ answer: response.content[0].text });
    
  } catch (error) {
    console.error('Chat journey error:', error);
    res.status(500).json({ error: 'Failed to generate response', details: error.message });
  }
}