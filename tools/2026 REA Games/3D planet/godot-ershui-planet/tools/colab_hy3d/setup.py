import subprocess, os
def sh(c):
    r = subprocess.run(c, shell=True, capture_output=True, text=True); print(">>", c[:80], r.returncode, (r.stdout + r.stderr)[-600:], flush=True)
if not os.path.exists("/content/Hunyuan3D-2"):
    sh("cd /content && git clone --depth 1 https://github.com/Tencent/Hunyuan3D-2")
sh("cd /content/Hunyuan3D-2 && pip install -q -r requirements.txt && pip install -q -e .")
sh("cd /content/Hunyuan3D-2/hy3dgen/texgen/custom_rasterizer && TORCH_CUDA_ARCH_LIST='12.0' pip install -q --no-build-isolation .")
sh("cd /content/Hunyuan3D-2/hy3dgen/texgen/differentiable_renderer && python setup.py install")
sh('pip install -q "transformers==4.48.3" "diffusers==0.31.0" "huggingface_hub<0.30"')
os.makedirs("/content/in", exist_ok=True)
print("setup ok")
