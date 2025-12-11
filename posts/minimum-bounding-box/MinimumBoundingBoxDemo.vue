<template>
    <div class="mbb-wrapper">
        <div ref="canvasContainer" class="mbb-canvas-container"></div>
        <div class="mbb-instruction">
            <h4>操作说明</h4>
            <ul>
                <li><strong>鼠标右键：</strong>旋转</li>
                <li><strong>鼠标中键 / (Ctrl/Shift + 右键)：</strong>平移</li>
                <li><strong>鼠标滚轮：</strong>缩放</li>
                <li><strong>Ctrl + 左键：</strong>新增物体</li>
                <li><strong>右键点击物体：</strong>选中物体</li>
                <li><strong>点击 TransformControls 控件：</strong>拖动物体</li>
                <li><strong>Shift + 左键：</strong>框选多个物体</li>
                <li><strong>Delete：</strong>删除选中物体</li>
                <li><strong>触控长按：</strong>新增物体</li>
            </ul>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { bootstrap } from './demo/main'
import './demo/styles.css'

const canvasContainer = ref<HTMLDivElement | null>(null)
let dispose: (() => void) | null = null

onMounted(() => {
    if (canvasContainer.value) {
        dispose = bootstrap(canvasContainer.value)
    }
})

onBeforeUnmount(() => {
    if (dispose) dispose()
})
</script>

<style scoped>
.mbb-wrapper {
    width: 100%;
    height: 70vh;
    position: relative;
    border: 1px solid var(--vp-c-border);
    border-radius: 8px;
    overflow: hidden;
    background: #0b0d11;
    box-shadow: 0 6px 18px rgba(0, 0, 0, 0.35);
}

.mbb-canvas-container {
    width: 100%;
    height: 100%;
    position: relative;
}

.mbb-canvas {
    display: block;
    width: 100%;
    height: 100%;
}

.mbb-instruction {
    position: absolute;
    right: 12px;
    bottom: 12px;
    padding: 12px 14px;
    background: rgba(0, 0, 0, 0.55);
    color: #e8f0ff;
    font-size: 13px;
    line-height: 1.5;
    border: 1px solid rgba(255, 255, 255, 0.08);
    border-radius: 8px;
    max-width: 260px;
}

.mbb-instruction h4 {
    margin: 0 0 6px;
    font-size: 14px;
    color: #f5f7ff;
}

.mbb-instruction ul {
    padding-left: 18px;
    margin: 0;
}

.mbb-instruction li {
    margin-bottom: 4px;
}
</style>
