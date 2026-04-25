# AI 健康食品助手 (AI Food Health Assistant)

一款基于 AI 视觉识别与双链知识图谱的健康饮食管理工具。通过拍照识别食品配料表，深度解析潜在健康风险，并建立个人饮食数据闭环。

## 🌟 核心特性

- **📸 智能配料扫描**：利用 **Google Gemini 1.5 Flash** 的视觉识别能力，一键拍摄/上传食品图片与配料表，精准提取成分并进行健康风险分级。
- **📊 个人食物库**：持久化存储扫描记录，支持图片上传、风险标注及成分管理。
- **🕸️ 配料关系图谱**：基于 **ECharts** 实现的可视化力导向图，打通“零食-配料”双链关系，直观展现不同食物间的共同成分。
- **📅 饮食统计与日历**：
    - **每日打卡**：记录每日零食摄入，支持补录与删除。
    - **健康周报/月报**：自动汇总摄入频率最高的零食及出现次数最多的配料成分。
    - **可视化日历**：直观展示打卡记录，支持快速跳转。
- **🔍 全局搜索**：食物库、知识库、补录列表均支持实时关键词检索，方便快速定位。
- **📚 健康知识库**：集成 **IARC (国际癌症研究机构)** 权威致癌物分级标准，科普配料成分风险。

## 🛠️ 技术栈

- **框架**：[Next.js 14+](https://nextjs.org/) (App Router)
- **AI 引擎**：[Google Gemini 1.5 Flash API](https://ai.google.dev/) (视觉识别与语义分析)
- **数据库**：[SQLite](https://sqlite.org/) (通过 `@libsql/client` 驱动)
- **动画**：[Framer Motion](https://www.framer.com/motion/)
- **图表**：[ECharts](https://echarts.apache.org/)
- **UI 组件**：原生 CSS 实现的响应式设计 + React Calendar

## 🚀 快速开始

### 1. 克隆项目
```bash
git clone <repository-url>
cd nextjs-boilerplate
```

### 2. 安装依赖
```bash
npm install
```

### 3. 配置环境变量
在项目根目录创建 `.env.local` 文件并添加以下配置：
```env
GEMINI_API_KEY=你的_GEMINI_API_KEY
JWT_SECRET=你的_JWT_加密密钥
```

### 4. 初始化数据库
项目首次运行会自动通过 `app/lib/db.ts` 初始化 SQLite 数据库表结构。

### 5. 启动开发服务器
```bash
npm run dev
```
访问 [http://localhost:3000](http://localhost:3000) 即可使用。

## 📂 项目结构

- `app/`：Next.js App Router 核心目录
    - `api/`：后端 API 路由（Gemini 调用、数据库操作、权限验证）
    - `library/`：食物库页面与图谱实现
    - `stats/`：健康统计分析与日历打卡
    - `knowledge/`：健康知识库科普页
    - `ingredient/`：配料详情双链页面
- `lib/`：数据库配置、认证中间件等公共工具

## 📜 许可证

本项目基于 MIT 许可证开源。
