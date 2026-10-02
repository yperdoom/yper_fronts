<template>
  <Teleport to="body">
    <div v-if="show" :class="$style.overlay" :style="viewportStyle" @mousedown.self="$emit('close')">
      <div :class="$style.dialog" role="dialog" aria-modal="true">
        <header :class="$style.head">
          <h3 :class="$style.title">{{ title }}</h3>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <form :class="$style.form" @submit.prevent="$emit('submit')">
          <div :class="$style.body">
            <slot />
          </div>
          <footer :class="$style.foot">
            <button type="button" class="btn" @click="$emit('close')">{{ $t('common.cancel') }}</button>
            <button type="submit" class="btn btn-primary" :disabled="saving">
              {{ saving ? $t('common.saving') : submitLabelResolved }}
            </button>
          </footer>
        </form>
      </div>
    </div>
  </Teleport>
</template>

<script>
export default {
  name: 'Modal',
  props: {
    show: { type: Boolean, default: false },
    title: { type: String, default: '' },
    submitLabel: { type: String, default: '' },
    saving: { type: Boolean, default: false },
  },
  emits: ['close', 'submit'],
  data() {
    return { viewportStyle: {} };
  },
  computed: {
    submitLabelResolved() {
      return this.submitLabel || this.$t('common.save');
    },
  },
  watch: {
    show: {
      immediate: true,
      handler(open) {
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
          window.addEventListener('keydown', this.onKeydown);
          window.visualViewport?.addEventListener('resize', this.updateViewport);
          window.visualViewport?.addEventListener('scroll', this.updateViewport);
          this.updateViewport();
        } else {
          this.removeListeners();
          this.viewportStyle = {};
        }
      },
    },
  },
  unmounted() {
    document.body.style.overflow = '';
    this.removeListeners();
  },
  methods: {
    updateViewport() {
      const viewport = window.visualViewport;
      // Follow the keyboard without overriding intentional pinch zoom.
      if (!viewport || viewport.scale !== 1) return;
      this.viewportStyle = {
        top: `${viewport.offsetTop}px`,
        left: `${viewport.offsetLeft}px`,
        width: `${viewport.width}px`,
        height: `${viewport.height}px`,
      };
    },
    removeListeners() {
      window.removeEventListener('keydown', this.onKeydown);
      window.visualViewport?.removeEventListener('resize', this.updateViewport);
      window.visualViewport?.removeEventListener('scroll', this.updateViewport);
    },
    onKeydown(event) {
      if (event.key === 'Escape') this.$emit('close');
    },
  },
};
</script>

<style module>
.overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100vh;
  height: 100dvh;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
  overflow: hidden;
}

.dialog {
  width: 100%;
  max-width: 560px;
  max-height: 100%;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  margin: auto;
}

.form {
  display: flex;
  flex-direction: column;
  min-height: 0;
  overflow: hidden;
}

.head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 15px 18px;
  border-bottom: 1px solid var(--border);
}

.title {
  font-size: 1rem;
}

.body {
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scroll-padding-block: 18px;
  padding: 18px;
}

.foot {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 18px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
}
@media (max-width: 640px) {
  .overlay {
    padding: max(8px, env(safe-area-inset-top)) max(8px, env(safe-area-inset-right))
      max(8px, env(safe-area-inset-bottom)) max(8px, env(safe-area-inset-left));
  }

  .foot > button {
    flex: 1;
    min-height: 48px;
  }
}
</style>
