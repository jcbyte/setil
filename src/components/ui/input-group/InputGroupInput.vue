<script setup lang="ts">
import type { HTMLAttributes } from "vue"
import { cn } from "@/lib/utils"
import { Input } from '@/components/ui/input'

const props = defineProps<{
  defaultValue?: string | number
  modelValue?: string | number
  class?: HTMLAttributes["class"]
}>()

const emit = defineEmits<{
  (e: "update:modelValue", payload: string | number): void
}>()
</script>

<template>
  <Input
    data-slot="input-group-control"
    :default-value="props.defaultValue"
    :model-value="props.modelValue"
    @update:model-value="(value) => emit('update:modelValue', value)"
    :class="cn(
      'flex-1 rounded-none border-0 bg-transparent focus-visible:ring-0 focus-visible:ring-transparent ring-offset-transparent dark:bg-transparent',
      props.class,
    )"
  />
</template>
