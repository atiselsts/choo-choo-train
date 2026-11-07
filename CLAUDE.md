# Tū-tū vilciens / Choo-choo train

Client-only browser logic puzzles for ages 6-9, plus a Very hard tier for adults. The player
loads the right items into train carriages, and a solved puzzle sends the train off with a
whistle, chuffing and smoke. Latvian is the default language, with an English switch. See `README.md` for how it plays, the puzzle
types by level, and dev URL parameters.

## Game summary

- Puzzles are generated endlessly. Types unlock by level; each type also gets harder within
  itself as the level rises.
- `state.rating` drives the level: it rises with clean solves and falls when the player
  struggles. The menu sets it directly through the `DIFFICULTY` table in `src/game.js`.
- Levels 1-20 are for children and 21-30 (`EXPERT_LEVEL`) are the adult tier, chosen from the
  menu. The rating must never cross between the tiers by itself.
- Adult puzzles are `blind`: items are not checked one by one, and a full but wrong train is
  unloaded without saying what was wrong. This stops trial and error, so don't add per-item
  feedback there.
- On children's levels, a wrong item bounces back with no penalty.
- The hint button explains the rule on the first press and points at one correct move on the
  second.
- Every 5 trains reaches a new station with new scenery. Progress is saved in `localStorage`.

## Layout

- `src/puzzles.js`: generators and solution checks, with no DOM, so it also runs in Node
- `src/game.js`: rendering, input, train motion, smoke, progress
- `src/art.js`: all SVG art and scenery
- `src/audio.js`: Web Audio sound synthesis
- `src/i18n.js`: all player-facing text, in both languages
- `tools/check-puzzles.js`: independent puzzle verification
- `tools/build-single.py`: bundles the game into one HTML file

## Commands

    node tools/check-puzzles.js [puzzlesPerLevelAndType]
    python3 tools/build-single.py OUTPUT.html [--full]

Open `index.html` directly to play. `index.html?level=12&type=matrix&seed=7` forces a puzzle
without touching saved progress, and adding `&dev` exposes `window.__choo` for scripting.

## Coding practices

Architecture:

- It must run from `file://` with no server, build step or network. Use classic scripts, not
  ES modules, and add no dependencies.
- Keep pictures and sounds generated in code: no image or audio files, and no emoji.
- Keep `src/puzzles.js` free of DOM access.

Puzzles:

- A puzzle with two right answers, or none, is the worst bug here. Every generated puzzle must
  pass `isValid`, and a new type needs its own check in `tools/check-puzzles.js`, written
  separately from the generator.
- Run `node tools/check-puzzles.js` after any change to puzzles or text.
- Generators draw randomness only from the `r` helper, never `Math.random`, so seeds reproduce.
  They return `null` when an attempt fails, and `generate` retries.
- Keep to at most 6 carriages per train and 6 items.
- Avoid ambiguous content: no O or I among the letters, and distractors must not also fit.
- Adult puzzles must also resist shortcuts, such as a false clue that openly contradicts another.
  Look at generated examples too, since the checker can't judge whether a puzzle is too easy.
- The rule must be readable from what is visible, such as the whole first period of a pattern.

Text:

- All player-facing text goes in `src/i18n.js`, in both `lv` and `en`.
- Clues put pictures in place of names (`{a}`, `{b}`), which avoids declining animal names in
  Latvian.

Style:

- Two-space indent, single quotes, semicolons, `const` and arrow functions.
- Comments explain why, not what.
- Wrap `localStorage` access in try/catch; the game must work without it.
- Respect `prefers-reduced-motion`. Keep drag, tap and keyboard input all working.
- Avoid `confirm()`, which embedded pages may not be allowed to show.

Testing:

- Always launch headless browsers with `--mute-audio`, because they otherwise play through the
  real speakers. Confirm no test browsers are left running afterwards.
- Narrow screens are not a priority for now; check layouts on desktop-sized windows.
