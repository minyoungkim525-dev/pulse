import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { transcript } = req.body;

  if (!transcript || transcript.trim().length < 20) {
    return res.status(400).json({ error: 'Transcript too short' });
  }

  try {
    const message = await anthropic.messages.create({
      model: "claude-sonnet-4-5-20250929",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `You are analyzing a person's weekly check-in. They just shared their thoughts about their week.

          Your job:
          1. Extract things they STARTED doing (new features) - if any
          2. Extract things they STOPPED or FIXED (bug fixes) - if any  
          3. Extract ONGOING struggles or challenges (known issues)
          4. Rate their overall mood/wellbeing from 1-10
          5. Identify themes (work, health, relationships, mental, habits, growth, life)

          IMPORTANT: Many entries are reflective without clear action items. If nothing fits "started" or "fixed", leave those arrays empty. Focus on capturing their main challenges in known_issues and rating their mood accurately. For difficult periods, it's okay to have only known_issues populated.

          Be compassionate. Use their own words when possible. Keep items concise (8-15 words).

          Here's their check-in:
          "${transcript}"

          Respond with ONLY valid JSON in this exact format:
          {
            "new_features": ["Started taking shifts with partner for sleep"],
            "bug_fixes": [],
            "known_issues": ["Exhausted from two-hour sleep chunks", "Feeling guilty about crying from exhaustion", "Not feeling like myself"],
            "mood": 4.5,
            "themes": ["health", "mental", "relationships"]
          }

          Rules:
          - mood: number 1-10 (decimals ok, be realistic about difficult periods)
          - Each array: 0-3 items max
          - themes: only use [work, health, relationships, mental, habits, growth, life]
          - Empty arrays are okay if nothing fits that category
          - Be empathetic but concise
          - Capture the reality of their experience, even if it's hard`
        }
      ]
    });

    // Parse Claude's response
    const content = message.content[0].text;
    
    // Extract JSON from response (Claude might add explanation text)
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    
    const analysis = JSON.parse(jsonMatch[0]);

    // Validate and sanitize
    if (!analysis.mood || !Array.isArray(analysis.themes)) {
      throw new Error('Invalid response structure');
    }

    // Ensure mood is in range
    analysis.mood = Math.max(1, Math.min(10, Number(analysis.mood)));

    // Ensure arrays exist and are limited
    analysis.new_features = (analysis.new_features || []).slice(0, 3);
    analysis.bug_fixes = (analysis.bug_fixes || []).slice(0, 3);
    analysis.known_issues = (analysis.known_issues || []).slice(0, 3);
    analysis.themes = (analysis.themes || []).slice(0, 5);

    res.status(200).json({ success: true, analysis });

  } catch (error) {
    console.error('AI analysis error:', error);
    res.status(500).json({ 
      error: 'Failed to analyze entry',
      details: error.message 
    });
  }
}