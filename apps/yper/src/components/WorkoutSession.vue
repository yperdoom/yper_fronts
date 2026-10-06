<template>
  <div>
    <p class="muted">{{ $t('workouts.session.today') }}</p>
    <p v-if="error" class="alert alert-error" role="alert">{{ error }}</p>
    <button v-if="!ready && !loading" type="button" class="btn" @click="loadProgress">{{ $t('workouts.session.retry') }}</button>
    <ul :class="$style.list">
      <li v-for="(item, index) in workout.items" :key="index" :class="$style.item">
        <div :class="$style.row">
          <label :class="$style.check">
            <input type="checkbox" :checked="completed.includes(exerciseId(item))"
              :disabled="!ready || completing || !exerciseFor(item)" @change="toggleComplete(item, $event)" />
            <span :class="completed.includes(exerciseId(item)) ? $style.done : ''">{{ exerciseFor(item)?.name || item.exercise?.name || $t('workouts.session.unavailable') }}</span>
          </label>
          <button type="button" class="btn" :disabled="saving || !exerciseFor(item)" @click="editWeight(item)">
            {{ $t('workouts.session.weight', { weight: number(weightOf(item), 1) }) }}
            <span class="material-symbols-outlined">edit</span>
          </button>
        </div>
        <form v-if="editing === exerciseId(item)" :class="$style.weightForm" @submit.prevent="saveWeight(item)">
          <label :for="`weight-${index}`">{{ $t('exercises.form.weight') }}</label>
          <div class="row">
            <input :id="`weight-${index}`" v-model="draftWeight" type="number" min="0" step="any" inputmode="decimal" required :disabled="saving" />
            <button class="btn btn-primary" :disabled="saving">{{ $t(saving ? 'common.saving' : 'common.save') }}</button>
            <button type="button" class="btn" :disabled="saving" @click="editing = null">{{ $t('common.cancel') }}</button>
          </div>
          <small class="muted">{{ $t('workouts.session.sharedWeight') }}</small>
        </form>
      </li>
    </ul>
    <p v-if="!workout.items.length" class="muted">{{ $t('workouts.noItems') }}</p>
  </div>
</template>

<script>
import { api } from '@/api';
import { errorMessage, number } from '@yper/i18n';
import { localDay } from '@/trainingDates';

export default {
  props: { workout: { type: Object, required: true }, exercises: { type: Array, required: true } },
  emits: ['weight-saved', 'busy'],
  data() {
    return { day: localDay(), completed: [], ready: false, loading: false, completing: false,
      editing: null, draftWeight: '', saving: false, error: '', requestVersion: 0, timer: null };
  },
  mounted() {
    this.loadProgress();
    this.timer = window.setInterval(this.checkDay, 30000);
    document.addEventListener('visibilitychange', this.checkDay);
  },
  beforeUnmount() {
    this.requestVersion++;
    window.clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.checkDay);
  },
  methods: {
    number,
    exerciseId(item) { return item.exercise?._id || item.exercise; },
    exerciseFor(item) { return this.exercises.find(exercise => exercise._id === this.exerciseId(item)); },
    weightOf(item) { return this.exerciseFor(item)?.weight ?? item.exercise?.weight ?? item.weight ?? 0; },
    checkDay() {
      if (this.day !== localDay()) {
        this.day = localDay();
        this.completed = [];
        this.loadProgress();
      }
    },
    async loadProgress() {
      const version = ++this.requestVersion;
      this.ready = false;
      this.loading = true;
      this.error = '';
      try {
        const response = await api.get(`/workouts/${this.workout._id}/progress?day=${this.day}`);
        if (version !== this.requestVersion) return;
        this.completed = response.completedExercises;
        this.ready = true;
      } catch (err) {
        if (version === this.requestVersion) this.error = errorMessage(this.$t, err);
      } finally {
        if (version === this.requestVersion) this.loading = false;
      }
    },
    async toggleComplete(item, event) {
      const completed = event.target.checked;
      event.target.checked = this.completed.includes(this.exerciseId(item));
      if (this.day !== localDay()) { this.checkDay(); return; }
      if (!this.ready || this.completing) return;
      const version = this.requestVersion;
      this.completing = true;
      this.error = '';
      try {
        const response = await api.put(`/workouts/${this.workout._id}/progress`, {
          day: this.day, exercise: this.exerciseId(item), completed,
        });
        if (version === this.requestVersion) this.completed = response.completedExercises;
      } catch (err) {
        if (version === this.requestVersion) this.error = errorMessage(this.$t, err);
      } finally {
        this.completing = false;
      }
    },
    editWeight(item) { this.editing = this.exerciseId(item); this.draftWeight = this.weightOf(item); },
    async saveWeight(item) {
      const weight = Number(this.draftWeight);
      if (this.saving || String(this.draftWeight).trim() === '' || !Number.isFinite(weight) || weight < 0) return;
      this.saving = true;
      this.$emit('busy', true);
      this.error = '';
      try {
        await api.put(`/exercises/${this.exerciseId(item)}`, { weight });
        this.$emit('weight-saved', { id: this.exerciseId(item), weight });
        this.editing = null;
      } catch (err) {
        this.error = errorMessage(this.$t, err);
      } finally {
        this.saving = false;
        this.$emit('busy', false);
      }
    },
  },
};
</script>

<style module>
.list { list-style: none; padding: 0; margin: 0; }
.item { border-bottom: 1px solid var(--border); padding: 12px 0; }
.item:last-child { border-bottom: 0; }
.row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.row > button { flex-shrink: 0; min-height: 44px; }
.check { display: flex; align-items: center; gap: 10px; min-height: 44px; cursor: pointer; overflow-wrap: anywhere; }
.check input { width: 22px; height: 22px; flex-shrink: 0; accent-color: var(--accent); }
.done { text-decoration: line-through; color: var(--text-muted); }
.weightForm { margin-top: 12px; }
.weightForm input { flex: 1; min-width: 70px; width: 90px; }
</style>
