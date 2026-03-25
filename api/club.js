// Club Dashboard API — returns real member stats, revenue, and recent messages
// Powers the Club tab and Inbox with live Supabase data

import { getBusinessSnapshot, getMemberProfiles } from './supabase.js';

export default async function handler(req, res) {
  try {
    const snapshot = await getBusinessSnapshot();

    // Build club response with real data
    const club = {
      // Hero stats
      members: snapshot.members?.total || 0,
      newThisWeek: snapshot.members?.newThisWeek || 0,
      activeSubscriptions: snapshot.members?.activeSubscriptions || 0,
      retention: snapshot.members?.retention || 0,
      churnRisk: snapshot.members?.churnRisk || 0,

      // Revenue
      mrr: snapshot.revenue?.mrr || 0,
      revenueTrend: snapshot.revenue?.trend || '0%',

      // Content
      daysSinceLastPost: snapshot.contentGap?.daysSinceLastPost || 0,

      // Fan messages (for inbox)
      recentMessages: (snapshot.recentMessages || []).map(m => ({
        id: m.id,
        name: m.name || 'A fan',
        body: m.body,
        createdAt: m.createdAt,
        postId: m.postId
      })),

      // Milestones
      milestones: snapshot.milestones || [],

      // Recent posts
      recentPosts: snapshot.recentPosts || [],

      // Data source
      dataSource: snapshot.error ? 'fallback' : 'supabase',
      timestamp: snapshot.timestamp
    };

    return res.status(200).json(club);
  } catch (err) {
    console.error('Club API error:', err);
    // Return fallback data so the UI never breaks
    return res.status(200).json({
      members: 0,
      newThisWeek: 0,
      activeSubscriptions: 0,
      retention: 0,
      mrr: 0,
      revenueTrend: '0%',
      daysSinceLastPost: 0,
      recentMessages: [],
      milestones: [],
      recentPosts: [],
      dataSource: 'error',
      error: err.message
    });
  }
}
