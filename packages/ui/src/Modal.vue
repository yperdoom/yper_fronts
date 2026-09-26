<template>
  <Teleport to="body">
    <div v-if="show" :class="$style.overlay" @mousedown.self="$emit('close')">
      <div :class="$style.dialog" role="dialog" aria-modal="true">
        <header :class="$style.head">
          <h3 :class="$style.title">{{ title }}</h3>
          <button type="button" class="btn-icon" @click="$emit('close')">
            <span class="material-symbols-outlined">close</span>
          </button>
        </header>

        <form @submit.prevent="$emit('submit')">
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
  computed: {
    submitLabelResolved() {
      return this.submitLabel || this.$t('common.save');
    },
  },
  watch: {
    show(open) {
      document.body.style.overflow = open ? 'hidden' : '';
      if (open) window.addEventListener('keydown', this.onKeydown);
      else window.removeEventListener('keydown', this.onKeydown);
    },
  },
  unmounted() {
    document.body.style.overflow = '';
    window.removeEventListener('keydown', this.onKeydown);
  },
  methods: {
    onKeydown(event) {
      if (event.key === 'Escape') this.$emit('close');
    },
  },
};
</script>

<style module>
.overlay {
  position: fixed;
  inset: 0;
  z-index: 60;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  background: var(--overlay);
  overflow-y: auto;
}

.dialog {
  width: 100%;
  max-width: 560px;
  background: var(--surface);
  border-radius: var(--radius);
  box-shadow: var(--shadow-lg);
  margin: auto;
}

.head {
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
  padding: 18px;
}

.foot {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 18px;
  background: var(--surface-2);
  border-top: 1px solid var(--border);
  border-radius: 0 0 var(--radius) var(--radius);
}
</style>
