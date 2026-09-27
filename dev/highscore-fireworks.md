# Highscore fireworks

The shared end-of-game scoreboard celebrates a server-reported place from 1 through 10, including the prospective placement shown while the player enters a name. The menu's ordinary leaderboard does not start a display. No Worker or score-policy change is required.

The renderer and procedural structures come from the saved fireworks visual study (version 5, 2026-09-17). A transparent mode removes the study's sky and lake, preserves premultiplied glow, and keeps the canvas behind the opaque score card. The canvas ignores pointer events and is hidden from assistive technology. On narrow screens, temporary top/bottom gutters leave room for bursts near the card's corners; the gutters remain until dismissal to avoid a jump when the animation finishes.

| Place | Bursts | Base size | Launch sequence |
|---|---:|---:|---:|
| 1 | 16 | 1.30 | 8.4 seconds |
| 5 | 10 | 0.99 | 5.7 seconds |
| 10 | 3 | 0.60 | 2.4 seconds |

Every intervening place has more bursts, a greater base size and a longer launch sequence than the place below it. Screen size constrains the final scale. Comets take roughly two seconds to ascend; the last burst fades afterwards. Colours, shell seeds and placement vary. The top three also include solar arches, seed pods and willow trails, in addition to the flower, sphere and ring effects.

`resources/highscores.js` selects the rank and owns the celebration lifecycle. `resources/highscore-fireworks.js` schedules a finite display through the shared renderer. Refreshes and saving the same score do not replay it. A rank change adjusts the current programme without restarting it. Leaving the dialogue, starting another game, leaving the page, switching to reduced motion, or completing the display releases its canvas and GPU resources. Reduced-motion users get the ordinary scoreboard. Missing WebGL 2 skips the decoration without affecting name entry, submission or navigation.

The inherited trajectories use analytic gravity and drag. Secondary bursts originate on their moving parent's path, and seed curls are bounded local motion. Main stars have downward gravity; only smoke rises. The study's structural ideas included [asymmetric phyllotaxis](https://algorithmicbotany.org/papers/fasciation2022.html), [procedural curl fields](https://www.cs.ubc.ca/~rbridson/docs/bridson-siggraph2007-curlnoise.pdf), [explosive seed dispersal](https://today.duke.edu/2023/08/blink-and-youll-miss-these-plants-shooting-their-seeds) and the [Veil Nebula's filaments](https://science.nasa.gov/missions/hubble/hubble-revisits-the-veil-nebula/). These are artistic interpretations, not physical or biological simulations.

Validation covers rank boundaries, successive intensity levels, repeat suppression, saved-player rows, stale requests, replay/departure/completion cleanup, reduced motion and unavailable graphics. The shared HTML script order is exercised by the app integration suite. All five shader sources compile in Mesa OpenGL ES 3.2, all three programs link, and direct desktop/phone-sized renders verify empty-frame transparency and valid premultiplied output. Full interactive browser and real-device performance checks remain outstanding because the preview browser rejects local pages.
