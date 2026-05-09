import torch
from models import vgg19 
import cv2
import numpy as np
from PIL import Image, ImageDraw, ImageFont
from torchvision import transforms

# --- 1. 初始化 ---
model_path = r"backend\DM-Count\pretrained_models\model_nwpu.pth"
image_path = r"backend\DM-Count\example_images\7.jpg" 
device = torch.device('cpu') 

model = vgg19()
model.to(device)
model.load_state_dict(torch.load(model_path, map_location=device))
model.eval()

# --- 2. 密集度判定核心逻辑 (避开面积) ---
def analyze_density_level(density_map):
    # 使用高斯滤波平滑噪声，突出人群聚集区域的中心强度
    smoothed_map = cv2.GaussianBlur(density_map, (15, 15), 0)
    
    # 提取全图局部最高强度 (Peak Response)
    # 这个值反映了画面中最挤的一块地方“到底有多挤”
    max_intensity = np.max(smoothed_map)
    
    # 这里的阈值（0.01, 0.05, 0.1）是根据 DM-Count 响应特性设定的经验值
    # 优点：远处的人头虽然小，但像素值更“尖锐”，强度依然能触发高阈值
    if max_intensity < 0.01:
        return "等级 1: 空旷 (低风险)", (0, 255, 0)
    elif max_intensity < 0.05:
        return "等级 2: 正常 (流动性好)", (0, 255, 255)
    elif max_intensity < 0.12:
        return "等级 3: 密集 (需关注)", (0, 165, 255)
    else:
        return "等级 4: 拥挤 (潜在风险)", (0, 0, 255)

# --- 3. 推理 ---
raw_img = Image.open(image_path).convert('RGB')
img_tensor = transforms.ToTensor()(raw_img).unsqueeze(0).to(device)

with torch.no_grad():
    outputs, _ = model(img_tensor)

# --- 4. 统计分析 ---
density_np = outputs[0, 0].cpu().numpy()
total_count = np.sum(density_np)
level_str, color_rgb = analyze_density_level(density_np)

# --- 5. 渲染带中文的纯热力图 ---
vis_img = (density_np - density_np.min()) / (density_np.max() - density_np.min() + 1e-5)
heatmap = cv2.applyColorMap((vis_img * 255).astype(np.uint8), cv2.COLORMAP_JET)
w, h = raw_img.size
heatmap = cv2.resize(heatmap, (w, h))

# 使用 PIL 绘制中文
img_pil = Image.fromarray(cv2.cvtColor(heatmap, cv2.COLOR_BGR2RGB))
draw = ImageDraw.Draw(img_pil)
try:
    font = ImageFont.truetype("simhei.ttf", int(h/15), encoding="utf-8")
except:
    font = ImageFont.load_default()

# 绘制结果文字
draw.text((20, 20), f"实时状态: {level_str}", font=font, fill=color_rgb)
draw.text((20, 20 + int(h/12)), f"检测总数: {int(total_count)} 人", font=font, fill=(255, 255, 255))

# --- 6. 保存 ---
result_img = cv2.cvtColor(np.array(img_pil), cv2.COLOR_RGB2BGR)
cv2.imwrite("density_analysis.jpg", result_img)

print(f"分析完成！峰值强度判定结果: {level_str}")