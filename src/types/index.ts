export type Gender = 'Male' | 'Female';
export type Rank = 'A' | 'B' | 'C' | 'D' | 'E';
export type PlayerStatus = 'Queued' | 'Playing' | 'Offline' | 'Paused';
export type CourtStatus = 'Available' | 'Occupied' | 'Maintenance';
export type MatchStatus = 'Playing' | 'Completed' | 'Cancelled';
export type MatchCategory = 'MensDoubles' | 'WomensDoubles' | 'MixedDoubles';

export interface Player {
  id: string;
  name: string;
  gender: Gender;
  rank: Rank;
  preferredCategories: MatchCategory[];
  gamesPlayed: number;
  totalWins: number;
  status: PlayerStatus;
  checkInTime: string | null;
  waitingStartTime: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  queueEntry?: QueueEntry | null;
  matchPlayers?: MatchPlayer[];
}

export interface QueueEntry {
  id: string;
  playerId: string;
  position: number;
  queuedAt: string;
  player?: Player;
}

export interface Court {
  id: string;
  name: string;
  status: CourtStatus;
  active: boolean;
  createdAt: string;
  updatedAt: string;
  matches?: Match[];
  currentMatch?: Match | null;
}

export interface Match {
  id: string;
  courtId: string;
  court?: Court;
  category: MatchCategory;
  status: MatchStatus;
  winningTeam: number | null;
  startTime: string;
  endTime: string | null;
  createdAt: string;
  updatedAt: string;
  players: MatchPlayer[];
  team1?: Player[];
  team2?: Player[];
}

export interface MatchPlayer {
  id: string;
  matchId: string;
  playerId: string;
  team: number;
  player?: Player;
}

export interface MatchCandidate {
  team1: PlayerData[];
  team2: PlayerData[];
  category: MatchCategory;
  score: number;
}

export interface PlayerData {
  id: string;
  name: string;
  rank: Rank;
  gender: Gender;
  preferredCategories: MatchCategory[];
  gamesPlayed: number;
  waitingStartTime: Date;
  recentPartnerIds: string[];
  recentOpponentIds: string[];
}

export interface DashboardStats {
  totalQueued: number;
  activeCourts: number;
  playingNow: number;
  waitingPlayers: number;
  avgWaitMinutes: number;
}

export interface AnalyticsData {
  matchesByDay: { date: string; count: number }[];
  categoryBreakdown: { category: string; count: number }[];
  rankDistribution: { rank: string; count: number }[];
  topPlayers: { name: string; wins: number; gamesPlayed: number }[];
  avgMatchDuration: number;
}

export type SocketEvent =
  | 'queue:update'
  | 'court:update'
  | 'match:created'
  | 'match:ended'
  | 'player:update'
  | 'stats:update';
