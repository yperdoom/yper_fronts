<template>
  <AppShell title="Treinos">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Novo treino
      </button>
    </template>

    <div v-if="loading" class="loading">Carregando...</div>

    <div v-else-if="!workouts.length" class="card">
      <div class="empty">
        <span class="material-symbols-outlined">fitness_center</span>
        <p>Monte seu primeiro treino para começar a registrar as sessões.</p>
      </div>
    </div>

    <div v-else :class="$style.grid">
      <article v-for="workout in workouts" :key="workout._id" class="card">
        <div class="card-head">
          <div>
            <h2>{{ workout.name }}</h2>
            <p class="muted">{{ workout.focus || 'Sem foco definido' }}</p>
          </div>
          <div class="row" :class="$style.actions">
            <button class="btn-icon" title="Editar" @click="openForm(workout)">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" title="Remover" @click="remove(workout)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>

        <div class="card-body">
          <div class="row" :class="$style.days">
            <span
              v-for="(day, index) in WEEKDAYS"
              :key="index"
              class="badge"
              :class="workout.weekdays.includes(index) ? 'badge-accent' : ''"
            >
              {{ day }}
            </span>
          </div>

          <ul :class="$style.list">
            <li v-for="(item, index) in workout.items" :key="index">
              <span>{{ item.exercise?.name || '—' }}</span>
              <span class="muted">
                {{ item.sets }}x{{ item.reps }}
                <template v-if="item.weight"> · {{ number(item.weight, 1) }}kg</template>
              </span>
            </li>
            <li v-if="!workout.items.length" class="muted">Nenhum exercício adicionado.</li>
          </ul>
        </div>
      </article>
    </div>

    <Modal
      :show="showForm"
      :title="editingId ? 'Editar treino' : 'Novo treino'"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="name">Nome</label>
          <input id="name" v-model="form.name" required placeholder="Treino A" />
        </div>
        <div class="field">
          <label for="focus">Foco</label>
          <input id="focus" v-model="form.focus" placeholder="Peito e tríceps" />
        </div>
        <div class="field full">
          <label>Dias da semana</label>
          <div class="row">
            <button
              v-for="(day, index) in WEEKDAYS"
              :key="index"
              type="button"
              class="badge"
              :class="form.weekdays.includes(index) ? 'badge-accent' : ''"
              :style="{ cursor: 'pointer', border: 'none', font: 'inherit', fontWeight: 600 }"
              @click="toggleDay(index)"
            >
              {{ day }}
            </button>
          </div>
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>Exercícios</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addItem">
            <span class="material-symbols-outlined">add</span> Exercício
          </button>
        </div>

        <p v-if="!exercises.length" class="muted" :class="$style.note">
          Cadastre exercícios em <router-link to="/exercicios">Exercícios</router-link> para montar o treino.
        </p>

        <div v-for="(item, index) in form.items" :key="index" :class="$style.item">
          <select v-model="item.exercise" required>
            <option value="" disabled>Exercício</option>
            <option v-for="exercise in exercises" :key="exercise._id" :value="exercise._id">
              {{ exercise.name }}
            </option>
          </select>
          <input v-model.number="item.sets" type="number" min="1" placeholder="Séries" required />
          <input v-model="item.reps" placeholder="Reps" required />
          <input v-model.number="item.weight" type="number" step="0.5" min="0" placeholder="kg" />
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
import { number } from '@yper/i18n';

const WEEKDAYS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
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
      form: empty(),
    };
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
        alert(err.message);
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
      this.form = workout
        ? {
            name: workout.name,
            focus: workout.focus,
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
        const body = { ...this.form, items: this.form.items.filter((item) => item.exercise) };
        if (this.editingId) {
          await api.put(`/workouts/${this.editingId}`, body);
        } else {
          await api.post('/workouts', body);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(err.message);
      } finally {
        this.saving = false;
      }
    },
    async remove(workout) {
      if (!confirm(`Remover "${workout.name}"?`)) return;
      try {
        await api.del(`/workouts/${workout._id}`);
        await this.load();
      } catch (err) {
        alert(err.message);
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
