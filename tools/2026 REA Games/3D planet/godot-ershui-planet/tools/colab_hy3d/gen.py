import time, sys, os, glob
sys.path.insert(0, "/content/Hunyuan3D-2")
t=time.time()
from PIL import Image
from hy3dgen.rembg import BackgroundRemover
from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline, FaceReducer, FloaterRemover, DegenerateFaceRemover
from hy3dgen.texgen import Hunyuan3DPaintPipeline
shape = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained("tencent/Hunyuan3D-2")
paint = Hunyuan3DPaintPipeline.from_pretrained("tencent/Hunyuan3D-2")
rm = BackgroundRemover()
os.makedirs("/content/out", exist_ok=True)
for f in sorted(glob.glob("/content/in/*.png")):
    k = os.path.basename(f)[:-4]; t1=time.time()
    img = Image.open(f).convert("RGBA")
    img = rm(img.convert("RGB"))
    mesh = shape(image=img, num_inference_steps=50, octree_resolution=380, num_chunks=20000)[0]
    mesh = FloaterRemover()(mesh); mesh = DegenerateFaceRemover()(mesh); mesh = FaceReducer()(mesh, max_facenum=20000)
    mesh = paint(mesh, image=img)
    mesh.export(f"/content/out/{k}.glb")
    print("done", k, round(time.time()-t1), "s faces", len(mesh.faces), flush=True)
print("total", round(time.time()-t), flush=True)
