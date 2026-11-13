"""Run Codex image jobs with max 3 at once. Recover images from ~/.codex/generated_images if Codex did not save them."""
import json, subprocess, time, pathlib, glob, os, shutil, sys
here = pathlib.Path(__file__).parent
jobs = json.loads((here / sys.argv[1] if len(sys.argv) > 1 else here / "jobs.json").read_text(encoding="utf-8"))
STYLE = ("Match the attached style reference: clean FLAT 2D VECTOR cartoon illustration, thin dark navy outlines, flat colors with minimal gradients, "
         "one soft warm rim light, simple friendly faces, film palette of indigo, lavender and warm orange accents. ")
NOTEXT = " STRICT: absolutely no text, no letters, no numbers, no logos, no signs with writing anywhere."
GREEN = (" Full body, standing in a relaxed A-pose, arms slightly away from the body, OPEN hands with visible fingers (no fists), body turned 3/4 toward the viewer, both feet visible. "
         "Plain solid pure green background (#00FF00) filling the whole image, no ground shadow, no other objects. Portrait 1024x1536.")
running = []


def launch(j):
    out = j["out"]
    prompt = f"Use your built-in image generation tool to create one image, then save it as {out} in the current directory.\n" + STYLE + j["prompt"]
    prompt += GREEN if j.get("green") else ""
    prompt += NOTEXT + "\nReply with the saved file path only."
    (here / f"p_{out}.txt").write_text(prompt, encoding="utf-8")
    args = ["codex", "exec", "--skip-git-repo-check", "-s", "workspace-write"]
    for r in j["refs"]:
        args += ["-i", r]
    args += ["-"]
    f = open(here / f"log_{out}.txt", "w", encoding="utf-8")
    p = subprocess.Popen(" ".join(f'"{a}"' for a in args), shell=True, stdin=open(here / f"p_{out}.txt", "rb"),
                         stdout=f, stderr=subprocess.STDOUT, cwd=here)
    return (p, j, time.time())


todo = [j for j in jobs if not (here / j["out"]).exists()]
while todo or running:
    while todo and len(running) < 3:
        running.append(launch(todo.pop(0)))
    for r in running[:]:
        p, j, t0 = r
        if p.poll() is None:
            continue
        running.remove(r)
        out = here / j["out"]
        if not out.exists():   # recover from Codex's own folder
            cands = [c for c in glob.glob(os.path.expanduser("~/.codex/generated_images/**/*.png"), recursive=True) if os.path.getmtime(c) > t0]
            if cands:
                shutil.copy(max(cands, key=os.path.getmtime), out)
        print(("OK  " if out.exists() else "FAIL"), j["out"], f"{time.time() - t0:.0f}s", flush=True)
    time.sleep(3)
print("ALL DONE", flush=True)
