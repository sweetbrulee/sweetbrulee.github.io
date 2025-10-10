<template>
    <span class="new-post-span" v-if="isNew">新</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
    date: {
        type: String,
        required: true
    }
})

const isNew = computed(() => _isNew(props.date))

function _isNew(date: string): boolean {
    const now = new Date()
    const oneMonthAgo = new Date()
    // 设定六个月之内为新鲜贴文
    oneMonthAgo.setMonth(now.getMonth() - 6)

    return new Date(date) > oneMonthAgo
}
</script>

<style scoped>
.new-post-span {
    padding: 0px 10px 0px 10px !important;
    background: var(--vp-c-brand) !important;
    color: white !important;
    border-radius: 5px !important;
    font-size: 12px !important;
    font-weight: 700 !important;
}
</style>
