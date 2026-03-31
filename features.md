# Good Vibes — Features

## 1. Daily Login Reward (+10 pts)
Fires on app open via POST /api/daily-login. Once per day, tracks streak, shows toast.

## 2. Activity Rewards (once/day each)
- Box Breathing (3 cycles): +15 pts
- Meditation (full session): +20 pts
- Affirmation (modal open): +5 pts
- Mood Check (mood selected): +5 pts
API: POST /api/activity-reward { initData, activity }

## 3. Profile Tab
Avatar, name, animated points + streak counters, earn guide, recent feed.
API: GET /api/profile?initData=...

## New DB Tables
- user_rewards: total_points, login_streak, last_login_date
- reward_events: event ledger

## New Endpoints
- POST /api/daily-login
- POST /api/activity-reward
- GET /api/profile
