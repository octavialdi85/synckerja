# Android Debug Workflow (Stable)

Use this workflow to reduce force-stop/relaunch churn during development.

## First run per change set

1. Build web assets:
   - `npm run build`
2. Sync Capacitor:
   - `npm run cap:sync:android`
3. Run app from Android Studio.

## During iterative debugging

- Avoid triggering multiple run commands in parallel from terminal and IDE.
- Keep one emulator instance active.
- Prefer single rerun from Android Studio after meaningful changes.
- Use logcat filters from `docs/android-log-triage.md` to avoid binder noise.

## Why this helps

- Prevents repeated install/stop/start cycles from overlapping commands.
- Keeps deploy path deterministic (`build -> sync -> run`).
- Makes real app regressions visible by reducing tool-generated noise.
