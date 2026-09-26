<template>
  <AppShell :title="$t('ingredients.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('ingredients.newIngredient') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="search">
          <span class="material-symbols-outlined">search</span>
          <input v-model="search" type="search" :placeholder="$t('ingredients.search.placeholder')" />
        </div>
        <div class="row">
          <button
            type="button"
            class="btn"
            :class="activeFilter === 'All' ? 'btn-primary' : ''"
            @click="activeFilter = 'All'"
          >{{ $t('ingredients.filters.all') }}</button>
          <button
            v-for="cat in CATEGORIES"
            :key="cat"
            type="button"
            class="btn"
            :class="activeFilter === cat ? 'btn-primary' : ''"
            @click="activeFilter = cat"
          >{{ cat }}</button>
        </div>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">inventory_2</span>
        <p>{{ $t('ingredients.empty') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('ingredients.table.ingredient') }}</th>
              <th>{{ $t('ingredients.table.category') }}</th>
              <th class="num">{{ $t('ingredients.table.inStock') }}</th>
              <th class="num">{{ $t('ingredients.table.projected') }}</th>
              <th class="num">{{ $t('ingredients.table.minStock') }}</th>
              <th>{{ $t('ingredients.table.unit') }}</th>
              <th class="num">{{ $t('ingredients.table.cost') }}</th>
              <th>{{ $t('ingredients.table.status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="ingredient in filtered" :key="ingredient._id">
              <td><strong>{{ ingredient.name }}</strong></td>
              <td class="muted">{{ ingredient.category }}</td>
              <td class="num">{{ ingredient.currentStock }}</td>
              <td class="num">{{ ingredient.projectedStock?.toFixed(2) }}</td>
              <td class="num">{{ ingredient.minimumStock }}</td>
              <td class="muted">{{ ingredient.unit }}</td>
              <td class="num">{{ currency(ingredient.costPerUnit) }}</td>
              <td>
                <span class="badge" :class="statusBadge(ingredient)">
                  {{ $t(`ingredients.status.${stockStatus(ingredient)}`) }}
                </span>
              </td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(ingredient)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(ingredient)">
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
      :title="editingId ? $t('ingredients.form.editTitle') : $t('ingredients.newIngredient')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">{{ $t('ingredients.form.name') }}</label>
          <input id="name" v-model="form.name" :placeholder="$t('ingredients.form.namePlaceholder')" required />
        </div>
        <div class="field">
          <label for="category">{{ $t('ingredients.form.category') }}</label>
          <select id="category" v-model="form.category">
            <option v-for="cat in CATEGORIES" :key="cat" :value="cat">{{ cat }}</option>
          </select>
        </div>
        <div class="field">
          <label for="unit">{{ $t('ingredients.form.unit') }}</label>
          <select id="unit" v-model="form.unit">
            <option v-for="unit in UNITS" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </div>
        <div class="field full">
          <label for="cost">{{ $t('ingredients.form.cost') }}</label>
          <input id="cost" v-model.number="form.costPerUnit" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label for="currentStock">{{ $t('ingredients.form.currentStock') }}</label>
          <input id="currentStock" v-model.number="form.currentStock" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label for="minimumStock">{{ $t('ingredients.form.minimumStock') }}</label>
          <input id="minimumStock" v-model.number="form.minimumStock" type="number" min="0" step="0.01" />
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, errorMessage } from '@yper/i18n';

const CATEGORIES = ['Dry Goods', 'Dairy', 'Chocolate', 'Spices', 'Packaging', 'Other'];
const UNITS = ['kg', 'g', 'un', 'L', 'ml', 'dz'];
const EMPTY = { name: '', category: 'Other', unit: 'kg', costPerUnit: 0, currentStock: 0, minimumStock: 0 };

export default {
  name: 'Ingredients',
  components: { AppShell, Modal },
  data() {
    return {
      CATEGORIES,
      UNITS,
      ingredients: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: { ...EMPTY },
      activeFilter: 'All',
      search: '',
    };
  },
  computed: {
    filtered() {
      const term = this.search.trim().toLowerCase();
      return this.ingredients.filter((ingredient) => {
        const matchCategory = this.activeFilter === 'All' || ingredient.category === this.activeFilter;
        const matchSearch = !term || ingredient.name.toLowerCase().includes(term);
        return matchCategory && matchSearch;
      });
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    currency,
    stockStatus(ingredient) {
      if (ingredient.projectedStock < 0) return 'critical';
      if (ingredient.projectedStock < ingredient.minimumStock) return 'low';
      return 'ok';
    },
    statusBadge(ingredient) {
      const status = this.stockStatus(ingredient);
      if (status === 'critical') return 'badge-danger';
      if (status === 'low') return 'badge-warn';
      return 'badge-ok';
    },
    async load() {
      this.loading = true;
      try {
        const { ingredients } = await api.get('/ingredients');
        this.ingredients = ingredients;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    openForm(ingredient = null) {
      this.editingId = ingredient?._id || null;
      this.form = ingredient
        ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, ingredient[key] ?? EMPTY[key]]))
        : { ...EMPTY };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/ingredients/${this.editingId}`, this.form);
        } else {
          await api.post('/ingredients', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(ingredient) {
      if (!confirm(this.$t('common.confirmRemove', { name: ingredient.name }))) return;
      try {
        await api.del(`/ingredients/${ingredient._id}`);
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
</style>
