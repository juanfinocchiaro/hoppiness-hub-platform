# Time Engine V2 Rollout

## Goal

Roll out unified time calculations without data loss and with reversible behavior.

## Feature flags

- `VITE_TIME_ENGINE_V2_ENABLED`: enables unified engine-based calculations.
- `VITE_TIME_PARITY_LOG_ENABLED`: keeps legacy output in parallel and logs diffs.

## Baseline validation dataset

Use real branch/month examples containing:

- Overnight shifts (start > end)
- Split shifts
- Open sessions (clock_in without clock_out)
- Unlinked clock entries (no `schedule_id`)
- Approved leave requests and vacations
- Day-off worked sessions

## Rollback protocol

1. Set `VITE_TIME_ENGINE_V2_ENABLED=false`.
2. Keep `VITE_TIME_PARITY_LOG_ENABLED=true` to keep collecting diffs.
3. Redeploy frontend only (no destructive DB changes required).

