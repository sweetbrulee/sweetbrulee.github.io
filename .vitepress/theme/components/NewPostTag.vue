<template>
    <span class="new-post-span" v-if="_isNew(props.date)">新</span>
</template>

<script lang="ts" setup>
import { computed } from 'vue'

const props = defineProps({
    date: {
        type: String,
        required: true
    }
})

//const isNew = computed(() => _isNew(props.date))

function _isNew(date: string): boolean {
    const now = new Date()
    const cutoff = new Date()
    // 设定六个月之内为新鲜贴文
    cutoff.setMonth(now.getMonth() - 12)

    return new Date(date) > cutoff
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
