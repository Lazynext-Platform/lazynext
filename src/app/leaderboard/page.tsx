import { redirect } from 'next/navigation';

/**
 * /leaderboard — Leaderboards were creative features.
 * Redirects to /creative where the creative leaderboard lives.
 */
export default function LeaderboardPage(): never {
  redirect('/creative');
}
