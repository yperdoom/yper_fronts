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
            <span
              v-for="day in WEEKDAYS"
              :key="day"
              class="badge"
              :class="workout.weekdays.includes(day) ? 'badge-accent' : ''"
            >
              {{ $t(`workouts.weekdays.${day}`) }}
            </span>
          </div>

          <ul :class="$style.list">
            <li v-for="(item, index) in workout.items" :key="index">
              <span>{{ item.exercise?.name || '—' }}</span>
              <span class="muted">
                {{ $t('workouts.card.setsReps', { sets: item.sets, reps: item.reps }) }}
                <template v-if="item.weight">{{ $t('workouts.card.itemWeight', { weight: number(item.weight, 1) }) }}</template>
              </span>
            </li>
            <li v-if="!workout.items.length" class="muted">{{ $t('workouts.noItems') }}</li>
          </ul>
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
          {{ $t('workouts.items.emptyBefore') }} <router-link to="/exercises">{{ $t('nav.exercises') }}</router-link> {{ $t('workouts.items.emptyAfter') }}
        </p>

        <div v-for="(item, index) in form.items" :key="index" :class="$style.item">
          <select v-model="item.exercise" required>
            <option value="" disabled>{{ $t('workouts.items.selectPlaceholder') }}</option>
            <option v-for="exercise in exercises" :key="exercise._id" :value="exercise._id">
              {{ exercise.name }}
            </option>
          </select>
          <input v-model.number="item.sets" type="number" min="1" :placeholder="$t('workouts.items.setsPlaceholder')" required />
          <input v-model="item.reps" :placeholder="$t('workouts.items.repsPlaceholder')" required />
          <input v-model.number="item.weight" type="number" step="0.5" min="0" :placeholder="$t('workouts.items.weightPlaceholder')" />
          <button type="button" class="btn-icon" @click="form.items.splice(index, 1)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, errorMessage } from '@yper/i18n';
import { workoutFocusLabel } from '@/muscleGroups';

const WEEKDAYS = [0, 1, 2, 3, 4, 5, 6];
const empty = () => ({ name: '', focus: '', weekdays: [], items: [], notes: '', active: true });

export default {
  name: 'Workouts',
  components: { AppShell, Modal },
  data() {
    return {
      WEEKDAYS,
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
    formFocus() {
      const items = this.form.items.filter((item) => item.exercise);
      if (this.originalItemCount > 0 && !items.length) return '';
      return this.focusLabel(items) || this.form.focus;
    },
  },
  async mounted() {
    await Promise.all([this.load(), this.loadExercises()]);
  },
  methods: {
    number,
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
      this.form.items.push({ exercise: '', sets: 3, reps: '10', weight: 0, restSeconds: 60 });
    },
    openForm(workout = null) {
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
              exercise: item.exercise?._id || item.exercise,
              sets: item.sets,
              reps: item.reps,
              weight: item.weight,
              restSeconds: item.restSeconds,
            })),
          }
        : empty();
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        const items = this.form.items.filter((item) => item.exercise);
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
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
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
  grid-template-columns: 1fr 74px 82px 74px auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.note {
  margin: 10px 0 0;
  font-size: 0.82rem;
}

@media (max-width: 560px) {
  .item {
    grid-template-columns: 1fr 1fr 1fr auto;
  }

  .item > select {
    grid-column: 1 / -1;
  }
}
</style>
