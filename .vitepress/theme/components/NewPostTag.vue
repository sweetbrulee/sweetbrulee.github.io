<template>
    <span class="new-post-span" v-if="isNew">新</span>
</template>

<script lang="ts" setup>
const props = defineProps({
    isNew: {
        type: Boolean,
        required: true
    }
})
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
