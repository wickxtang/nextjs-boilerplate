# 食物库社交与共享机制设计

## 概述

为食物库应用添加社交与共享功能，包括：
1. **健康报告海报** — 生成可保存的长图，展示用户的风险画像和打卡成就
2. **配料热搜榜** — 展示全站高风险配料的出现频率，帮助用户发现共同隐患

## 设计方案：专用海报组件 + 独立热搜页

### 整体架构

```
新增文件：
├── app/report/page.tsx          # 健康报告海报生成页
├── app/trending/page.tsx        # 配料热搜榜页面
├── app/api/trending/route.ts    # 热搜榜数据 API

修改文件：
├── app/stats/page.tsx           # 增加"生成报告"入口按钮
├── app/library/page.tsx         # 顶部导航增加"热搜"入口
```

### 数据流

- 海报数据 → 复用现有 `/api/health-insights` 接口 + `/api/checkins` 数据
- 热搜榜数据 → 新建 `/api/trending` 接口

---

## 健康报告海报

### 海报结构（从上到下）

1. **头部**
   - 用户昵称 + 生成日期
   - 整体风险评分（大数字 + 环形进度条）

2. **打卡成就区**
   - 连续打卡天数
   - 本月累计摄入热量
   - 本月打卡次数

3. **风险警示区**
   - 高风险配料 Top5（名称 + 出现次数 + 风险等级标签）
   - 最近预警信息（最多 3 条）

4. **底部**
   - 应用 logo + 二维码（可选）

### 技术方案

- 使用 Canvas 2D API 逐块绘制
- 配色延续现有绿色系风格
- 画布宽度固定 750px，高度动态计算
- `canvas.toDataURL('image/png')` 生成 base64，通过 `<a>` 标签触发下载

### 数据来源

- 风险画像、预警信息：复用 `/api/health-insights`
- 打卡天数、热量统计：查询 `checkins` 表
- 连续打卡天数：按日期排序计算

---

## 配料热搜榜

### 页面结构

顶部统计概览：
- 全站高风险配料总数
- 本周新增预警配料数

主体 — 排行列表（按出现频率排序）：
```
排名  配料名称  IARC等级  出现次数  涉及食物数  趋势(↑↓→)
 1    亚硝酸钠    1类      1,234      89        ↑
 2    阿斯巴甜   2B类      987       56        ↓
```

每行可点击，跳转到 `/ingredient/[name]` 详情页。

### 数据范围

- 默认展示最近 30 天的全站数据
- 只统计 `risk_level` 为 `red` 或 `yellow` 的配料
- 排序按出现次数降序

### API 设计

**`GET /api/trending`**

响应：
```typescript
{
  ingredients: [{
    name: string,
    iarcLevel: string,
    riskLevel: string,
    totalCount: number,
    relatedSnacksCount: number,
    trend: 'up' | 'down' | 'stable'
  }],
  summary: {
    totalHighRiskIngredients: number,
    weeklyNewCount: number
  }
}
```

---

## 入口与导航

### 报告入口

- `/stats` 页面顶部增加"生成健康报告"按钮
- 点击跳转到 `/report` 页面，自动生成海报
- 海报生成后显示"保存到相册"按钮

### 热搜榜入口

- `/library` 顶部导航栏增加"热搜"按钮
- 点击跳转到 `/trending` 页面
- `/trending` 页面有返回食物库的导航

### 响应式

- 海报画布固定 750px 宽度，移动端全屏展示
- 热搜榜列表移动端单列，桌面端紧凑布局
