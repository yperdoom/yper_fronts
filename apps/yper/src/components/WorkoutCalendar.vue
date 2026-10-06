<template>
  <section class="card" :class="$style.calendar">
    <div class="card-head">
      <h2>{{ weekly ? $t('activity.week') : monthLabel }}</h2>
      <div v-if="!weekly" class="row">
        <button type="button" class="btn" :aria-label="$t('activity.previous')" @click="moveMonth(-1)"><span class="material-symbols-outlined">chevron_left</span></button>
        <button type="button" class="btn" :aria-label="$t('activity.next')" @click="moveMonth(1)"><span class="material-symbols-outlined">chevron_right</span></button>
      </div>
      <span v-else-if="!loading && !error" class="badge badge-accent">{{ $t('activity.daysCount', { count: activeDays.size }) }}</span>
    </div>
    <div class="card-body">
      <p v-if="loading" class="muted">{{ $t('common.loading') }}</p>
      <div v-else-if="error" role="alert" class="alert alert-error">
        {{ error }} <button type="button" class="btn" @click="load">{{ $t('workouts.session.retry') }}</button>
      </div>
      <template v-else>
        <div :class="$style.grid">
          <span v-for="day in [1, 2, 3, 4, 5, 6, 0]" :key="day" :class="$style.heading">{{ $t(`workouts.weekdays.${day}`) }}</span>
          <span v-for="n in padding" :key="`blank-${n}`"></span>
          <button v-for="day in days" :key="day.key" type="button" :data-day="day.key"
            :class="[$style.day, activeDays.has(day.key) && $style.active, day.key === today && $style.today]"
            :aria-label="`${day.key}: ${$t(activeDays.has(day.key) ? 'activity.trained' : day.key > today ? 'activity.future' : 'activity.rest')}`"
            :aria-pressed="selected === day.key" @click="selected = day.key">
            <span>{{ day.number }}</span><span aria-hidden="true">{{ activeDays.has(day.key) ? '✓' : day.key > today ? '·' : '—' }}</span>
          </button>
        </div>
        <p class="muted" :class="$style.legend">{{ $t('activity.legend') }}</p>
        <div v-if="selected" :class="$style.selected">
          <strong>{{ selected }}</strong>
          <ul v-if="selectedActivity.length">
            <li v-for="(entry, index) in selectedActivity" :key="index">
              {{ entry.workoutName || $t('history.freeWorkout') }}
              <span v-if="entry.completedCount">{{ $t('activity.completed', { count: entry.completedCount }) }}</span>
            </li>
          </ul>
          <p v-else class="muted">{{ $t(selected > today ? 'activity.future' : 'activity.rest') }}</p>
        </div>
      </template>
    </div>
  </section>
</template>

<script>
import { api } from '@/api';
import { errorMessage } from '@yper/i18n';
import { localDay } from '@/trainingDates';

export default {
  props: { weekly: { type: Boolean, default: false } },
  data() {
    return { today: localDay(), anchor: new Date(), activity: [], selected: '', loading: true, error: '', version: 0, timer: null };
  },
  computed: {
    start() {
      const date = new Date(this.anchor.getFullYear(), this.anchor.getMonth(), this.weekly ? this.anchor.getDate() : 1, 12);
      if (this.weekly) date.setDate(date.getDate() - (date.getDay() + 6) % 7);
      return date;
    },
    days() {
      const count = this.weekly ? 7 : new Date(this.anchor.getFullYear(), this.anchor.getMonth() + 1, 0).getDate();
      return Array.from({ length: count }, (_, index) => {
        const date = new Date(this.start); date.setDate(date.getDate() + index);
        return { key: localDay(date), number: date.getDate() };
      });
    },
    padding() { return this.weekly ? 0 : (this.start.getDay() + 6) % 7; },
    activeDays() { return new Set(this.activity.map(entry => entry.day).filter(day => day <= this.today)); },
    selectedActivity() { return this.activity.filter(entry => entry.day === this.selected); },
    monthLabel() { return new Intl.DateTimeFormat(this.$i18n.locale, { month: 'long', year: 'numeric' }).format(this.anchor); },
  },
  mounted() {
    this.load();
    this.timer = window.setInterval(this.checkDay, 30000);
    document.addEventListener('visibilitychange', this.checkDay);
  },
  beforeUnmount() {
    this.version++;
    window.clearInterval(this.timer);
    document.removeEventListener('visibilitychange', this.checkDay);
  },
  methods: {
    checkDay() {
      if (this.today === localDay()) return;
      this.today = localDay();
      if (this.weekly) { this.anchor = new Date(); this.selected = ''; }
      this.load();
    },
    moveMonth(delta) {
      this.anchor = new Date(this.anchor.getFullYear(), this.anchor.getMonth() + delta, 1, 12);
      this.selected = '';
      this.load();
    },
    async load() {
      const version = ++this.version;
      this.loading = true; this.error = '';
      const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      try {
        const response = await api.get(`/workouts/activity?from=${this.days[0].key}&to=${this.days.at(-1).key}&timezone=${encodeURIComponent(timezone)}`);
        if (!Array.isArray(response?.activity)) throw new Error(this.$t('activity.loadError'));
        if (version === this.version) this.activity = response.activity;
      } catch (err) {
        if (version === this.version) this.error = errorMessage(this.$t, err);
      } finally {
        if (version === this.version) this.loading = false;
      }
    },
  },
};
</script>

<style module>
.calendar { margin-bottom: 16px; }
.grid { display: grid; grid-template-columns: repeat(7, minmax(0, 1fr)); gap: 5px; }
.heading { text-align: center; color: var(--text-muted); font-size: 0.8rem; }
.day { display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 52px; border: 1px solid var(--border); border-radius: var(--radius-sm); background: var(--surface-2); color: var(--text-muted); font: inherit; cursor: pointer; }
.active { background: var(--accent); color: var(--accent-contrast); border-color: var(--accent); }
.today { outline: 2px solid var(--text-muted); outline-offset: 1px; }
.day[aria-pressed="true"] { box-shadow: 0 0 0 2px var(--accent); }
.legend { font-size: 0.8rem; margin-bottom: 0; }
.selected { margin-top: 16px; }
</style>
