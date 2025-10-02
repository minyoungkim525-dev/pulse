import Anthropic from '@anthropic-ai/sdk';

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { entries } = req.body;

    if (!entries || entries.length < 3) {
      return res.status(400).json({ 
        error: 'Need at least 3 entries for prediction',
        prediction: 'Keep checking in weekly to unlock predictions!' 
      });
    }

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    // Format entry data for AI analysis
    const context = entries.slice(0, 8).map(e => 
      `${e.version} (${e.date}): Mood ${e.mood}/10. New: ${(e.new_features || e.newFeatures)?.join(', ') || 'None'}. Fixed: ${(e.bug_fixes || e.bugFixes)?.join(', ') || 'None'}. Issues: ${(e.known_issues || e.knownIssues)?.join(', ') || 'None'}`
    ).join('\n');

    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 300,
      system: `You are analyzing patterns in someone's weekly check-ins to provide forward-looking insights.

THEIR LAST ${entries.length} WEEKS:
${context}

ANALYZE:
1. Cyclical patterns (do they have recurring ups/downs?)
2. Triggers for low moods
3. What usually precedes improvements
4. Current trajectory

Provide ONE specific, actionable prediction about next week in 2-3 sentences. Be encouraging but realistic. Don't give medical advice.`,
      messages: [
        { 
          role: 'user', 
          content: 'Based on my pattern, what does this suggest about next week?' 
        }
      ]
    });

    const prediction = response.content[0].text;

    res.json({ prediction });

  } catch (error) {
    console.error('Prediction error:', error);
    res.status(500).json({ 
      error: 'Failed to generate prediction',
      details: error.message 
    });
  }
}