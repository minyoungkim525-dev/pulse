export function detectPatterns(entries) {
  if (entries.length < 3) return [];
  
  const insights = [];
  
  // Mood trend
  const recentMoods = entries.slice(0, 3).map(e => e.mood);
  const olderMoods = entries.slice(3, 6).map(e => e.mood);
  
  if (olderMoods.length > 0) {
    const recentAvg = recentMoods.reduce((a, b) => a + b, 0) / recentMoods.length;
    const olderAvg = olderMoods.reduce((a, b) => a + b, 0) / olderMoods.length;
    
    if (recentAvg > olderAvg + 1) {
      insights.push({
        type: 'positive',
        icon: '📈',
        title: 'Upward Trend',
        message: `Your wellbeing improved by ${(recentAvg - olderAvg).toFixed(1)} points recently`
      });
    } else if (recentAvg < olderAvg - 1) {
      insights.push({
        type: 'warning',
        icon: '📉',
        title: 'Dip Noticed',
        message: `Your mood has dropped ${(olderAvg - recentAvg).toFixed(1)} points. Consider what changed.`
      });
    }
  }
  
  // Theme frequency
  const allThemes = {};
  entries.forEach(e => {
    (e.themes || []).forEach(theme => {
      allThemes[theme] = (allThemes[theme] || 0) + 1;
    });
  });
  
  const mostCommonTheme = Object.entries(allThemes).sort((a, b) => b[1] - a[1])[0];
  if (mostCommonTheme && mostCommonTheme[1] >= 3) {
    insights.push({
      type: 'info',
      icon: '🏷️',
      title: 'Common Theme',
      message: `"${mostCommonTheme[0]}" appears in ${mostCommonTheme[1]} of your last ${entries.length} entries`
    });
  }
  
  // Streak detection
  if (entries.length >= 3) {
    insights.push({
      type: 'positive',
      icon: '🔥',
      title: 'Check-in Streak',
      message: `${entries.length} check-ins completed. Keep the momentum!`
    });
  }
  
  // Recovery moment
  for (let i = 0; i < entries.length - 1; i++) {
    if (entries[i].mood >= 7 && entries[i + 1].mood <= 5) {
      insights.push({
        type: 'positive',
        icon: '💪',
        title: 'Recovery Proof',
        message: `You bounced back from ${entries[i + 1].mood}/10 to ${entries[i].mood}/10`
      });
      break;
    }
  }
  
  return insights;
}

export function getStreakInfo(entries) {
  return {
    current: entries.length,
    message: entries.length === 1 ? 'First entry!' :
             entries.length < 4 ? 'Building the habit' :
             entries.length < 8 ? 'Streak going strong' :
             'Committed tracker'
  };
}