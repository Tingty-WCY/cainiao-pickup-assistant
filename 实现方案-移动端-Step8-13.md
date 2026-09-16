# 快递取件码统一管理 App — Step 8–13 详细实现方案

> 本文档是《落地方案-移动端.md》的细化。Step 1–7（类型 / Schema / 解析引擎 / 去重 / Service / 测试）**已完成并通过 22/22 单测**，本文档只覆盖 **Step 8–13**（Expo UI + expo-sqlite 对接 + 快速添加 + 设置 + Adapter 预留）。
>
> 本文档在用户确认后才会进入编码。每屏都给出：字段、交互、状态来源、文件清单、数据流。

---

## 0. 复用资产（已存在，方案不重写）

| 资产 | 路径 | 在本阶段角色 |
|---|---|---|
| 领域类型 | `src/types/index.ts` | UI / Service 共用，零改动 |
| Drizzle Schema | `src/db/schema.ts` | Expo 版 DbClient 直接复用 |
| 迁移 SQL | `src/db/migrations.ts` | `runMigrations()` 直接调用 |
| 默认用户 seed | `src/db/seed.ts` | 启动时 seed |
| 解析引擎 | `src/parser/engine.ts` + `rules.ts` | 粘贴解析直接调用 |
| 去重 | `src/dedupe/index.ts` | 创建快递前调用 |
| Service | `src/services/*.ts` | 5 个 Service 直接复用，**不改动** |
| 测试 | `tests/*.test.ts` | 继续保留，回归用 |

**关键原则**：UI 只通过 Service 访问数据；Service 只通过 `DbClient` 抽象访问数据库。新增 Expo 实现时，**Service 与 UI 一行不用改**，只需新增一个 `ExpoDbClient`。

---

## 1. 工程与依赖

### 1.1 新增依赖（写入 `package.json`）

```jsonc
"dependencies": {
  "expo": "~52.0.0",
  "expo-sqlite": "~15.0.0",
  "expo-clipboard": "~7.0.0",
  "expo-router": "~4.0.0",
  "expo-status-bar": "~2.0.0",
  "expo-file-system": "~18.0.0",
  "expo-sharing": "~13.0.0",
  "react": "18.3.1",
  "react-native": "0.76.0",
  "react-native-safe-area-context": "4.12.0",
  "react-native-screens": "~4.4.0",
  "@react-navigation/native": "^7.0.0",
  "drizzle-orm": "^0.45.2"   // 已装
},
"devDependencies": {
  "@types/react": "~18.3.0",
  "typescript": "^5.6.0",    // 已装
  "vitest": "^2.0.0"         // 已装，核心测试保留
}
```

> 说明：用 `expo-router`（基于文件路由，比手写 Navigation 更省代码），5 个 tab + 2 个 modal 路由即可。

### 1.2 配置文件

- `app.json`：name=`快递取件码助手`，`expo.orientation=portrait`，`plugins` 注册 `expo-sqlite` / `expo-router`。
- `tsconfig.json`：在现有 strict 基础上 `extends "expo/tsconfig.base"`，并加 `"paths": { "@/*": ["./src/*"] }`，便于 import。
- 新增 `app/` 目录作为路由根（expo-router 约定）。

### 1.3 目录结构（新增部分，标注 ✨）

```text
菜鸟驿站/
├─ app/                         ✨ expo-router 路由
│  ├─ _layout.tsx              ✨ 根布局（SafeArea + StatusBar + Tabs）
│  ├─ index.tsx                ✨ 首页（Tab: 首页）
│  ├─ packages.tsx             ✨ 快递页（Tab: 快递）
│  ├─ accounts.tsx             ✨ 账号页（Tab: 账号）
│  ├─ stations.tsx             ✨ 驿站页（Tab: 驿站）
│  ├─ settings.tsx             ✨ 设置页（Tab: 设置）
│  ├─ add.tsx                  ✨ 手动添加（modal 路由）
│  └─ import.tsx               ✨ 粘贴解析（modal 路由）
│
├─ src/
│  ├─ db/
│  │  ├─ expoClient.ts         ✨ ExpoDbClient（expo-sqlite 实现）
│  │  ├─ index.ts              ✨ DbClient 工厂（env 切换 memory/expo）
│  │  └─ ...（已存在）
│  ├─ state/
│  │  ├─ AppContext.tsx        ✨ 全局：当前用户、隐私开关、刷新触发
│  │  ├─ usePackages.ts        ✨ hook：列表/搜索/筛选/标记已取/改码
│  │  ├─ useAccounts.ts        ✨ hook：账号 CRUD
│  │  ├─ useStations.ts        ✨ hook：驿站 CRUD
│  │  └─ useDashboard.ts       ✨ hook：首页聚合
│  ├─ ui/
│  │  ├─ PackageCard.tsx       ✨ 快递卡片（取件码最醒目）
│  │  ├─ MaskedText.tsx        ✨ 手机号/单号脱敏（受隐私开关控制）
│  │  ├─ StatusBadge.tsx       ✨ 状态标签
│  │  ├─ EmptyState.tsx        ✨ 空态
│  │  ├─ LoadingState.tsx      ✨ 加载态
│  │  ├─ FormField.tsx         ✨ 通用输入框/下拉
│  │  ├─ ConfirmDialog.tsx     ✨ 轻量确认（标记已取用）
│  │  └─ ActionSheet.tsx       ✨ 快速添加二选一
│  ├─ adapters/                ✨ 数据来源预留
│  │  ├─ types.ts              ✨ DataSourceAdapter 接口（已设计，落地）
│  │  ├─ manual.ts             ✨ ManualAdapter
│  │  ├─ textParser.ts         ✨ TextParserAdapter（封装 ParserService）
│  │  └─ stubs.ts              ✨ Taobao/JD/PDD/Douyin/SMS 占位
│  └─ ...（已存在：types/parser/dedupe/services）
│
├─ tests/                      （已存在，保留）
├─ package.json / tsconfig.json / app.json  ✨ 调整
└─ 落地方案-移动端.md / 实现方案-移动端-Step8-13.md
```

---

## 2. 数据库层对接（Expo/SQLite）— 唯一需要的"新实现"

### 2.1 `ExpoDbClient`（`src/db/expoClient.ts`）

实现与 `MemoryDbClient` 完全一致的接口（见 `src/db/types.ts` 的 `DbClient`），内部用 `expo-sqlite`：

```ts
import * as SQLite from 'expo-sqlite';
import { drizzle } from 'drizzle-orm/expo-sqlite';
import { runMigrations } from './migrations';
import { seedDefaultUser } from './seed';

export class ExpoDbClient implements DbClient {
  private db: SQLite.SQLiteDatabase;
  private orm: ...; // drizzle instance

  async open() {
    this.db = await SQLite.openDatabaseAsync('cainiao.db');
    await this.db.execAsync('PRAGMA foreign_keys = ON; PRAGMA journal_mode = WAL;');
    await runMigrations(this.db);          // 复用已写迁移
    await seedDefaultUser(this);          // 复用已写 seed
    this.orm = drizzle(this.db);
  }
  // query / execute / close 与 MemoryDbClient 同签名
}
```

**为什么不用改 Service**：所有 Service 构造时接收一个 `DbClient`，只要 `ExpoDbClient` 满足同一接口，`accountService(client)` 直接可用。

### 2.2 `DbClient` 工厂（`src/db/index.ts`）

```ts
export function createDbClient(): DbClient {
  if (process.env.EXPO_PUBLIC_USE_MEMORY_DB === '1') return new MemoryDbClient();
  return new ExpoDbClient();   // 默认走真 SQLite
}
```

> 测试时仍然用 `MemoryDbClient`（vitest 环境无 expo-sqlite），保证 Step 1–7 的 22 个测试继续绿。

### 2.3 启动顺序

```
App 启动 → AppContext 初始化 → createDbClient() → client.open()（迁移+seed）→ 各 hook 首次读取
```

`app/_layout.tsx` 用一个 `<DbProvider>` 在挂载时 `open()`，未完成前显示 `LoadingState`。

---

## 3. 状态管理与数据消费

为避免引入过重的状态库，采用 **React Context + 自定义 hooks**（轻量、可测、与 Service 解耦）。

```ts
// src/state/AppContext.tsx
interface AppState {
  userId: string;            // 默认用户 id（seed 得到）
  showSensitive: boolean;    // 设置页开关，控制脱敏
  db: DbClient;
  refreshKey: number;        // 任何写操作后 +1，触发 hook 重新读
  requestRefresh: () => void;
}
```

各 hook 模式（以 `usePackages` 为例）：

```ts
export function usePackages(query?: PackageQuery) {
  const { db, refreshKey } = useApp();
  const [list, setList] = useState<Package[]>([]);
  useEffect(() => {
    packageService(db).listPackages(query).then(setList);
  }, [db, refreshKey, JSON.stringify(query)]);
  return {
    list,
    markPickedUp: async (id) => { await packageService(db).markAsPickedUp(id); requestRefresh(); },
    updateCode:   async (id, code) => { await packageService(db).updatePickupCode(id, code, 'MANUAL'); requestRefresh(); },
  };
}
```

> 写操作后统一调 `requestRefresh()`，保证页面状态与数据库一致（满足设计原则 10）。

---

## 4. 导航与路由（expo-router）

`app/_layout.tsx` 用 `Tabs`：

| Tab | 路由文件 | 标题 | icon |
|---|---|---|---|
| 首页 | `index.tsx` | 首页 | 📦 |
| 快递 | `packages.tsx` | 快递 | 📋 |
| 账号 | `accounts.tsx` | 账号 | 👤 |
| 驿站 | `stations.tsx` | 驿站 | 📍 |
| 设置 | `settings.tsx` | 设置 | ⚙️ |

Modal 路由（`presentation: modal`）：
- `add.tsx`：手动添加表单
- `import.tsx`：粘贴物流文字 → 解析 → 确认

`app.json` 配置 `expo-router` 与 `scheme`。

---

## 5. 公共组件（`src/ui/`）

### 5.1 `PackageCard.tsx`（核心视觉）
**取件码必须最醒目**（大字号、主色背景块）。

Props：
```ts
interface PackageCardProps {
  pkg: Package;
  account?: Account;     // 用于显示脱敏手机号/平台
  station?: Station;     // 用于显示驿站名
  onCopy?: () => void;   // 复制取件码
  onPickedUp?: () => void;
  onDetail?: () => void;
  onEdit?: () => void;
}
```
布局（自上而下）：
```
[快递公司]                    [StatusBadge]
─────────────────────────────────────
         取件码：A238        ← 大字号、主色高亮
─────────────────────────────────────
📍 驿站名
📱 138****1234（脱敏，受 showSensitive 控制）
🕒 今天 10:32（arrivedAt）
[复制取件码]              [标记已取]
```

### 5.2 `MaskedText.tsx`
```ts
<MaskedText value="13812341234" type="phone" />
// showSensitive=false → 138****1234
// showSensitive=true  → 13812341234
```
`type: 'phone' | 'tracking'`，复用语料工具 `maskPhone/maskTracking`（放入 `src/utils.ts`，测试中可覆盖）。

### 5.3 其余组件
- `StatusBadge`：4 态 + UNKNOWN 的颜色映射（待取=橙、运输中=蓝、已取=灰、异常=红）。
- `EmptyState` / `LoadingState`：统一空/加载视觉。
- `FormField`：label + TextInput / Picker，带 `required` 校验。
- `ConfirmDialog`：标记已取时的轻量确认（"确定已经取件？"）。
- `ActionSheet`：首页/快递页 "+" 点击弹出「✍ 手动输入 / 📋 粘贴物流信息」。

---

## 6. 首页（核心，`app/index.tsx`）

### 6.1 数据
`useDashboard()` → `dashboardService.getSummary()`（已实现聚合：待取数、今日到站、按驿站分组、recent）。

### 6.2 顶部统计卡
```
📦 快递管理
今天 2026-09-14
┌────────┐ ┌────────┐ ┌────────┐
│ 待取 6 │ │ 今日 3 │ │ 全部 29│
└────────┘ └────────┘ └────────┘
```

### 6.3 按驿站分组列表（核心区）
```
待取快递

📍 菜鸟驿站（4 件）
  [PackageCard] 京东  A238
  [PackageCard] 中通  528
  [PackageCard] 圆通  831
  [PackageCard] 韵达  229

📍 兔喜驿站（2 件）
  [PackageCard] 顺丰  1839
  [PackageCard] 极兔  731
```

### 6.4 排序与交互
- 默认仅展示 `PENDING_PICKUP`；排序：① 待取优先 ② 最新到站 ③ 驿站名。
- 每张卡 `[复制取件码]`：调 `expo-clipboard.setStringAsync(pkg.pickupCode)`，按钮短暂显示「✓ 已复制」。
- `[标记已取]`：弹 `ConfirmDialog` → 确认 → `usePackages().markPickedUp(id)` → 卡片从首页消失（刷新），数据库保留 `PICKED_UP`。

---

## 7. 快递页（`app/packages.tsx`）

- 顶栏：搜索框（`keyword`）+ 状态筛选 chips：`[全部][待取][运输中][已取][异常]`。
- 列表：宽屏可表格；移动端用 `PackageCard` 列表（同首页卡片，但显示更完整字段：单号脱敏、账号、驿站、状态、时间）。
- 筛选维度（来自 `PackageQuery`）：`stationId` / `accountId` / `courierCompany` / `status` / `keyword`。
- 点击卡片 → 跳转 `add.tsx?mode=edit&id=xxx`（复用表单做编辑）或底部抽屉展示详情。
- 右上「+」→ `ActionSheet` → 手动 / 粘贴。

---

## 8. 账号页（`app/accounts.tsx`）

- 列表卡片：`备注名`（如"本人淘宝"）+ 平台标签 + 脱敏手机号 + 启用状态。
- 操作：`编辑` / `删除` / `启用·禁用`（`setAccountEnabled`）。
- 添加：`ActionSheet` 或右上「+」→ 跳转 `add.tsx?entity=account` 的账号表单：
  - 平台（Picker：淘宝/京东/拼多多/抖音/闲鱼/其他）
  - 备注（文字）
  - 手机号（**存完整**，展示脱敏）
  - 启用（默认开）
- 多账号场景示例：本人淘宝/手机号A、本人京东/手机号A、家人拼多多/手机号B 同屏共存（验证 `users 1:N accounts`）。

---

## 9. 驿站页（`app/stations.tsx`）

- 列表卡片：驿站名 + 类型标签（菜鸟/兔喜/丰巢/京东/中通/…/其他）+ 地址 + 「待取 N 件」。
- 操作：编辑 / 删除；`查看快递` → 跳转 `packages.tsx?stationId=xxx`（带筛选）。
- 添加：驿站表单（名称/类型/地址/电话/经纬度选填）。
- 删除驿站时，`packages.station_id` 置 `NULL`（外键 `ON DELETE SET NULL`，已在 Schema 定义）。

---

## 10. 快速添加（核心交互）

### 10.1 入口
首页/快递页「+」→ `ActionSheet`：
- ✍ 手动输入 → `add.tsx?mode=create`
- 📋 粘贴物流信息 → `import.tsx`

### 10.2 手动添加（`add.tsx`）
表单字段（对应 `CreatePackageInput`）：
```
账号（Picker，来自 useAccounts）
快递公司（Picker：中通/圆通/申通/韵达/顺丰/京东/极兔/邮政/菜鸟/其他）
快递单号（选填）
取件码（选填）
驿站（Picker，来自 useStations，可留空）
状态（Picker：待取/运输中/已取/异常）
到站时间（默认 now）
备注（选填）
```
提交：`dedupe.duplicateCheck(input)` → 若命中则提示"已存在相似快递，是否仍添加" → `packageService.createPackage` → `requestRefresh()` → 关闭 modal。

### 10.3 粘贴解析（`import.tsx`）
```
[ 粘贴淘宝/京东/拼多多/短信 物流信息 ]
─────────────────────────────────
[ 开始识别 ]
```
点击后：`parserService.parseText(text)` → 展示识别结果 + 置信度：
```
识别结果
快递公司  中通        ✓
取件码    528         ✓
驿站      XX菜鸟驿站   ✓
状态      待取件       ✓
识别置信度 96%

[修改]  [确认添加]
```
- 高/中置信度（≥0.70）：直接「确认添加」。
- 低置信度（<0.70）：提示"部分信息无法确认，请手动检查"，引导进手动表单带预填值。
- 确认后走与手动添加相同的去重 → 创建流程。

---

## 11. 设置页（`app/settings.tsx`）

- **显示设置**
  - `□ 显示敏感信息`（默认关）→ 写入 `AppContext.showSensitive`，控制 `MaskedText` 是否脱敏。
- **数据**
  - `[导出数据]`：`expo-file-system` 把 `cainiao.db` 复制到 `DocumentDirectory`，`expo-sharing` 分享。
  - `[导入数据]`：选择文件 → 覆盖 `cainiao.db` → 重启 DbClient。
  - `[备份数据库]`：同上导出副本。
- **隐私**
  - `[数据存储位置]`：显示 `cainiao.db` 本地路径（强调本地、不上传）。
- **关于**
  - 版本号 `0.1.0`、技术栈说明。
- **预留开关**（UI 先放，功能后续）：`□ 自动清理 90 天前历史`（默认关，绝不自动删）。

---

## 12. Adapter 预留（与核心解耦）

`src/adapters/` 落地《落地方案》第四十二–四十三节的接口：

```ts
// src/adapters/types.ts
export interface DataSourceAdapter {
  readonly id: string;
  readonly name: string;
  readonly supportedPlatform: Platform;
  connect?(): Promise<void>;
  disconnect?(): Promise<void>;
  fetchPackages?(): Promise<PackageData[]>;
  parse?(input: string): Promise<PackageData | null>;
  sync?(): Promise<SyncResult>;
}
```

- `manual.ts` → `ManualAdapter`：封装手动表单提交（已具备）。
- `textParser.ts` → `TextParserAdapter`：封装 `ParserService.parseText`（已具备）。
- `stubs.ts` → `TaobaoAdapter` / `JDAdapter` / `PDDAdapter` / `DouyinAdapter` / `SMSAdapter` 占位类（仅 `id/name/supportedPlatform` + 抛出 `NotImplemented` 的方法），保证未来接 Adapter 时**零侵入**核心逻辑。
- 未来同步：在 `SyncService`（本期不实现）中遍历 enabled adapter → `Normalizer` → `dedupe` → `packageService`。

> 严守设计红线：第一阶段**不**实现任何第三方平台的自动登录/破解/绕过验证码；stub 仅占位。

---

## 13. 测试与运行

### 13.1 已覆盖（Step 1–7，继续保留）
`npm test` → 22 用例（parser / dedupe / account / package）。

### 13.2 UI 验证（需真机/模拟器，沙箱无法实跑）
```bash
npm install
npx expo start        # 用 Expo Go 扫码 或 Android/iOS 模拟器
```
验证清单（即 MVP 完成标准）：
1. 启动 → 看到首页待取数量
2. 添加账号（多手机号）→ 添加驿站 → 手动添加快递 → 首页显示醒目取件码
3. 复制取件码（剪贴板）
4. 标记已取 → 首页待取减少 → 快递页"已取"仍可查
5. 粘贴物流短信 → 自动识别 → 确认 → 首页出现
6. 搜索取件码/驿站/手机号仍能找到

### 13.3 类型检查
`npm run typecheck`（`tsc --noEmit`，strict）。

### 13.4 构建（交付用）
`eas build --platform android`（或 ios），本地优先、不上传数据。

---

## 14. 分阶段小步清单（保证每步可运行）

| 子步 | 内容 | 完成判据 |
|---|---|---|
| 8.1 | 装 Expo 依赖 + `app.json` + `tsconfig` 路径 + 空 `app/_layout.tsx` | `npx expo start` 能起空白壳 |
| 8.2 | `ExpoDbClient` + `DbClient` 工厂 + `DbProvider` 启动 migration+seed | 启动无报错，日志显示 seed 成功 |
| 8.3 | `AppContext` + 4 个 hooks | hooks 能在页面取到数据（先用假数据验证） |
| 8.4 | 公共组件（PackageCard/MaskedText/StatusBadge/Empty/Loading/FormField/Confirm/ActionSheet） | 组件可复用，脱敏受开关控制 |
| 9 | 首页（统计卡 + 按驿站分组 + 复制 + 标记已取） | 首页待取列表 & 复制 & 标记已取可用 |
| 10 | 快递页（搜索 + 筛选 + 列表 + 跳转编辑） | 搜索/筛选命中正确 |
| 11 | 账号页 CRUD + 启用禁用 | 多账号共存正确 |
| 12 | 驿站页 CRUD + 查看快递跳转 | 删除驿站后 package.station_id=NULL |
| 13.1 | 快速添加：手动表单 + 去重提示 | 手动创建走通 |
| 13.2 | 快速添加：粘贴解析 + 置信度 UI | 粘贴短信识别后可确认添加 |
| 13.3 | 设置页（隐私开关 / 导出导入 / 关于）+ adapters stub | 开关控制脱敏；导出文件可分享 |
| 13.4 | `npm test` 全绿 + `tsc` 通过 + README 更新 | 类型 & 测试通过 |

---

## 15. 已知风险 & 完成标准

### 已知风险
1. **沙箱无模拟器**：UI 无法在此环境实跑，需你在真机/模拟器用 `npx expo start` 验证；核心逻辑已单测通过。
2. **expo-sqlite 版本耦合**：Expo SDK 52 对应 `expo-sqlite@15`，升级 SDK 时需同步升级。
3. **Drizzle + expo-sqlite 方言**：`drizzle-orm/expo-sqlite` 使用 `drizzle-orm/sqlite-core` 的 `sqliteTable`，与现有 `schema.ts` 一致，无需改 schema。
4. **导入数据覆盖 DB**：导入前需先备份并提示用户，避免误覆盖。

### MVP 完成标准（两个主流程跑通即达标）
- 流程 A：启动 → 加账号 → 加驿站 → 手动加快递 → 首页见醒目取件码 → 复制 → 标记已取 → 待取减少 → 历史可查 → 搜索仍可找到。
- 流程 B：粘贴物流短信 → 自动识别 → 确认 → 首页出现。

---

> 确认后我将按 **第 14 节小步清单** 顺序编码，每完成一个子步即跑 `tsc` 并汇报。如需调整某屏字段/交互，请在确认时一并指出。
