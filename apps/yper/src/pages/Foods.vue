<template>
  <AppShell :title="$t('foods.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('foods.newFood') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="search">
          <span class="material-symbols-outlined">search</span>
          <input v-model="search" type="search" :placeholder="$t('foods.search.placeholder')" />
        </div>
        <span class="muted">{{ $t('foods.count', { shown: filtered.length, total: foods.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">nutrition</span>
        <p>{{ foods.length ? $t('foods.empty.filtered') : $t('foods.empty.first') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('foods.table.food') }}</th>
              <th class="num">{{ $t('foods.table.serving') }}</th>
              <th class="num">{{ $t('foods.table.kcal') }}</th>
              <th class="num">{{ $t('foods.table.protein') }}</th>
              <th class="num">{{ $t('foods.table.carbs') }}</th>
              <th class="num">{{ $t('foods.table.fat') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="food in filtered" :key="food._id">
              <td>
                <strong>{{ food.name }}</strong>
                <div v-if="food.brand" class="muted">{{ food.brand }}</div>
              </td>
              <td class="num muted">{{ $t('foods.servingValue', { size: number(food.servingSize), unit: food.servingUnit }) }}</td>
              <td class="num">{{ number(food.calories) }}</td>
              <td class="num">{{ $t('foods.gramsValue', { value: number(food.protein, 1) }) }}</td>
              <td class="num">{{ $t('foods.gramsValue', { value: number(food.carbs, 1) }) }}</td>
              <td class="num">{{ $t('foods.gramsValue', { value: number(food.fat, 1) }) }}</td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(food)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(food)">
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
      :title="editingId ? $t('foods.form.editTitle') : $t('foods.newFood')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">{{ $t('foods.form.name') }}</label>
          <input id="name" v-model="form.name" required />
        </div>
        <div class="field">
          <label for="brand">{{ $t('foods.form.brand') }}</label>
          <input id="brand" v-model="form.brand" :placeholder="$t('foods.form.optionalPlaceholder')" />
        </div>
        <div class="field">
          <label for="servingSize">{{ $t('foods.form.servingSize') }}</label>
          <input id="servingSize" v-model.number="form.servingSize" type="number" step="0.1" min="0.1" required />
        </div>
        <div class="field">
          <label for="servingUnit">{{ $t('foods.form.servingUnit') }}</label>
          <select id="servingUnit" v-model="form.servingUnit">
            <option value="g">{{ $t('foods.servingUnits.g') }}</option>
            <option value="ml">{{ $t('foods.servingUnits.ml') }}</option>
            <option value="un">{{ $t('foods.servingUnits.un') }}</option>
          </select>
        </div>
      </div>

      <p class="muted" :class="$style.note">
        {{ $t('foods.form.noteBefore') }} <strong>{{ $t('foods.form.noteEmphasis') }}</strong>{{ '.' }} {{ $t('foods.form.noteAfter') }}
      </p>

      <div class="form-grid" :class="$style.macros">
        <div class="field">
          <label for="calories">{{ $t('foods.form.calories') }}</label>
          <input id="calories" v-model.number="form.calories" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="protein">{{ $t('foods.form.protein') }}</label>
          <input id="protein" v-model.number="form.protein" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="carbs">{{ $t('foods.form.carbs') }}</label>
          <input id="carbs" v-model.number="form.carbs" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="fat">{{ $t('foods.form.fat') }}</label>
          <input id="fat" v-model.number="form.fat" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="fiber">{{ $t('foods.form.fiber') }}</label>
          <input id="fiber" v-model.number="form.fiber" type="number" step="0.1" min="0" />
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, errorMessage } from '@yper/i18n';

const EMPTY = {
  name: '', brand: '', servingSize: 100, servingUnit: 'g',
  calories: 0, protein: 0, carbs: 0, fat: 0, fiber: 0,
};

export default {
  name: 'Foods',
  components: { AppShell, Modal },
  data() {
    return {
      foods: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: { ...EMPTY },
      search: '',
    };
  },
  computed: {
    filtered() {
      const term = this.search.trim().toLowerCase();
      if (!term) return this.foods;
      return this.foods.filter((food) =>
        [food.name, food.brand].some((value) => (value || '').toLowerCase().includes(term))
      );
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    number,
    async load() {
      this.loading = true;
      try {
        const { foods } = await api.get('/foods');
        this.foods = foods;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    openForm(food = null) {
      this.editingId = food?._id || null;
      this.form = food
        ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, food[key] ?? EMPTY[key]]))
        : { ...EMPTY };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/foods/${this.editingId}`, this.form);
        } else {
          await api.post('/foods', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(food) {
      if (!confirm(this.$t('common.confirmRemove', { name: food.name }))) return;
      try {
        await api.del(`/foods/${food._id}`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      }
    },
  },
};
</script>

<style module>
.actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}

.note {
  margin: 16px 0 0;
  font-size: 0.82rem;
}

.macros {
  margin-top: 10px;
}
</style>
