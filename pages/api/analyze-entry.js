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
          content: `You are analyzing a person's weekly check-in. They just recorded a voice note about their week.

Your job:
1. Extract things they STARTED doing (new features)
2. Extract things they STOPPED or FIXED (bug fixes)
3. Extract ONGOING struggles (known issues)
4. Rate their overall mood/wellbeing from 1-10
5. Identify themes (work, health, relationships, mental, habits, growth, life)

Be compassionate. Use their own words when possible. Keep items concise (5-10 words).

Here's their check-in:
"${transcript}"

Respond with ONLY valid JSON in this exact format:
{
  "newFeatures": ["Started morning walks", "Began therapy sessions"],
  "bugFixes": ["Stopped checking phone before bed"],
  "knownIssues": ["Still anxious about work deadlines"],
  "mood": 7.5,
  "themes": ["health", "habits", "mental"]
}

Rules:
- mood: number 1-10 (decimals ok)
- Each array: 0-3 items max
- themes: only use [work, health, relationships, mental, habits, growth, life]
- Empty arrays if nothing fits
- Be empathetic but concise`
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
    analysis.newFeatures = (analysis.newFeatures || []).slice(0, 3);
    analysis.bugFixes = (analysis.bugFixes || []).slice(0, 3);
    analysis.knownIssues = (analysis.knownIssues || []).slice(0, 3);
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