# Lessons Learned

## 2026-03-21 — Initial Build & Deploy

### Docker
- Non-root user in Dockerfile + named volumes = permission denied on db writes. Removed non-root user since this is a personal app.
- `docker-compose.override.yml` auto-loads and overrides NODE_ENV to development. Use `docker compose -f docker-compose.yml` for production testing.

### GitHub Auth
- Fine-grained PATs need specific permissions: Administration (create repos), Contents (push), Metadata (read), Actions (CI), Secrets, Workflow (push workflow files). List ALL needed permissions upfront — don't make the user add them one at a time.

### SR Engine
- Early practice must NOT push schedules further out — only advance when card is actually due
- Grace period for decay = 1x the tier's interval
- Use America/Indiana/Indianapolis timezone for all date calculations (user is in Indiana)

### Mobile
- Bottom nav bar on mobile, top nav on desktop — standard mobile pattern
- Card editor needs full-screen modal on mobile (sheet style from bottom)
- Touch targets must be 44px+ for reliable tapping
- Add `capture="environment"` to file inputs for camera access on mobile
