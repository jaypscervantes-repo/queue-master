# Badminton Queue Manager

A production-ready badminton queue and smart matchmaking web application.

## Tech Stack

- **Frontend**: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- **Backend**: Node.js custom server + Express
- **Database**: MySQL + Prisma ORM
- **Real-time**: Socket.IO
- **Charts**: Recharts

## Features

- **Smart Matchmaking** — Automatically forms balanced doubles matches based on player rank
- **Multiple Courts** — Manage unlimited courts with live status
- **Real-time Updates** — All connected clients sync instantly via Socket.IO
- **Player Queue** — Priority-based queue with waiting time tracking
- **QR Code Join** — Players self-register by scanning a QR code on mobile
- **Match History** — Full history with winners, duration, and team compositions
- **Analytics Dashboard** — Charts for matches/day, category breakdown, rank distribution, top players
- **Dark Mode** — Full dark/light mode with system preference detection

## Matchmaking Algorithm

The engine scores every possible 4-player combination and team split:

```
score = (teamStrengthDifference × 3)
      + repeatPartnerPenalty (5 per pair)
      + repeatOpponentPenalty (2 per pairing)
      - waitingTimeBonus (0.2 per minute)
      + gamesPlayedPenalty (0.3 per game)
```

**Rules:**
- Men's Doubles: 4 males, all must have `MensDoubles` in preferences
- Women's Doubles: 4 females, all must have `WomensDoubles` in preferences
- Mixed Doubles: exactly 2 males + 2 females, all must have `MixedDoubles` in preferences
- Avoids repeating partners within last 3 matches
- Avoids repeating opponents where possible
- Players waiting longest get higher priority (reduced score)

## Quick Start

### 1. Prerequisites

- Node.js 18+
- MySQL 8+

### 2. Setup

```bash
cd badminton-queue
npm install

# Copy and edit environment
cp .env.example .env
# Edit .env with your MySQL connection string
```

### 3. Database

```bash
# Generate Prisma client
npm run prisma:generate

# Push schema to database
npm run prisma:push

# Seed with sample data
npm run prisma:seed
```

### 4. Run Development

```bash
npm run dev
```

Open http://localhost:3000

### 5. Production Build

```bash
npm run build
npm start
```

## Environment Variables

```env
DATABASE_URL="mysql://USER:PASSWORD@localhost:3306/badminton_queue"
NEXT_PUBLIC_APP_URL="http://localhost:3000"
PORT=3000
```

## Folder Structure

```
badminton-queue/
├── prisma/
│   ├── schema.prisma        # Database schema
│   └── seed.ts              # Sample data
├── src/
│   ├── app/
│   │   ├── api/             # API routes
│   │   │   ├── players/     # Player CRUD
│   │   │   ├── queue/       # Queue management
│   │   │   ├── courts/      # Court management
│   │   │   ├── matches/     # Match history
│   │   │   ├── matchmaking/ # Matchmaking engine
│   │   │   └── analytics/   # Analytics data
│   │   ├── admin/           # Admin dashboard
│   │   └── join/            # Player self-registration (QR)
│   ├── components/
│   │   ├── dashboard/       # Header, StatsCards, NavTabs
│   │   ├── queue/           # Queue list
│   │   ├── courts/          # Court cards and list
│   │   ├── players/         # Player table + registration modal
│   │   ├── matches/         # Match history
│   │   ├── analytics/       # Charts
│   │   ├── qr/              # QR code display
│   │   └── ui/              # Base UI components
│   ├── hooks/
│   │   ├── useSocket.ts     # Socket.IO hook
│   │   └── useData.ts       # Data fetching hooks
│   ├── lib/
│   │   ├── matchmaking.ts   # Core matchmaking algorithm
│   │   ├── prisma.ts        # Prisma singleton
│   │   ├── constants.ts     # Rank values, colors
│   │   ├── socket.ts        # Socket.IO client
│   │   └── utils.ts         # Utilities
│   └── types/
│       └── index.ts         # TypeScript types
└── server.ts                # Custom server (Next.js + Socket.IO)
```

## API Reference

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/players` | List all players |
| POST | `/api/players` | Create player |
| PUT | `/api/players/:id` | Update player |
| DELETE | `/api/players/:id` | Deactivate player |
| GET | `/api/queue` | Get current queue |
| POST | `/api/queue` | Join queue (or self-register) |
| DELETE | `/api/queue/:playerId` | Leave queue |
| GET | `/api/courts` | List courts with active matches |
| POST | `/api/courts` | Add court |
| PUT | `/api/courts/:id` | Update court |
| DELETE | `/api/courts/:id` | Remove court |
| GET | `/api/matches` | Match history |
| PUT | `/api/matches/:id` | End/cancel match |
| POST | `/api/matchmaking` | Run matchmaking |
| GET | `/api/matchmaking` | Preview matchmaking (no execute) |
| GET | `/api/analytics` | Analytics data |

## Socket.IO Events

| Event | Direction | Description |
|-------|-----------|-------------|
| `queue:update` | Server → Client | Queue changed |
| `court:update` | Server → Client | Court status changed |
| `match:created` | Server → Client | New matches created |
| `match:ended` | Server → Client | Match ended |
| `player:update` | Server → Client | Player data changed |
| `stats:update` | Server → Client | Statistics changed |

## Rank System

| Rank | Value | Level |
|------|-------|-------|
| A | 5 | Pro / Tournament |
| B | 4 | Advanced |
| C | 3 | Intermediate |
| D | 2 | Beginner+ |
| E | 1 | Beginner |

Team strength = sum of rank values. The algorithm minimizes the absolute difference between team strengths while applying penalties and bonuses.
