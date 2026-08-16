# Counseling Keyboard-Focus Design QA

## Evidence

- Source visual truth:
  - `/var/folders/ql/3rw4gpp1581gb48zspq56q1h0000gn/T/codex-clipboard-7796d65f-f608-410d-a5fd-3be9150e0afc.png`
  - `/var/folders/ql/3rw4gpp1581gb48zspq56q1h0000gn/T/codex-clipboard-aae3a790-6afb-49f2-b196-2c5aace54946.png`
- Source pixels: 738 × 1600 for each capture.
- Normalized logical viewport: 369 × 800 at 2× density.
- State: iOS TestFlight counseling page sheet, first guide reply, composer focused, native keyboard open.
- Implementation screenshot: unavailable.
- Implementation pixels / CSS size / density: unavailable because this environment could export the web bundle but could not bind a local preview server, and the updated native TestFlight build was not yet available for same-state capture.

## Full-view comparison evidence

Blocked. The source captures were opened and reviewed, but a rendered implementation capture at the same iOS page-sheet and native-keyboard state could not be produced in this environment. Build success is not being treated as visual evidence.

## Focused-region comparison evidence

Blocked for the same reason. The required focus regions are the compact header, latest transcript bubble, and composer immediately above the native keyboard.

## Findings from the source state

- [P1] The expanded scope-and-safety panel and full header consume most of the reduced viewport while typing.
- [P1] The latest counseling reply has too little persistent visible space above the keyboard.
- [P2] The composer controls were visually compact but did not preserve an explicit 44-point target contract.
- [P2] There was no obvious keyboard-dismiss control, and drag-to-dismiss behavior was not explicit.

## Fixes implemented for the next build

- Collapse safety, speaker, skip, introductory room card, and connected-tool chrome only while the keyboard is open; all remain present when the keyboard closes.
- Keep the transcript as the flexible primary region and scroll to the latest turn on focus/content changes.
- Add interactive iOS drag-to-dismiss, Android drag dismissal, and a localized header keyboard-dismiss control.
- Keep close, keyboard, microphone, and send controls at 44 × 44 points.
- Add localized reply-field labels and hints, modal semantics, a meaningful disabled send state, and a 4,000-character safety limit.
- Replace touched text/emoji navigation glyphs with the existing Ionicons system.

## Automated verification

- `pnpm run typecheck` — passed.
- `pnpm run test:product-quality` — passed.
- `pnpm run test:upgrades` — passed, including new keyboard-focus regression assertions.
- `pnpm run test:visibility` — passed.
- `pnpm run test:vedic` — passed.
- `pnpm run test:tone` — passed.
- `pnpm run export:web` — passed.
- Console errors and native keyboard interactions: not visually verified in this environment.

## Comparison history

1. Source-only inspection found P1 viewport loss and P2 touch/dismissal gaps.
2. Source was updated with keyboard-focus behavior and accessibility contracts.
3. Post-fix same-state visual comparison remains blocked until the new iOS build can be opened with its native keyboard.

## Required next evidence

Capture the new TestFlight build at 369 × 800 logical points in the same first-reply state, first with the keyboard closed and then focused with the keyboard open. Confirm that the latest bubble, 44-point composer controls, keyboard-dismiss action, and transcript scrolling are visible and usable.

final result: blocked
