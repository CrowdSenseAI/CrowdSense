import torch
import cv2
import numpy as np
import os
import glob
from PIL import Image, ImageDraw, ImageFont
from torchvision import transforms
from models import resnet_fpn

model_path = r"ckpts/input-512_wot-0.1_wtv-0.01_reg-10.0_nIter-100_normCood-0/best_model_9.pth"
image_dir = r"example_images"
device = torch.device('cuda')

model = resnet_fpn()
model.to(device)
model.load_state_dict(torch.load(model_path, map_location=device))
model.eval()


def analyze_density_level(density_map):
    smoothed_map = cv2.GaussianBlur(density_map, (15, 15), 0)
    max_intensity = np.max(smoothed_map)
    if max_intensity < 0.01:
        return "Level 1: Low", (0, 255, 0)
    elif max_intensity < 0.05:
        return "Level 2: Normal", (0, 255, 255)
    elif max_intensity < 0.12:
        return "Level 3: Dense", (0, 165, 255)
    else:
        return "Level 4: Crowded", (0, 0, 255)


image_files = sorted(glob.glob(f"{image_dir}/*.png") + glob.glob(f"{image_dir}/*.jpg"))
os.makedirs("demo_output", exist_ok=True)

for img_path in image_files:
    fname = os.path.basename(img_path)
    raw_img = Image.open(img_path).convert('RGB')
    img_tensor = transforms.ToTensor()(raw_img).unsqueeze(0).to(device)

    with torch.no_grad():
        outputs, _ = model(img_tensor)

    density_np = outputs[0, 0].cpu().numpy()
    total_count = np.sum(density_np)
    level_str, color_rgb = analyze_density_level(density_np)

    print(f"{fname:12s}  count={int(total_count):>6}  level={level_str}")

    vis_img = (density_np - density_np.min()) / (density_np.max() - density_np.min() + 1e-5)
    heatmap = cv2.applyColorMap((vis_img * 255).astype(np.uint8), cv2.COLORMAP_JET)
    w, h = raw_img.size
    heatmap = cv2.resize(heatmap, (w, h))

    img_pil = Image.fromarray(cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB))
    draw = ImageDraw.Draw(img_pil)
    try:
        font = ImageFont.truetype("simhei.ttf", int(h / 15), encoding="utf-8")
    except:
        font = ImageFont.load_default()
    draw.text((20, 20), f"Status: {level_str}", font=font, fill=color_rgb)
    draw.text((20, 20 + int(h / 12)), f"Count: {int(total_count)}", font=font, fill=(255, 255, 255))

    result_img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
    cv2.imwrite(f"demo_output/{os.path.splitext(fname)[0]}.jpg", result_img)

print(f"\nDone. {len(image_files)} images saved to demo_output/")
