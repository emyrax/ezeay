# Explore Reels — Engagement & Competitive Realm Plan

Goal: increase time-on-reel and repeat opens by adding hooks, interactivity (vote/predict/quiz), and a virtual competitive realm inspired by Cowbellpedia / Who Wants to Be a Millionaire / Interswitch Spark.

## Engagement hooks (first 3s)
- Replace static title with a 1-line "hook question" overlay (e.g. "Can you spot the bug?") that appears 0.5s after reel lands, auto-fades.
- Add micro-animation on entry: title reveal + icon pop + gradient shift (already have ringPulse; extend to content card).
- Show a progress/pressure cue: "Beat the clock" timer chip for challenge reels; countdown drives urgency.
- Curiosity gap: blur the answer/content until user taps "Reveal" or answers a poll.
- Streak chip in corner: "🔥 3-day streak" reinforces return.

## Interactivity layers (on-reel, no navigation)
- **Vote**: binary poll ("Agree/Disagree" or "A/B") with live % bars after voting; one tap, haptic, optimistic.
- **Predict**: "Will you get this right?" yes/no before revealing answer; score tracked.
- **Quick quiz**: 1-question inline card with 4 options; instant feedback + XP reward.
- **React**: emoji reactions (🔥💡🤯) in addition to heart; counts shown.
- All interactions persist to backend (new endpoints) and feed ranking.

## Competitive realm ("Arena")
- **Modes**: Solo (current reels), Duel (1v1 same question, fastest correct wins), Squad (team of 3), Tournament (bracket, weekly).
- **Formats borrowed**: Cowbellpedia (speed + accuracy, rapid-fire), Millionaire (lifelines: 50/50, audience poll, phone-a-friend), Interswitch Spark (timed rounds, buzzer).
- **Lobby card**: entry point on Quests/Explore — "Join Arena" with live match count.
- **Match flow**: 5 questions, 15s each, points for speed+accuracy, lifeline once per match.
- **Leaderboards**: global, friends, weekly reset; top 3 podium with rewards (coins/XP/badge).
- **Rewards**: coins, XP, exclusive badges, streak shields; premium cosmetics (optional, no paywall stubs).

## Content & pacing
- Difficulty ladder: Beginner → Intermediate → Advanced with visual color (already).
- "Boss reel" every 5 reels: harder question + bigger reward + celebratory animation.
- Creator vs house: allow user-generated challenge reels (moderated) to scale content.
- Adaptive difficulty: if user answers ≥80% correctly, raise difficulty next session.

## Retention loops
- Daily challenge (one question/day, streak counter) with push reminder.
- Weekly tournament with countdown timer on home.
- "Come back" hook: "You're 1 answer away from top 10" push.
- Save/bookmark (already) + "Continue where you left off" resume.

## Metrics to track (success)
- Avg watch time per reel, swipe retention (next-reel rate).
- Interaction rate (vote/quiz/predict per reel).
- D1/D7 retention, sessions/day, arena participation rate.
- Leaderboard engagement (views, rank checks).

## Phased implementation (suggested)
- Phase A (hooks): hook question overlay, reveal gate, streak chip, boss reel cadence. (client-only, low risk)
- Phase B (interactivity): vote + predict + quick quiz inline + emoji reactions; new endpoints `/api/reels/:id/vote`, `/predict`, `/quiz-answer`. (client+server)
- Phase C (Arena): lobby, match engine, leaderboard, rewards, push. (largest; new screens + realtime via polling or websockets)
- Phase D (content): creator challenge reels, adaptive difficulty, daily challenge.

## Open questions
1. Arena real-time: polling vs websockets (Socket.io)? Recommended polling for MVP (simpler, fits existing Express).
2. Monetization: keep free-only now (no paywall stubs) or add cosmetic shop? Recommended cosmetics later.
3. Moderation for user-generated challenge reels: manual review vs auto-filter? Recommended manual queue MVP.
