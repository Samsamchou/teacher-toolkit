# 在 Colab 開啟打包好的 .blend，用 Cycles＋OptiX 渲染指定格 / render frames on Colab with Cycles
import bpy, sys, os, time
a = sys.argv[sys.argv.index("--") + 1:]
out, spec, samples = a[0], a[1], int(a[2])
sc = bpy.context.scene
sc.render.engine = "CYCLES"; sc.cycles.samples = samples; sc.cycles.use_denoising = True; sc.cycles.device = "GPU"
pr = bpy.context.preferences.addons["cycles"].preferences
pr.compute_device_type = "OPTIX"; pr.get_devices()
for d in pr.devices: d.use = d.type == "OPTIX"
sc.render.resolution_percentage = 100; sc.render.image_settings.file_format = "PNG"
frames = [int(x) for x in spec.split(",")] if "," in spec else list(range(*[int(x) for x in spec.split("-")])) if "-" in spec else [int(spec)]
if "-" in spec and "," not in spec:
    s, e = [int(x) for x in spec.split("-")]; frames = list(range(s, e + 1))
os.makedirs(out, exist_ok=True)
for fr in frames:
    p = os.path.join(out, f"f{fr:04d}.png")
    if os.path.exists(p): continue
    sc.frame_set(fr); sc.render.filepath = p; t0 = time.time()
    bpy.ops.render.render(write_still=True); print(f"FRAME {fr} {time.time() - t0:.1f}s", flush=True)
