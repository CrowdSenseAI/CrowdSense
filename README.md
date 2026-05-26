# CrowdSense

基于 DM-Count (ResNet-34 FPN) 的人群计数管理系统，支持 GPU 推理、密度等级分类和完整的数据管理。

## 架构

```
crowdsense/
├── algo/DM-Count/              # 模型训练 & GPU 推理服务
│   ├── inference_server.py     # FastAPI GPU 推理 (端口 8000)
│   ├── train.py                # 训练脚本
│   └── saved_models/           # 模型权重 (需单独下载)
├── crowdsense-server/
│   ├── backend/                # Spring Boot 3.2 REST API (端口 8080)
│   └── frontend/               # Vue3 + Element Plus (端口 5173)
└── config.json
```

**推理流程**: 前端上传图片 → Java 后端接收 → 转发给 Python GPU 推理服务 → 返回密度等级 + 密度图 → 入库

## 环境要求

| 组件 | 版本 |
|------|------|
| JDK | 17+ |
| Maven | 3.8+ |
| Node.js | 18+ |
| Python | 3.10+ (CUDA 12.1) |
| MySQL | 8.0+ |
| CUDA GPU | 推荐 (仅 CPU 也可推理，但慢 10-20 倍) |

## 快速开始

### 1. 数据库初始化

```bash
mysql -u root -p --default-character-set=utf8mb4 < crowdsense-server/backend/src/main/resources/db/init.sql
```

默认账号: `admin` / `123456`，`user` / `123456`

### 2. 获取模型权重

模型权重文件未包含在仓库中，请向项目维护者索取或自行训练。

**下载后放置路径**：

```
algo/DM-Count/saved_models/resnet_fpn_best_mae98.pth
```

```bash
# 自行训练（如未获取预训练权重）
cd algo/DM-Count
uv run python train.py
```

### 3. 启动 Python GPU 推理服务

```bash
cd algo/DM-Count

# 安装依赖
pip install fastapi uvicorn torch torchvision opencv-python pillow numpy

# 启动推理服务
python inference_server.py
# 服务运行在 http://127.0.0.1:8000
# 健康检查: curl http://127.0.0.1:8000/health
```

### 4. 启动 Java 后端

```bash
cd crowdsense-server/backend

# 修改数据库密码（如果未使用默认密码）
# 编辑 src/main/resources/application.yml
# 或设置环境变量: export MYSQL_PASSWORD=your_password

# 编译运行
mvn clean package -DskipTests
java -jar target/crowdsense-server-1.0.0.jar
# API 运行在 http://localhost:8080/api
# Swagger: http://localhost:8080/api/swagger-ui.html
```

### 5. 启动前端

```bash
cd crowdsense-server/frontend

npm install
npm run dev
# 前端运行在 http://localhost:5173
```

### 6. 访问系统

打开 http://localhost:5173，使用 `admin` / `123456` 登录。

进入「推理任务管理」页面上传图片进行人群计数推理。

## 密度等级分类

| 密度值范围 | 等级标签 | 说明 |
|-----------|---------|------|
| < 0.01 | 低密度 Low | 人群稀疏 |
| 0.01 - 0.05 | 正常密度 Normal | 正常人流 |
| 0.05 - 0.12 | 密集 Dense | 人群较为密集 |
| >= 0.12 | 极度拥挤 Crowded | 高度拥挤 |

## API 接口

| 方法 | 路径 | 说明 |
|------|------|------|
| POST | `/api/auth/login` | 登录获取 JWT |
| POST | `/api/inference/upload` | 上传图片推理 |
| GET | `/api/inference/list` | 推理任务列表 |
| GET | `/api/inference/{id}` | 推理任务详情 |
| DELETE | `/api/inference/{id}` | 删除推理任务 |
| GET | `/api/files/images/{name}` | 查看上传图片 |
| GET | `/api/files/density/{name}` | 查看密度图 |

## 配置说明

```yaml
# application.yml 关键配置
spring:
  datasource:
    password: ${MYSQL_PASSWORD:your_password_here}  # 通过环境变量设置

app:
  upload:
    dir: uploads/images       # 上传图片存储路径
    density-dir: uploads/density  # 密度图存储路径

jwt:
  secret: <base64-encoded>    # JWT 签名密钥
  expiration: 86400000        # Token 有效期 (ms), 默认 24h
```

## 模型信息

- **架构**: ResNet-34 FPN，基于 DM-Count
- **训练数据**: QNRF (Quantified Nose Reality Field)
- **输入**: RGB 图片 (长边自动缩放至 1024px)
- **输出**: 密度图 (H/8 × W/8)，逐像素求和得到人数
- **Test MAE**: 98 (best), 101 (backup)
