# Forest of Words — Six Stages

Open project.godot in Godot 4.7.2. F6 runs the combat preview; formal English assessments are managed by the Lesson Hub host, not by the native scene. All original ImageGen art and its metadata remain in assets/.

## Rebuild Web
1. Export the Web preset (matching single-thread template is included).
2. Run `python tools/package-web.py OUTPUT_DIRECTORY` to wrap the export, verify each runtime file and refresh the game-only cache version.
3. Copy the generated files to the host's `public/survivors/v1/`, build the host and complete the deployment gate.

The downloadable Web ZIP includes a separate synthetic 35-question local demo and a loopback server. It does not upload official teacher records.

## Host protocol
The iframe receives same-origin `postMessage` payloads `{channel:"lesson-survivors-v1",instance,host}`. The instance must equal the iframe URL's `instance` query parameter. Host fields: id, phase (playing or paused), index, level (1–6), awards (server-issued itemId/tier/points by question), game (x/y/hp/defeated/seconds/recoveries), input (x/y/dash), quality (auto/high/low), reduced.

The child sends ready/stats/question/recovery/sound events through the same channel and instance. Only the host may submit English answers and obtain verified equipment grants. Combat stats are untrusted display telemetry and must never change academic scores.

## Review scenes
`godot --path . -- --review-level=6` previews level 6 with the unlocked equipment. Add `--capture=ABSOLUTE_PATH.png` to capture the viewport after three seconds.

Desktop target60FPS / low target30FPS are caps, not guarantees. School iPad, audio and Wi-Fi acceptance remains required.

## v06 production release
See 製作手冊-v06.md for case-sensitive spelling, fixed phrase spacing, celebration audio/identity and 15/17/19/21/23/25-second battle windows. This is the v06 production release at https://lesson-hub-v03.web.app/lab . Original v05/v04 manuals remain. CC0 celebration credits and compressed audio are included under tools/web-audio/celebration/.
