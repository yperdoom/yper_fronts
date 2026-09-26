<template>
  <AppShell :title="$t('exercises.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('exercises.newExercise') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <div class="search">
            <span class="material-symbols-outlined">search</span>
            <input v-model="search" type="search" :placeholder="$t('exercises.search.placeholder')" />
          </div>
          <select v-model="filterGroup" :class="$style.filter">
            <option value="">{{ $t('exercises.filters.allGroups') }}</option>
            <option v-for="group in MUSCLE_GROUPS" :key="group.value" :value="group.value">{{ $t(`exercises.muscleGroups.${group.key}`) }}</option>
          </select>
        </div>
        <span class="muted">{{ $t('exercises.count', { shown: filtered.length, total: exercises.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">exercise</span>
        <p>{{ exercises.length ? $t('exercises.empty.filtered') : $t('exercises.empty.first') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('exercises.table.exercise') }}</th>
              <th>{{ $t('exercises.table.group') }}</th>
              <th>{{ $t('exercises.table.equipment') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="exercise in filtered" :key="exercise._id">
              <td>
                <strong>{{ exercise.name }}</strong>
                <div v-if="exercise.notes" class="muted">{{ exercise.notes }}</div>
              </td>
              <td><span class="badge badge-accent">{{ muscleGroupLabel(exercise.muscleGroup) }}</span></td>
              <td class="muted">{{ exercise.equipment || '—' }}</td>
              <td>
                <div class="row" :class="$style.actions">
                  <a
                    v-if="exercise.videoUrl"
                    :href="exercise.videoUrl"
                    target="_blank"
                    rel="noopener"
                    class="btn-icon"
                    :title="$t('exercises.actions.watchVideo')"
                  >
                    <span class="material-symbols-outlined">play_circle</span>
                  </a>
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(exercise)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(exercise)">
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
      :title="editingId ? $t('exercises.form.editTitle') : $t('exercises.newExercise')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">{{ $t('exercises.form.name') }}</label>
          <input id="name" v-model="form.name" required />
        </div>
        <div class="field">
          <label for="muscleGroup">{{ $t('exercises.form.muscleGroup') }}</label>
          <select id="muscleGroup" v-model="form.muscleGroup">
            <option v-for="group in MUSCLE_GROUPS" :key="group.value" :value="group.value">{{ $t(`exercises.muscleGroups.${group.key}`) }}</option>
          </select>
        </div>
        <div class="field">
          <label for="equipment">{{ $t('exercises.form.equipment') }}</label>
          <input id="equipment" v-model="form.equipment" :placeholder="$t('exercises.form.equipmentPlaceholder')" />
        </div>
        <div class="field full">
          <label for="videoUrl">{{ $t('exercises.form.videoUrl') }}</label>
          <input id="videoUrl" v-model="form.videoUrl" type="url" :placeholder="$t('exercises.form.optionalPlaceholder')" />
        </div>
        <div class="field full">
          <label for="notes">{{ $t('exercises.form.notes') }}</label>
          <textarea id="notes" v-model="form.notes"></textarea>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { errorMessage } from '@yper/i18n';

const MUSCLE_GROUPS = [
  { value: 'Peito', key: 'chest' },
  { value: 'Costas', key: 'back' },
  { value: 'Pernas', key: 'legs' },
  { value: 'Gluteos', key: 'glutes' },
  { value: 'Ombros', key: 'shoulders' },
  { value: 'Biceps', key: 'biceps' },
  { value: 'Triceps', key: 'triceps' },
  { value: 'Abdomen', key: 'abs' },
  { value: 'Panturrilha', key: 'calves' },
  { value: 'Cardio', key: 'cardio' },
  { value: 'Corpo inteiro', key: 'fullBody' },
  { value: 'Outro', key: 'other' },
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
    muscleGroupLabel(value) {
      const group = MUSCLE_GROUPS.find((g) => g.value === value);
      return group ? this.$t(`exercises.muscleGroups.${group.key}`) : value;
    },
    async load() {
      this.loading = true;
      try {
        const { exercises } = await api.get('/exercises');
        this.exercises = exercises;
      } catch (err) {
        alert(errorMessage(this.$t, err));
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
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(exercise) {
      if (!confirm(this.$t('common.confirmRemove', { name: exercise.name }))) return;
      try {
        await api.del(`/exercises/${exercise._id}`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
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
