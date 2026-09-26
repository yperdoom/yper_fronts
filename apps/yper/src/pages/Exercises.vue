<template>
  <AppShell title="Exercícios">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Novo exercício
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <div class="search">
            <span class="material-symbols-outlined">search</span>
            <input v-model="search" type="search" placeholder="Nome ou equipamento" />
          </div>
          <select v-model="filterGroup" :class="$style.filter">
            <option value="">Todos os grupos</option>
            <option v-for="group in MUSCLE_GROUPS" :key="group" :value="group">{{ group }}</option>
          </select>
        </div>
        <span class="muted">{{ filtered.length }} de {{ exercises.length }}</span>
      </div>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">exercise</span>
        <p>{{ exercises.length ? 'Nenhum exercício com esse filtro.' : 'Cadastre seu primeiro exercício.' }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Exercício</th>
              <th>Grupo</th>
              <th>Equipamento</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exercise in filtered" :key="exercise._id">
              <td>
                <strong>{{ exercise.name }}</strong>
                <div v-if="exercise.notes" class="muted">{{ exercise.notes }}</div>
              </td>
              <td><span class="badge badge-accent">{{ exercise.muscleGroup }}</span></td>
              <td class="muted">{{ exercise.equipment || '—' }}</td>
              <td>
                <div class="row" :class="$style.actions">
                  <a
                    v-if="exercise.videoUrl"
                    :href="exercise.videoUrl"
                    target="_blank"
                    rel="noopener"
                    class="btn-icon"
                    title="Ver vídeo"
                  >
                    <span class="material-symbols-outlined">play_circle</span>
                  </a>
                  <button class="btn-icon" title="Editar" @click="openForm(exercise)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" title="Remover" @click="remove(exercise)">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal
      :show="showForm"
      :title="editingId ? 'Editar exercício' : 'Novo exercício'"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">Nome</label>
          <input id="name" v-model="form.name" required />
        </div>
        <div class="field">
          <label for="muscleGroup">Grupo muscular</label>
          <select id="muscleGroup" v-model="form.muscleGroup">
            <option v-for="group in MUSCLE_GROUPS" :key="group" :value="group">{{ group }}</option>
          </select>
        </div>
        <div class="field">
          <label for="equipment">Equipamento</label>
          <input id="equipment" v-model="form.equipment" placeholder="Barra, halter, máquina..." />
        </div>
        <div class="field full">
          <label for="videoUrl">Link do vídeo</label>
          <input id="videoUrl" v-model="form.videoUrl" type="url" placeholder="opcional" />
        </div>
        <div class="field full">
          <label for="notes">Observações</label>
          <textarea id="notes" v-model="form.notes"></textarea>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';

const MUSCLE_GROUPS = [
  'Peito', 'Costas', 'Pernas', 'Gluteos', 'Ombros',
  'Biceps', 'Triceps', 'Abdomen', 'Panturrilha',
  'Cardio', 'Corpo inteiro', 'Outro',
];

const EMPTY = { name: '', muscleGroup: 'Outro', equipment: '', videoUrl: '', notes: '' };

export default {
  name: 'Exercises',
  components: { AppShell, Modal },
  data() {
    return {
      MUSCLE_GROUPS,
      exercises: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: { ...EMPTY },
      search: '',
      filterGroup: '',
    };
  },
  computed: {
    filtered() {
      const term = this.search.trim().toLowerCase();
      return this.exercises.filter((exercise) => {
        if (this.filterGroup && exercise.muscleGroup !== this.filterGroup) return false;
        if (!term) return true;
        return [exercise.name, exercise.equipment]
          .some((value) => (value || '').toLowerCase().includes(term));
      });
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const { exercises } = await api.get('/exercises');
        this.exercises = exercises;
      } catch (err) {
        alert(err.message);
      } finally {
        this.loading = false;
      }
    },
    openForm(exercise = null) {
      this.editingId = exercise?._id || null;
      this.form = exercise ? { ...EMPTY, ...exercise } : { ...EMPTY };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/exercises/${this.editingId}`, this.form);
        } else {
          await api.post('/exercises', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(err.message);
      } finally {
        this.saving = false;
      }
    },
    async remove(exercise) {
      if (!confirm(`Remover "${exercise.name}"?`)) return;
      try {
        await api.del(`/exercises/${exercise._id}`);
        await this.load();
      } catch (err) {
        alert(err.message);
      }
    },
  },
};
</script>

<style module>
.filter {
  width: auto;
  min-width: 160px;
}

.actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}
</style>
