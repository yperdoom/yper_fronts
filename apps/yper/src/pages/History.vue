<template>
  <AppShell title="Histórico">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Registrar treino
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <h2>Sessões registradas</h2>
        <span class="muted">{{ logs.length }} sessão(ões)</span>
      </div>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="!logs.length" class="empty">
        <span class="material-symbols-outlined">history</span>
        <p>Nenhum treino registrado ainda.</p>
      </div>

      <div v-else>
        <article v-for="log in logs" :key="log._id" :class="$style.entry">
          <div class="row">
            <strong>{{ log.workout?.name || 'Treino avulso' }}</strong>
            <span class="badge">{{ date(log.date) }}</span>
            <span v-if="log.durationMinutes" class="badge">{{ log.durationMinutes }} min</span>
            <span class="badge badge-accent">{{ number(log.totalVolume) }} kg de volume</span>
            <div class="spacer"></div>
            <button class="btn-icon" title="Remover" @click="remove(log)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>

          <ul :class="$style.list">
            <li v-for="(entry, index) in log.entries" :key="index">
              <span>{{ entry.exercise?.name || '—' }}</span>
              <span class="muted">
                {{ entry.sets.map((set) => `${set.reps}x${set.weight}kg`).join('  ·  ') || 'sem séries' }}
              </span>
            </li>
          </ul>

          <p v-if="log.notes" class="muted" :class="$style.notes">{{ log.notes }}</p>
        </article>
      </div>
    </div>

    <Modal
      :show="showForm"
      title="Registrar treino"
      submit-label="Registrar"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="workout">Treino</label>
          <select id="workout" v-model="form.workout" @change="prefill">
            <option :value="null">Avulso</option>
            <option v-for="workout in workouts" :key="workout._id" :value="workout._id">
              {{ workout.name }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="date">Data</label>
          <input id="date" v-model="form.date" type="date" required />
        </div>
        <div class="field">
          <label for="duration">Duração (min)</label>
          <input id="duration" v-model.number="form.durationMinutes" type="number" min="0" />
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>Exercícios</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addEntry">
            <span class="material-symbols-outlined">add</span> Exercício
          </button>
        </div>

        <p v-if="!form.entries.length" class="muted" :class="$style.notes">
          Escolha um treino acima para trazer os exercícios prontos, ou adicione um a um.
        </p>

        <div v-for="(entry, entryIndex) in form.entries" :key="entryIndex" :class="$style.entryForm">
          <div class="row">
            <select v-model="entry.exercise" required :class="$style.grow">
              <option value="" disabled>Exercício</option>
              <option v-for="exercise in exercises" :key="exercise._id" :value="exercise._id">
                {{ exercise.name }}
              </option>
            </select>
            <button type="button" class="btn-icon" @click="form.entries.splice(entryIndex, 1)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <div v-for="(set, setIndex) in entry.sets" :key="setIndex" :class="$style.set">
            <span class="muted">{{ setIndex + 1 }}ª</span>
            <input v-model.number="set.reps" type="number" min="0" placeholder="reps" required />
            <input v-model.number="set.weight" type="number" step="0.5" min="0" placeholder="kg" />
            <button type="button" class="btn-icon" @click="entry.sets.splice(setIndex, 1)">
              <span class="material-symbols-outlined">remove</span>
            </button>
          </div>

          <button type="button" class="btn" :class="$style.addSet" @click="addSet(entry)">
            <span class="material-symbols-outlined">add</span> Série
          </button>
        </div>
      </div>

      <div class="field" :class="$style.items">
        <label for="notes">Observações</label>
        <textarea id="notes" v-model="form.notes"></textarea>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, date, toDateInput } from '@yper/i18n';

const empty = () => ({
  workout: null,
  date: toDateInput(),
  durationMinutes: 0,
  entries: [],
  notes: '',
});

export default {
  name: 'History',
  components: { AppShell, Modal },
  data() {
    return {
      logs: [],
      workouts: [],
      exercises: [],
      loading: true,
      saving: false,
      showForm: false,
      form: empty(),
    };
  },
  async mounted() {
    await Promise.all([this.load(), this.loadWorkouts(), this.loadExercises()]);
  },
  methods: {
    number,
    date,
    async load() {
      this.loading = true;
      try {
        const { logs } = await api.get('/logs');
        this.logs = logs;
      } catch (err) {
        alert(err.message);
      } finally {
        this.loading = false;
      }
    },
    async loadWorkouts() {
      try {
        const { workouts } = await api.get('/workouts');
        this.workouts = workouts;
      } catch {
        this.workouts = [];
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
    openForm() {
      this.form = empty();
      this.showForm = true;
    },
    /** Ao escolher um treino, ja traz seus exercicios com as series planejadas. */
    prefill() {
      const workout = this.workouts.find((w) => w._id === this.form.workout);
      if (!workout) return;

      this.form.entries = workout.items.map((item) => ({
        exercise: item.exercise?._id || item.exercise,
        sets: Array.from({ length: item.sets || 1 }, () => ({
          reps: Number.parseInt(item.reps, 10) || 0,
          weight: item.weight || 0,
        })),
      }));
    },
    addEntry() {
      this.form.entries.push({ exercise: '', sets: [{ reps: 10, weight: 0 }] });
    },
    addSet(entry) {
      const last = entry.sets[entry.sets.length - 1];
      entry.sets.push({ reps: last?.reps || 10, weight: last?.weight || 0 });
    },
    async save() {
      this.saving = true;
      try {
        await api.post('/logs', {
          ...this.form,
          entries: this.form.entries.filter((entry) => entry.exercise),
        });
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(err.message);
      } finally {
        this.saving = false;
      }
    },
    async remove(log) {
      if (!confirm('Remover este registro?')) return;
      try {
        await api.del(`/logs/${log._id}`);
        await this.load();
      } catch (err) {
        alert(err.message);
      }
    },
  },
};
</script>

<style module>
.entry {
  padding: 15px 18px;
  border-bottom: 1px solid var(--border);
}

.entry:last-child {
  border-bottom: none;
}

.list {
  margin: 10px 0 0;
  padding: 0;
  list-style: none;
}

.list li {
  display: flex;
  justify-content: space-between;
  gap: 12px;
  padding: 5px 0;
}

.notes {
  margin: 8px 0 0;
  font-size: 0.85rem;
}

.items {
  margin-top: 18px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.entryForm {
  margin-top: 12px;
  padding: 12px;
  background: var(--surface-2);
  border-radius: var(--radius-sm);
}

.grow {
  flex: 1;
}

.set {
  display: grid;
  grid-template-columns: 30px 1fr 1fr auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.addSet {
  margin-top: 10px;
  padding: 5px 10px;
  font-size: 0.82rem;
}
</style>
