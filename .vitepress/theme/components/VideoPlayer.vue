<script setup>
import { ref, onMounted } from 'vue'

// 接收视频 ID
const props = defineProps({
    bilibiliId: { type: String, required: false },
    youtubeId: { type: String, required: false },
    defaultSource: { type: String, default: 'auto' } // 可选: 'auto' | 'bilibili' | 'youtube'
})

const currentSource = ref(props.defaultSource)
const youtubeReachable = ref(null) // null = 未检测, true/false = 检测结果

/**
 * 测试是否可以访问 YouTube 资源
 * 方法：加载一个很小的 YouTube 静态资源（favicon.ico）
 */
async function checkYoutubeConnectivity() {
    try {
        const controller = new AbortController()
        const timeout = setTimeout(() => controller.abort(), 2500) // 最多 2.5 秒
        const resp = await fetch('https://www.youtube.com/favicon.ico', {
            mode: 'no-cors',
            signal: controller.signal
        })
        clearTimeout(timeout)
        // 如果能返回（哪怕是 opaque 响应）代表能连通
        youtubeReachable.value = true
    } catch (e) {
        youtubeReachable.value = false
    }
}

onMounted(async () => {
    if (props.defaultSource === 'auto') {
        await checkYoutubeConnectivity()
        currentSource.value = youtubeReachable.value ? 'youtube' : 'bilibili'
    }
})

function switchSource() {
    currentSource.value = currentSource.value === 'bilibili' ? 'youtube' : 'bilibili'
}
</script>

<template>
    <div class="video-player">
        <div class="video-frame">
            <!-- 哔哩哔哩 -->
            <iframe
                v-if="currentSource === 'bilibili' && bilibiliId"
                :src="`https://player.bilibili.com/player.html?bvid=${bilibiliId}&autoplay=0`"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
            ></iframe>

            <!-- YouTube -->
            <iframe
                v-else-if="currentSource === 'youtube' && youtubeId"
                :src="`https://www.youtube.com/embed/${youtubeId}`"
                frameborder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                referrerpolicy="strict-origin-when-cross-origin"
                allowfullscreen
            ></iframe>

            <!-- 加载状态 -->
            <p v-else-if="currentSource === 'auto' || youtubeReachable === null" class="loading">
                正在检测最佳视频源...
            </p>

            <p v-else class="no-video">未提供有效的视频 ID</p>
        </div>

        <div class="video-controls">
            <button @click="switchSource" v-if="bilibiliId && youtubeId && youtubeReachable !== null">
                当前源：{{ currentSource === 'bilibili' ? '哔哩哔哩' : 'YouTube' }}（点击切换）
            </button>
        </div>
    </div>
</template>

<style scoped>
.video-player {
    display: flex;
    flex-direction: column;
    max-width: 700px;
    margin: 1.5em 0;
    text-align: center;
}
.video-frame iframe {
    width: 100%;
    /* max-width: 800px; */
    height: 400px;
    border-radius: 12px;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.1);
}
.video-controls {
    margin-top: 10px;
}
.video-controls button {
    background: #f3f4f6;
    border: 1px solid #d1d5db;
    color: black;
    border-radius: 6px;
    padding: 6px 12px;
    cursor: pointer;
    font-size: 14px;
    transition: background 0.2s;
}
.video-controls button:hover {
    background: #e5e7eb;
}
.loading,
.no-video {
    color: #888;
    font-style: italic;
    padding: 10px;
}
</style>
