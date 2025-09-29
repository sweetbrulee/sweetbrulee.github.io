---
date: 2023-12-31
title: 股票AI分析助手
description: 利用ChatGPT分析K线图等内容并提出投资建议
category: Frontend
tags:
    - vue
    - vite
    - chatgpt
    - llm
---

<VideoPlayer youtubeId="rC4neHCAZUI" />

## 一、项目架构与核心设计

### 1.1 项目结构概览

本项目是一个基于 Vue 3 的股票信息展示系统，采用标准的 Vue 项目结构：

```
src/
├── views/          # 页面视图组件
├── components/     # 可复用UI组件
├── store/          # Pinia状态管理
├── utils/          # 工具函数
├── router/         # 路由配置
├── styles/         # 样式文件
└── model/          # 类型定义
```

系统采用 Vue 3 Composition API 与 TypeScript 构建，使用 Element Plus 作为 UI 组件库，通过 Vite 进行构建。

### 1.2 核心技术栈

- **框架**: Vue 3 (Composition API)
- **状态管理**: Pinia
- **UI 组件库**: Element Plus
- **构建工具**: Vite
- **图表库**: ECharts
- **类型系统**: TypeScript

## 二、关键功能模块实现

### 2.1 时间范围处理模块

系统提供了完善的时间范围处理工具，用于股票数据查询：

```ts
// src/utils/time_range.ts
export function getTimeRangePast1Hour() {
  const endTime = new Date();
  const beginTime = new Date(endTime.getTime() - 60 * 60 * 1000);
  return { beginTime, endTime };
}

export function getTimeRangePast1Day() {
  const endTime = new Date();
  const beginTime = new Date(endTime.getTime() - 24 * 60 * 60 * 1000);
  return { beginTime, endTime };
}

// 以及其他时间范围函数...
```

这些函数被用于股票数据查询，如 `src/views/discover/stock/trade_simulator.vue` 中：

```ts
<script setup lang="tsx">
import { getTimeRangePast1Month } from "@/utils/time_range";
// ...
</script>
```

### 2.2 K线图实现

系统基于 ECharts 实现了专业的 K 线图组件，核心算法包括移动平均线计算：

```ts
// src/utils/echarts/candlestick_common.ts
export function calculateMA(dayCount: number, data: DataItem[]) {
  var result = [];
  for (var i = 0, len = data.length; i < len; i++) {
    if (i < dayCount) {
      result.push("-");
      continue;
    }
    var sum = 0;
    for (var j = 0; j < dayCount; j++) {
      sum += +data[i - j][1];
    }
    result.push(sum / dayCount);
  }
  return result;
}
```

K线图组件采用响应式设计，支持最小化和完整模式 `src/components/Chart/Candlestick.vue`：

```ts
<script setup lang="ts">
const viewOption = computed({
  get() {
    return props.modelValue;
  },
  set(newViewOption) {
    emit("update:modelValue", newViewOption);
  },
});

const chartDate = ref();
const chartData = ref();
const chartSeries = ref();
const chartLoading = ref(false);

const dynamicOption = ref<any>();
let generateSeries: ((chartData: any) => any) | undefined = undefined;

watchEffect(() => {
  dynamicOption.value = cloneDeep(
    props.minimal ? optionTemplateMinimal : optionTemplateFull
  );
});
</script>
```

### 2.3 高性能表格组件

系统实现了 `PrettyTable` 组件，用于展示股票数据：

```ts
<script setup lang="ts">
function generateColumns(
  columnsData: ColumnData[],
  prefix = "column-",
  option?: any
) {
  if (!columnsData) return [];
  return Array.from(columnsData).map((data, index) => {
    if (typeof data === "string") {
      return {
        ...option,
        key: `${prefix}${data}`,
        dataKey: `${data}`,
        title: `${data}`,
        width: props.columnWidth,
        cellRenderer: (row: any) => defaultCellRenderer(row, data, index),
      };
    } else {
      // 复杂列配置处理
    }
  });
}

watchEffect(() => {
  columns.value = generateColumns(props.columnsData);
});

function generateData<T>(
  rawData: T[] | undefined,
  columns: ReturnType<typeof generateColumns> | undefined,
  prefix = "row-"
) {
  // 数据转换逻辑
}
</script>
```

该组件使用 `el-table-v2` 实现虚拟滚动，优化大数据量渲染性能。

### 2.4 OpenAI 集成实现

系统集成了 OpenAI API，实现股票分析助手功能：

```ts
// src/utils/openai.ts
export async function sendToGPTEndpoint(
  messages: Message[],
  outBuffer: Ref<string>
) {
  const { token, orgId } = await fetchOpenaiSettings();

  try {
    const openai = new OpenAI({
      apiKey: token,
      organization: orgId,
      dangerouslyAllowBrowser: true,
    });

    const messages_with_role: Message[] = [
      {
        role: "system",
        content: "你是一个协助用户进行股票利弊分析、投资推荐的AI助手",
      },
      ...messages,
    ];

    const stream = await openai.chat.completions.create({
      model: "gpt-3.5-turbo-1106",
      messages: messages_with_role,
      stream: true,
    });

    for await (const chunk of stream) {
      outBuffer.value += chunk.choices[0]?.delta?.content || "";
    }
  } catch {
    // 错误处理
  }
}
```

该实现使用流式响应（stream: true），实现逐字输出效果，提升用户体验。

## 三、系统架构特点

### 3.1 状态管理设计

系统采用 Pinia 进行状态管理，例如聊天状态管理：

```ts
// src/store/chat.ts
export const useChatStore = defineStore("chat", () => {
  const messages = ref<Message[]>([]);

  function clearMessages() {
    /*...*/
  }

  let targetOutputMessage: Message;

  const prompt = ref<string>("");
  const response = ref<string>("");

  watch([response], () => {
    targetOutputMessage.content = response.value;
  });

  const onMessagesChanged = ref<(() => any) | undefined>(undefined);

  async function sendToGPTEndpoint(input: string) {
    /*...*/
  }

  return {
    messages,
    clearMessages,
    onMessagesChanged,
    prompt,
    response,
    sendToGPTEndpoint,
  };
});
```

### 3.2 路由配置

系统采用 Vue Router 实现路由管理，具有清晰的嵌套路由结构：

```ts
// src/router/index.ts
{
  path: "discover",
  meta: { title: "探索" },
  children: [
    {
      path: "",
      component: () => import("@/views/discover/index.vue"),
    },
    {
      path: "stocks",
      meta: { title: "股票市场" },
      children: [
        {
          name: "stocks",
          path: "",
          component: () => import("@/views/discover/stocks.vue"),
        },
        {
          name: "stock",
          path: ":code",
          component: () => import("@/views/discover/stock/index.vue"),
          props: (route) => ({ code: route.params.code }),
          meta: {
            title: "股票",
            documentTitle: "股票",
          },
        },
      ],
    },
  ],
}
```

### 3.3 构建配置

系统使用 Vite 进行构建，配置了代码分割策略：

```ts
// vite.config.ts
manualChunks(id) {
  if (id.includes("node_modules")) {
    let name = id.split("node_modules/")[1].split("/");
    if (name[0] == ".pnpm") {
      return name[1];
    } else {
      return name[0];
    }
  }
}
```

该配置将依赖库按顶级包名拆分，优化加载性能。

## 四、系统功能特点

### 4.1 股票交易模拟器

系统实现了股票交易模拟功能：

```ts
<script setup lang="tsx">
import PrettyTable from "@/components/PrettyTable.vue";
import Flow from "@/components/Chart/Flow.vue";
import { getTimeRangePast1Month } from "@/utils/time_range";

const tradeSimStore = useTradeSimStore();
const { stockTradeList } = storeToRefs(tradeSimStore);
const columnsData = [
  {
    label: "代码",
    name: "code",
  },
  {
    label: "价格",
    name: "costPrice",
  },
  // 其他列定义
];
</script>
```

### 4.2 应用设置持久化

系统使用 localStorage 持久化应用设置：

```ts
// src/utils/app_settings.ts
export async function storeAppSettings(settings: AppSettings) {
  localStorage.setItem("show-embed-chart", settings.showEmbedChart ? "1" : "0");
}

export async function fetchAppSettings() {
  if (!localStorage.getItem("show-embed-chart")) {
    localStorage.setItem("show-embed-chart", "0"); // default
  }
  const showEmbedChart = localStorage.getItem("show-embed-chart") === "1";
  return { showEmbedChart };
}
```

## 五、总结

本项目技术特点包括：

1. **模块化设计**：各功能模块职责明确，代码组织合理
2. **响应式架构**：充分利用 Vue 3 Composition API 的响应式特性
3. **专业图表支持**：基于 ECharts 实现专业的股票图表展示
4. **AI 助手集成**：通过 OpenAI API 增强分析能力
5. **用户体验优化**：主题切换、虚拟滚动等提升用户体验
