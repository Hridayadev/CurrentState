# CurrentState — Focus together. Grow together.

**CurrentState** is a productivity tracker for two people: you and a partner. The idea is simple — when you focus together, you grow together. You track what you're working on with timers or by logging it manually, keep a private record of your whole history, and let your partner see what you're doing right now, live. Your data always stays yours.

It's a web app that also works **offline**: anything you've already loaded stays available without internet, and anything you do offline (like starting a timer) is saved and synced automatically once you're back online.

---

## What you can do

### Track your time
- **Start a timer** when you begin something, and **stop it** when you're done. CurrentState keeps the elapsed time for you — even if you lose connection.
- **Log manually** — did something earlier and forgot to track it? Add it with start/end times, date, tags, and privacy.
- **Reusable activities** — define your activities once (like "Mathematics", "Deep work", "Gym") and start them with one tap.

### Stay organized
- **Categories** — group activities under categories with an emoji icon, like 📚 Study or 💼 Work.
- **Classification** — each category is marked as **Productive**, **Neutral**, **Leisure**, or **Unproductive**. *You* decide what counts as productive — CurrentState never guesses from titles.
- **Tags** — add free-form labels to records for extra organization (e.g. #client-work).

### Plan ahead
- **Schedules** — plan what you want to do and when. Schedules are just plans; they **never start on their own**. If there's no info, it just shows "no info" — never judgment.

### Understand your time
- **Today's breakdown** — how your day splits between productive, leisure, and unproductive time.
- **Weekly trend** — see how your week is shaping up day by day.
- **Category & activity reports** — find out where your time actually went.

### Share with a partner (rooms)
- Connect with **one partner** using an invite link or join code.
- See their **live status** — what they're working on right now, and for how long.
- See a summary of their shared activity over time.
- Get **notifications** when your partner starts, stops, or switches what they're doing.
- Leave a room anytime — **your history stays yours**.

### Privacy you control
- Every record can be **Public or Private**. Private ones are never shown to your partner.
- Historical records are **immutable** — they can't be edited or deleted after the day ends.
- **Export your data** as CSV or JSON from the History page.
- **Clear all your data** in one click from Settings.

---

## Getting around

| Where | What you'll find |
|---|---|
| **Dashboard** | Your current activity, live timer, today's balance, partner status, and the day's timeline |
| **Activities** | Start timers, log manually, and review today's / this week's records |
| **Analytics** | Breakdowns of how your time was spent |
| **Categories** | Manage your categories |
| **Tags** | Manage your tags |
| **Schedule** | Your planned activities |
| **History** | Your lifelong history (read-only) + export |
| **Room** | Partner connection, invites, live presence |
| **Settings** | Profile, preferences, notifications, clear data |

---

## Getting started

1. **Sign in with Google** — no password needed.
2. Pick a name and avatar on the welcome screen.
3. CurrentState sets you up with a starter set of categories and tags, so you can begin right away.
4. Start a timer or log your first activity.
5. Optional: invite a partner from the **Room** page to see each other's state in real time.

---

## Notes on offline use

- Load the app once while online so your recent data is saved on your device.
- While offline you can still **view** your loaded data, **log and edit activities**, and **start/stop timers**. They sync when you're back online.
- A few things need a connection: signing in, joining a room, and live partner features.
- Signing out removes all your data from the device.

---

## For developers

CurrentState is a pnpm + Turborepo monorepo: a Next.js web app (`apps/web`) with a Supabase backend (Postgres + Row Level Security, Google OAuth via httpOnly cookies), plus a small Fastify service (`apps/api`) and a shared types package (`packages/shared`).

Run it locally:

```bash
pnpm install
cp apps/web/.env.example apps/web/.env.local   # then fill in your Supabase values
pnpm dev                                       # web on :3000, api on :3001
```

Apply `supabase/schema.sql` (then `seed.sql`) in the Supabase SQL editor, and enable **Google** in Supabase → Authentication → Providers. Deploy the web app on Vercel (root: `apps/web`) with the two `NEXT_PUBLIC_*` Supabase environment variables.

---

Made with ♥ by **Hridaya** — [hridayadev.com.np](https://hridayadev.com.np)
