<template>
  <AppShell :title="$t('workouts.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('workouts.newWorkout') }}
      </button>
    </template>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

    <div v-else-if="!workouts.length" class="card">
      <div class="empty">
        <span class="material-symbols-outlined">fitness_center</span>
        <p>{{ $t('workouts.empty') }}</p>
      </div>
    </div>

    <div v-else :class="$style.grid">
      <article v-for="workout in workouts" :key="workout._id" class="card">
        <div class="card-head">
          <div>
            <h2>{{ workout.name }}</h2>
            <p class="muted">{{ focusLabel(workout.items) || workout.focus || $t('workouts.noFocus') }}</p>
          </div>
          <div class="row" :class="$style.actions">
            <button class="btn-icon" :title="$t('common.edit')" @click="openForm(workout)">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" :title="$t('common.remove')" @click="remove(workout)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="row" :class="$style.days">
            <span v-for="day in workout.weekdays" :key="day" class="badge badge-accent">{{ $t(`workouts.weekdays.${day}`) }}</span>
            <div class="spacer"></div>
            <button type="button" class="btn" :aria-expanded="expandedId === workout._id" :aria-controls="'session-' + workout._id" @click="toggleWorkout(workout)">
              {{ $t(expandedId === workout._id ? 'workouts.session.close' : 'workouts.session.open') }}
            </button>
          </div>
          <WorkoutSession v-if="expandedId === workout._id" :id="'session-' + workout._id" :workout="workout" :exercises="exercises" @weight-saved="updateWeight" @busy="sessionSaving = $event" />
        </div>
      </article>
    </div>

    <Modal
      :show="showForm"
      :title="editingId ? $t('workouts.form.editTitle') : $t('workouts.newWorkout')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="name">{{ $t('workouts.form.name') }}</label>
          <input id="name" v-model="form.name" required :placeholder="$t('workouts.form.namePlaceholder')" />
        </div>
        <div class="field">
          <label for="focus">{{ $t('workouts.form.focus') }}</label>
          <input id="focus" :value="formFocus" readonly :placeholder="$t('workouts.form.focusPlaceholder')" />
        </div>
        <div class="field full">
          <label>{{ $t('workouts.form.weekdays') }}</label>
          <div class="row">
            <button
              v-for="day in WEEKDAYS"
              :key="day"
              type="button"
              class="badge"
              :class="form.weekdays.includes(day) ? 'badge-accent' : ''"
              :style="{ cursor: 'pointer', border: 'none', font: 'inherit', fontWeight: 600 }"
              @click="toggleDay(day)"
            >
              {{ $t(`workouts.weekdays.${day}`) }}
            </button>
          </div>
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>{{ $t('workouts.items.title') }}</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addItem">
            <span class="material-symbols-outlined">add</span> {{ $t('workouts.items.addButton') }}
          </button>
        </div>

        <p v-if="!exercises.length" class="muted" :class="$style.note">
          {{ $t('workouts.items.emptyBefore') }} <router-link to="/exercises" target="_blank" rel="noopener">{{ $t('nav.exercises') }}</router-link> {{ $t('workouts.items.emptyAfter') }}
        </p>

        <div v-for="(item, index) in form.items" :key="index" :class="$style.item">
          <label :for="`exercise-${index}`" :class="$style.full">{{ $t('exercises.table.exercise') }}</label>
          <select :id="`exercise-${index}`" v-model="item.exercise" required @change="item.unavailable = false">
            <option value="" disabled>{{ $t('workouts.items.selectPlaceholder') }}</option>
            <optgroup v-for="group in availableGroups" :key="group" :label="$t(`exercises.muscleGroups.${group}`)">
              <option v-for="exercise in exercisesFor(group)" :key="exercise._id" :value="exercise._id">{{ exercise.name }}</option>
            </optgroup>
          </select>
          <button type="button" class="btn-icon" @click="form.items.splice(index, 1)">
            <span class="material-symbols-outlined">close</span>
          </button>
          <p v-if="item.unavailable" :class="$style.full" class="alert alert-error">{{ $t('workouts.items.unavailable') }}</p>
          <details :class="$style.full">
            <summary class="muted">{{ $t('workouts.items.optionalCounts') }}</summary>
            <div class="form-grid">
              <div class="field">
                <label :for="`sets-${index}`">{{ $t('workouts.items.setsPlaceholder') }}</label>
                <input :id="`sets-${index}`" v-model.number="item.sets" type="number" min="1" inputmode="numeric" />
              </div>
              <div class="field">
                <label :for="`reps-${index}`">{{ $t('workouts.items.repsPlaceholder') }}</label>
                <input :id="`reps-${index}`" v-model="item.reps" :placeholder="$t('workouts.items.toFailure')" />
              </div>
            </div>
          </details>
        </div>
        <p v-if="formError" role="alert" class="alert alert-error">{{ formError }}</p>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, errorMessage } from '@yper/i18n';
import { MUSCLE_GROUPS, workoutFocusLabel } from '@/muscleGroups';
import WorkoutSession from '@/components/WorkoutSession.vue';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const empty = () => ({ name: '', focus: '', weekdays: [], items: [], notes: '', active: true });

export default {
  name: 'Workouts',
  components: { AppShell, Modal, WorkoutSession },
  data() {
    return {
      WEEKDAYS,
      MUSCLE_GROUPS,
      expandedId: null,
      sessionSaving: false,
      formError: '',
      workouts: [],
      exercises: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      originalItemCount: 0,
      form: empty(),
    };
  },
  computed: {
    availableGroups() { return MUSCLE_GROUPS.filter(group => this.exercisesFor(group).length); },
    formFocus() {
      const items = this.form.items.filter((item) => item.exercise);
      if (this.originalItemCount > 0 && !items.length) return '';
      return this.focusLabel(items) || this.form.focus;
    },
  },
  async mounted() {
    await Promise.all([this.load(), this.loadExercises()]);
    if (this.workouts.some(workout => workout._id === this.$route.query.open)) this.expandedId = this.$route.query.open;
  },
  methods: {
    number,
    groupOf(exercise) {
      return MUSCLE_GROUPS.includes(exercise?.muscleGroup) ? exercise.muscleGroup : 'other';
    },
    exercisesFor(group) {
      return this.exercises.filter((exercise) => this.groupOf(exercise) === group)
        .sort((a, b) => a.name.localeCompare(b.name, this.$i18n.locale));
    },
    toggleWorkout(workout) {
      if (this.sessionSaving) return;
      this.expandedId = this.expandedId === workout._id ? null : workout._id;
    },
    updateWeight({ id, weight }) {
      this.exercises = this.exercises.map(exercise => exercise._id === id ? { ...exercise, weight } : exercise);
    },
    async load() {
      this.loading = true;
      try {
        const { workouts } = await api.get('/workouts');
        this.workouts = workouts;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    async loadExercises() {
      try {
        const { exercises } = await api.get('/exercises');
        this.exercises = exercises;
      } catch {
        this.exercises = [];
      }
    },
    focusLabel(items) {
      return workoutFocusLabel(items, {
        exercises: this.exercises,
        t: this.$t,
        locale: this.$i18n.locale,
      });
    },
    toggleDay(index) {
      const position = this.form.weekdays.indexOf(index);
      if (position === -1) this.form.weekdays.push(index);
      else this.form.weekdays.splice(position, 1);
    },
    addItem() {
      this.form.items.push({ exercise: '', sets: null, reps: '', restSeconds: 60 });
    },
    openForm(workout = null) {
      this.formError = '';
      this.editingId = workout?._id || null;
      this.originalItemCount = workout?.items.filter((item) => item.exercise).length || 0;
      this.form = workout
        ? {
            name: workout.name,
            focus: workout.focus || '',
            weekdays: [...workout.weekdays],
            notes: workout.notes,
            active: workout.active,
            items: workout.items.map((item) => ({
              unavailable: !this.exercises.some((exercise) => exercise._id === (item.exercise?._id || item.exercise)),
              exercise: item.exercise?._id || item.exercise,
              sets: item.sets,
              reps: item.reps,
              weight: item.weight,
              restSeconds: item.restSeconds,
              ...(item.notes !== undefined ? { notes: item.notes } : {}),
            })),
          }
        : empty();
      this.showForm = true;
    },
    async save() {
      this.formError = '';
      if (this.form.items.some((item) => !this.exercises.some((exercise) => exercise._id === item.exercise))) {
        this.formError = this.$t('workouts.items.incomplete');
        return;
      }
      this.saving = true;
      try {
        const items = this.form.items.map(({ group, unavailable, ...item }) => ({ ...item, sets: item.sets === '' ? null : item.sets }));
        const body = { ...this.form, focus: this.formFocus, items };
        if (this.editingId) {
          await api.put(`/workouts/${this.editingId}`, body);
        } else {
          await api.post('/workouts', body);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(workout) {
      if (!confirm(this.$t('common.confirmRemove', { name: workout.name }))) return;
      try {
        await api.del(`/workouts/${workout._id}`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      }
    },
  },
};
</script>

<style module>
.grid {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fill, minmax(min(100%, 300px), 1fr));
  align-items: start;
}

.actions {
  flex-wrap: nowrap;
}

.days {
  gap: 5px;
  margin-bottom: 12px;
}

.list {
  margin: 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 7px 0;
  border-bottom: 1px solid var(--border);
}

.list li:last-child {
  border-bottom: none;
}

.items {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.item {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 44px;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.note {
  margin: 10px 0 0;
  font-size: 0.82rem;
}

.full {
  grid-column: 1 / -1;
  margin: 0;
}

@media (max-width: 560px) {
  .item {
    grid-template-columns: minmax(0, 1fr) 44px;
  }

  .item > * {
    min-width: 0;
  }

  .item > button {
    min-height: 44px;
  }

  .item > select {
    grid-column: 1 / -1;
  }
}
</style>
