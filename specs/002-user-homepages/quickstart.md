# Quickstart: User Homepages & Bottom Actions

## Goal

Validate that user-specific homepages log entries correctly and that the
bottom action bar enables two-tap logging on mobile.

## Steps

1. Start the app: `uv run -m src.app.main`
2. Open `http://<pi-or-dev-ip>:8000/suz` on a phone.
3. Tap the Feed button once and confirm a new feed entry appears.
4. Tap the Poo button once and confirm a new poo entry appears.
5. Open `http://<pi-or-dev-ip>:8000/josh` and repeat steps 3-4.
6. Verify entries shown on `/suz` and `/josh` are attributed to the correct user.

## Expected Results

- Action buttons are fixed at the bottom and large enough for one-hand use.
- Feed/poo entries are created in two taps from each user homepage.
- Each user homepage only shows entries for that user.
