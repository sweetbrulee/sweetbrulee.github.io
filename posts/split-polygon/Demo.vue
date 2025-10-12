<template>
    <div class="demo-container">
        <!-- 控制面板 -->
        <div class="control-panel">
            <div class="panel-group">
                <label for="cluster-number">聚类数量: </label>
                <input id="cluster-number" type="number" v-model.number="clusterNumber" min="2" max="50" />
            </div>

            <div class="panel-group">
                <label for="point-count">随机点数: </label>
                <input id="point-count" type="number" v-model.number="pointCount" min="100" max="5000" />
            </div>

            <div class="btn-group">
                <button @click="runAllSteps" :disabled="!canRun">开始划分</button>
                <button @click="clearPoints" :disabled="polygonPoints.length === 0">清空多边形</button>
                <button @click="clearAll" class="reset">重置所有</button>
            </div>
        </div>

        <!-- 信息面板 -->
        <div class="info-panel">
            <p>已添加 {{ polygonPoints.length }} 个点</p>
            <p v-if="stepInfo">{{ stepInfo }}</p>
        </div>

        <!-- SVG画布 -->
        <div class="svg-container">
            <svg ref="svgElement" class="demo-svg" @click="addPoint" @contextmenu.prevent="completePolygon">
                <!-- 绘制中的线段 -->
                <line
                    v-for="(line, index) in drawingLines"
                    :key="`line-${index}`"
                    :x1="line.start.x"
                    :y1="line.start.y"
                    :x2="line.end.x"
                    :y2="line.end.y"
                    class="drawing-line"
                    stroke="rgb(50, 100, 150)"
                    stroke-width="2"
                    stroke-dasharray="5,3"
                />

                <!-- 主多边形 -->
                <polygon
                    v-if="polygonPoints.length > 2 && isPolygonComplete"
                    :points="polygonPath"
                    class="main-polygon"
                    fill="rgba(100, 150, 200, 0.2)"
                    stroke="rgb(50, 100, 150)"
                    stroke-width="2"
                />

                <!-- 多边形点 -->
                <circle
                    v-for="(point, index) in polygonPoints"
                    :key="`poly-${index}`"
                    :cx="point.x"
                    :cy="point.y"
                    r="5"
                    class="polygon-point"
                    fill="rgb(50, 100, 150)"
                    @click.stop="removePoint(index)"
                />

                <!-- 随机点 -->
                <circle
                    v-for="(point, index) in randomPoints"
                    :key="`random-${index}`"
                    :cx="point[0]"
                    :cy="point[1]"
                    r="2"
                    class="random-point"
                    :fill="pointColors[point[2]] || '#333'"
                />

                <!-- 聚类质心 -->
                <circle
                    v-for="(point, index) in centroids"
                    :key="`centroid-${index}`"
                    :cx="point[0]"
                    :cy="point[1]"
                    r="8"
                    class="centroid-point"
                    :fill="pointColors[index]"
                    stroke="#fff"
                    stroke-width="2"
                />

                <!-- Voronoi区域 -->
                <polygon
                    v-for="(polygon, index) in clippedPolygons"
                    :key="`voronoi-${index}`"
                    :points="polygonToPath(polygon)"
                    class="voronoi-polygon"
                    :fill="polygonColors[index % polygonColors.length]"
                    :stroke="`rgba(255, 255, 255, 0.6)`"
                    :stroke-width="borderWidth"
                />
            </svg>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, nextTick } from 'vue'
import { Delaunay } from 'd3-delaunay'

// 类型定义
interface Point {
    x: number
    y: number
}

interface Line {
    start: Point
    end: Point
}

interface Bbox {
    minX: number
    minY: number
    maxX: number
    maxY: number
}

// 响应式数据
const svgElement = ref<SVGSVGElement | null>(null)
const polygonPoints = ref<Point[]>([])
const drawingLines = ref<Line[]>([])
const isPolygonComplete = ref(false)
const randomPoints = ref<[number, number, number][]>([]) // [x, y, clusterId]
const centroids = ref<[number, number][]>([]) // [x, y]
const voronoiPolygons = ref<Point[][]>([])
const clippedPolygons = ref<Point[][]>([])
const stepInfo = ref('')
const borderWidth = ref(2)

// 参数配置
const clusterNumber = ref(5)
const pointCount = ref(1000)

// 计算属性
const canRun = computed(() => polygonPoints.value.length >= 3 && isPolygonComplete.value)

const polygonPath = computed(() => {
    return polygonPoints.value.map((p) => `${p.x},${p.y}`).join(' ')
})

const polygonBbox = computed<Bbox | null>(() => {
    if (polygonPoints.value.length < 3) return null

    const xs = polygonPoints.value.map((p) => p.x)
    const ys = polygonPoints.value.map((p) => p.y)

    return {
        minX: Math.min(...xs),
        minY: Math.min(...ys),
        maxX: Math.max(...xs),
        maxY: Math.max(...ys)
    }
})

const hasEnoughPoints = computed(() => polygonPoints.value.length >= 2)

// 颜色配置
const pointColors = [
    '#ff6b6b',
    '#4ecdc4',
    '#45b7d1',
    '#96ceb4',
    '#feca57',
    '#ff9ff3',
    '#54a0ff',
    '#5f27cd',
    '#00d2d3',
    '#ff9f43',
    '#a3cb38',
    '#c56cf0',
    '#17c0eb',
    '#bdc581',
    '#f78fb3',
    '#786fa6',
    '#cf6a87',
    '#f19066',
    '#3dc1d3',
    '#e15f41'
]

const polygonColors = pointColors.map((color) => color + '33') // 添加透明度

// 方法 - UI交互
const addPoint = (event: MouseEvent) => {
    if (!svgElement.value || isPolygonComplete.value) return

    const rect = svgElement.value.getBoundingClientRect()
    const x = event.clientX - rect.left
    const y = event.clientY - rect.top
    const newPoint = { x, y }

    polygonPoints.value.push(newPoint)

    // 生成线段：如果已有至少一个点，就连接上一个点
    if (polygonPoints.value.length >= 2) {
        const prevPoint = polygonPoints.value[polygonPoints.value.length - 2]
        drawingLines.value.push({
            start: prevPoint,
            end: newPoint
        })
    }

    stepInfo.value = `添加了点 (${Math.round(x)}, ${Math.round(y)})`
}

const removePoint = (index: number) => {
    polygonPoints.value.splice(index, 1)

    // 移除相关的线段
    if (drawingLines.value.length > 0) {
        drawingLines.value.splice(index, 1)
    }

    if (polygonPoints.value.length < 3) {
        isPolygonComplete.value = false
    }
    stepInfo.value = `移除了点 #${index + 1}`
}

const completePolygon = () => {
    if (polygonPoints.value.length >= 3) {
        isPolygonComplete.value = true

        // 添加闭合线段（连接最后一个点和第一个点）
        if (polygonPoints.value.length > 2) {
            drawingLines.value.push({
                start: polygonPoints.value[polygonPoints.value.length - 1],
                end: polygonPoints.value[0]
            })
        }

        stepInfo.value = '多边形绘制完成，现在可以开始划分'
    }
}

const clearPoints = () => {
    polygonPoints.value = []
    drawingLines.value = [] // 清空线段
    isPolygonComplete.value = false
    stepInfo.value = '多边形已清空'
}

const clearAll = () => {
    clearPoints()
    randomPoints.value = []
    centroids.value = []
    voronoiPolygons.value = []
    clippedPolygons.value = []
    stepInfo.value = '已重置所有数据'
}

// 方法 - 算法步骤
const generateRandomPoints = () => {
    if (!polygonBbox.value) return []

    const { minX, minY, maxX, maxY } = polygonBbox.value
    const points: [number, number, number][] = []

    // 简单的点在多边形内的检测
    const isInsidePolygon = (x: number, y: number) => {
        const polyPoints = polygonPoints.value
        let inside = false

        for (let i = 0, j = polyPoints.length - 1; i < polyPoints.length; j = i++) {
            const xi = polyPoints[i].x,
                yi = polyPoints[i].y
            const xj = polyPoints[j].x,
                yj = polyPoints[j].y

            const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi

            if (intersect) inside = !inside
        }

        return inside
    }

    // 生成随机点
    let count = 0
    while (points.length < pointCount.value && count < pointCount.value * 2) {
        const x = Math.random() * (maxX - minX) + minX
        const y = Math.random() * (maxY - minY) + minY

        if (isInsidePolygon(x, y)) {
            points.push([x, y, -1]) // -1表示未分配聚类
        }
        count++
    }

    stepInfo.value = `生成了 ${points.length} 个随机点`
    return points
}

const kMeansClustering = (points: [number, number, number][]) => {
    if (points.length === 0) return []

    // 随机选择初始聚类中心
    const centroids: [number, number][] = []
    for (let i = 0; i < clusterNumber.value; i++) {
        const randomIndex = Math.floor(Math.random() * points.length)
        centroids.push([points[randomIndex][0], points[randomIndex][1]])
    }

    // 迭代优化聚类
    let changed = true
    let iterations = 0
    const maxIterations = 100

    while (changed && iterations < maxIterations) {
        changed = false

        // 分配每个点到最近的聚类中心
        points.forEach((point) => {
            let minDistance = Infinity
            let closestCentroid = -1

            centroids.forEach((centroid, index) => {
                const dx = point[0] - centroid[0]
                const dy = point[1] - centroid[1]
                const distance = dx * dx + dy * dy

                if (distance < minDistance) {
                    minDistance = distance
                    closestCentroid = index
                }
            })

            if (point[2] !== closestCentroid) {
                point[2] = closestCentroid
                changed = true
            }
        })

        // 更新聚类中心
        const clusterSums: [number, number, number][] = Array(clusterNumber.value)
            .fill(null)
            .map(() => [0, 0, 0])

        points.forEach((point) => {
            const clusterId = point[2]
            if (clusterId >= 0) {
                clusterSums[clusterId][0] += point[0]
                clusterSums[clusterId][1] += point[1]
                clusterSums[clusterId][2] += 1
            }
        })

        clusterSums.forEach((sum, index) => {
            if (sum[2] > 0) {
                centroids[index] = [sum[0] / sum[2], sum[1] / sum[2]]
            }
        })

        iterations++
    }

    stepInfo.value = `完成K-means聚类，迭代 ${iterations} 次`
    return centroids
}

const calculateCentroids = (points: [number, number, number][]) => {
    const clusters: Record<number, [number, number][]> = {}

    // 按聚类分组
    points.forEach((point) => {
        const clusterId = point[2]
        if (!clusters[clusterId]) {
            clusters[clusterId] = []
        }
        clusters[clusterId].push([point[0], point[1]])
    })

    // 计算每个聚类的质心
    const centroids: [number, number][] = []
    Object.values(clusters).forEach((clusterPoints) => {
        if (clusterPoints.length > 0) {
            const sumX = clusterPoints.reduce((acc, p) => acc + p[0], 0)
            const sumY = clusterPoints.reduce((acc, p) => acc + p[1], 0)
            centroids.push([sumX / clusterPoints.length, sumY / clusterPoints.length])
        }
    })

    stepInfo.value = `计算了 ${centroids.length} 个聚类质心`
    return centroids
}

// 生成Voronoi图
const generateVoronoiDiagram = (centroids: [number, number][]) => {
    if (centroids.length === 0) return []

    // 获取主多边形的边界框
    const bbox = polygonBbox.value
    if (!bbox) return []

    const { minX, minY, maxX, maxY } = bbox

    // 使用真实的Voronoi算法
    const delaunay = Delaunay.from(centroids)
    const voronoi = delaunay.voronoi([minX, minY, maxX, maxY])

    const voronoiPolygons: Point[][] = []

    // 为每个质心创建一个Voronoi区域
    for (let i = 0; i < centroids.length; i++) {
        const cell = voronoi.cellPolygon(i)
        if (cell) {
            // 将cell转换为Point数组
            const polygonPoints: Point[] = cell.slice(0, -1).map((point: [number, number]) => ({
                x: point[0],
                y: point[1]
            }))
            voronoiPolygons.push(polygonPoints)
        }
    }

    stepInfo.value = `生成了 ${voronoiPolygons.length} 个Voronoi区域`
    return voronoiPolygons
}

// 利用多边形求交，裁剪voronoi多边形到主多边形内
import { intersection } from 'martinez-polygon-clipping'

const clipPolygonsToMainPolygon = (voronoiPolygons: Point[][]) => {
    if (!isPolygonComplete.value || polygonPoints.value.length < 3) {
        return []
    }

    // 将主多边形转换为 martinez 格式 [[x, y], [x, y], ...]
    const mainPolygon = polygonPoints.value.map((point) => [point.x, point.y])
    // 确保多边形是闭合的
    if (
        mainPolygon[0][0] !== mainPolygon[mainPolygon.length - 1][0] ||
        mainPolygon[0][1] !== mainPolygon[mainPolygon.length - 1][1]
    ) {
        mainPolygon.push(mainPolygon[0])
    }

    const clippedPolygons: Point[][] = []

    // 对每个 Voronoi 多边形进行裁剪
    for (const voronoiPolygon of voronoiPolygons) {
        if (voronoiPolygon.length < 3) continue

        // 将 Voronoi 多边形转换为 martinez 格式
        const voronoiPoints = voronoiPolygon.map((point) => [point.x, point.y])
        // 确保多边形是闭合的
        if (
            voronoiPoints[0][0] !== voronoiPoints[voronoiPoints.length - 1][0] ||
            voronoiPoints[0][1] !== voronoiPoints[voronoiPoints.length - 1][1]
        ) {
            voronoiPoints.push(voronoiPoints[0])
        }

        try {
            // 执行多边形交集运算
            const result = intersection([mainPolygon], [voronoiPoints])

            // 如果有结果且不为空，则处理结果
            if (result && result.length > 0 && result[0].length > 0) {
                // 将结果转换回 Point[][] 格式
                const clippedPolygon: Point[] = result[0][0].map((point: any) => ({
                    x: point[0],
                    y: point[1]
                }))

                // 只保留至少有3个点的多边形
                if (clippedPolygon.length >= 3) {
                    clippedPolygons.push(clippedPolygon)
                }
            }
        } catch (error) {
            console.warn('多边形裁剪失败:', error)
            // 如果裁剪失败，跳过该多边形
            continue
        }
    }

    return clippedPolygons
}

const polygonToPath = (polygon: Point[]) => {
    return polygon.map((p) => `${p.x},${p.y}`).join(' ')
}

// 主执行函数
const runAllSteps = async () => {
    if (!polygonBbox.value) return

    stepInfo.value = '开始生成随机点...'
    await nextTick()

    // 步骤1: 生成随机点
    randomPoints.value = generateRandomPoints()
    await nextTick()

    // 步骤2: K-means聚类
    stepInfo.value = '进行K-means聚类...'
    await nextTick()
    const updatedCentroids = kMeansClustering(randomPoints.value)

    // 步骤3: 计算质心
    stepInfo.value = '计算聚类质心...'
    await nextTick()
    centroids.value = calculateCentroids(randomPoints.value)

    // 步骤4: 生成Voronoi图
    stepInfo.value = '生成Voronoi图...'
    await nextTick()
    voronoiPolygons.value = generateVoronoiDiagram(centroids.value)

    // 步骤5: 裁剪Voronoi图到主多边形内
    stepInfo.value = '裁剪Voronoi区域...'
    await nextTick()
    clippedPolygons.value = clipPolygonsToMainPolygon(voronoiPolygons.value)

    stepInfo.value = '区块划分完成！'
}
</script>

<style scoped>
.demo-container {
    display: flex;
    flex-direction: column;
    max-width: 100%;
    margin: 0 auto;
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
}

.control-panel {
    display: flex;
    flex-wrap: wrap;
    gap: 20px;
    padding: 15px;
    border-radius: 8px;
    margin-top: 15px;
    margin-bottom: 15px;
    align-items: center;
}

.panel-group {
    display: flex;
    align-items: center;
    gap: 8px;
}

.panel-group label {
    font-weight: 500;
    white-space: nowrap;
}

.panel-group input {
    width: 80px;
    padding: 6px 10px;
    border: 1px solid #dcdfe6;
    border-radius: 4px;
    font-size: 14px;
}

.panel-group input[type='range'] {
    width: 100px;
}

.btn-group {
    display: flex;
    gap: 10px;
    margin-left: auto;
}

button {
    padding: 8px 16px;
    border: none;
    border-radius: 4px;
    background-color: #3498db;
    color: black;
    cursor: pointer;
    font-size: 14px;
    transition: background-color 0.3s;
}

button:hover:not(:disabled) {
    background-color: #2980b9;
}

button:disabled {
    background-color: #bdc3c7;
    cursor: not-allowed;
}

button.reset {
    background-color: #e74c3c;
}

button.reset:hover:not(:disabled) {
    background-color: #c0392b;
}

.info-panel {
    padding: 10px 15px;
    border-radius: 8px;
    margin-bottom: 15px;
    font-size: 14px;
    line-height: 1.5;
}

.info-panel p {
    margin: 5px 0;
}

.svg-container {
    width: 100%;
    height: 500px;
    border: 1px solid #bdc3c763;
    border-radius: 8px;
    overflow: hidden;
}

.demo-svg {
    width: 100%;
    height: 100%;
    /* background-color: #f9f9f9; */
    cursor: crosshair;
}

.drawing-line {
    pointer-events: none; /* 防止线段干扰点击事件 */
}

.main-polygon {
    fill-opacity: 0.1;
    stroke-dasharray: 5, 5;
}

.polygon-point {
    cursor: pointer;
}

.polygon-point:hover {
    r: 6;
    fill: #e74c3c;
}

.random-point {
    opacity: 0.7;
}

.centroid-point {
    filter: drop-shadow(0 0 2px rgba(0, 0, 0, 0.5));
}

.voronoi-polygon {
    fill-opacity: 0.5;
}

@media (max-width: 768px) {
    .control-panel {
        flex-direction: column;
        align-items: flex-start;
    }

    .btn-group {
        margin-left: 0;
        width: 100%;
        justify-content: space-between;
    }
}
</style>
