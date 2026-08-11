<script lang="ts" setup>
import { CircleCheckIcon, InfoIcon, LoaderCircleIcon, OctagonXIcon, TriangleAlertIcon, XIcon } from "@lucide/vue";
import { reactiveOmit } from "@vueuse/core";
import type { ToasterProps } from "vue-sonner";
import { Toaster as Sonner } from "vue-sonner";

const props = defineProps<ToasterProps>()
const delegatedProps = reactiveOmit(props, "toastOptions")
</script>

<template>
  <Sonner
    class="toaster group"
    :style="{
      '--normal-bg': 'var(--popover)',
      '--normal-text': 'var(--popover-foreground)',
      '--normal-border': 'var(--border)',
      '--border-radius': 'var(--radius)',
      '--success-bg': 'var(--toast-success-bg)',
      '--success-border': 'var(--toast-success-border)',
      '--success-text': 'var(--toast-success-text)',
      '--info-bg': 'var(--toast-info-bg)',
      '--info-border': 'var(--toast-info-border)',
      '--info-text': 'var(--toast-info-text)',
      '--warning-bg': 'var(--toast-warning-bg)',
      '--warning-border': 'var(--toast-warning-border)',
      '--warning-text': 'var(--toast-warning-text)',
      '--error-bg': 'var(--toast-error-bg)',
      '--error-border': 'var(--toast-error-border)',
      '--error-text': 'var(--toast-error-text)',
    }"
    :toast-options="{
      classes: {
        toast: 'group toast group-[.toaster]:bg-popover group-[.toaster]:text-popover-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg',
        description: 'group-[.toast]:text-muted-foreground',
        actionButton: 'toast-action !rounded-sm !px-2.5 !transition-colors !duration-150',
        cancelButton:
          'group-[.toast]:bg-muted group-[.toast]:text-muted-foreground',
      },
    }"
    v-bind="delegatedProps"
  >
    <template #success-icon>
      <CircleCheckIcon class="size-4" />
    </template>
    <template #info-icon>
      <InfoIcon class="size-4" />
    </template>
    <template #warning-icon>
      <TriangleAlertIcon class="size-4" />
    </template>
    <template #error-icon>
      <OctagonXIcon class="size-4" />
    </template>
    <template #loading-icon>
      <div>
        <LoaderCircleIcon class="size-4 animate-spin" />
      </div>
    </template>
    <template #close-icon>
      <XIcon class="size-4" />
    </template>
  </Sonner>
</template>

<style>
[data-sonner-toast] {
  --toast-action-color: var(--normal-text);
}
[data-sonner-toast][data-type='success'] {
  --toast-action-color: var(--success-text);
}
[data-sonner-toast][data-type='info'] {
  --toast-action-color: var(--info-text);
}
[data-sonner-toast][data-type='warning'] {
  --toast-action-color: var(--warning-text);
}
[data-sonner-toast][data-type='error'] {
  --toast-action-color: var(--error-text);
}

[data-sonner-toast][data-styled='true'] [data-button] {
  color: var(--toast-action-color);
  background: color-mix(in oklch, var(--toast-action-color) 14%, transparent);
  border: 1px solid color-mix(in oklch, var(--toast-action-color) 24%, transparent);
}

[data-sonner-toast][data-styled='true'] [data-button]:hover {
  background: color-mix(in oklch, var(--toast-action-color) 22%, transparent);
  border-color: color-mix(in oklch, var(--toast-action-color) 34%, transparent);
}

[data-sonner-toast][data-styled='true'] [data-button]:focus-visible {
  box-shadow: 0 0 0 2px color-mix(in oklch, var(--toast-action-color) 35%, transparent);
}
</style>
