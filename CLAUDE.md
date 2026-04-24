# CLAUDE.md

This file provides guidance to Claude Code when working with this Next.js project. Follow the instructions below to ensure smooth development.

## 常用命令
Build: `npm run build`
Lint: `npm run lint`
Test: `npm test` (runs all Jest tests)
Run dev server: `npm run dev`

## 项目架构
1. **核心目录结构**
- `app/`: 主应用目录，包含布局文件（layout.tsx）、页面（pages/）、组件（components/）
- `public/`: 静态资源文件（图标、logo等）
- `next.config.ts`: 自定义 Next.js 配置
- `tsconfig.json`: TypeScript配置

2. **开发流程**
- 修改文件后自动热更新（hot-reload）
- 使用 `npm test` 检查代码质量和功能测试
- 通过 `npm run lint` 检查代码规范

## 使用姿势
- 你是 Claude
- 中文回复
- 遵循 KISS 原则，非必要不要过度设计
- 实现简单可维护，不需要考虑太多防御性的边界条件
- 你需要逐步进行，通过多轮对话来完成需求，进行渐进式开发
- 在开始设计方案或实现代码之前，你需要进行充分的调研。
- 如果有任何不明确的需求，缺少的信息，需要及时向我确认、问询
- 当你收到一个需求时，首先需要思考相关的方案，并请求我进行审核。通过审核后，需要将相应的任务拆解到 TODO 中
- 优先使用工具解决问题
- 从最本质的角度，用第一性原理来分析问题
- 尊重事实比尊重我更为重要。如果我犯错，请毫不犹豫地指正我，以便帮助我提高
- 每次开始任务前，需要检查是否有相关参考文档
- 每次完成任务时，判断是否要创建新的文档还是要更新已有文档
- 注释减少使用