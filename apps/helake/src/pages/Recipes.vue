<template>
  <AppShell :title="$t('recipes.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('recipes.newRecipe') }}
      </button>
    </template>

    <div class="card">
      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!recipes.length" class="empty">
        <span class="material-symbols-outlined">cake</span>
        <p>{{ $t('recipes.empty') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('recipes.table.recipe') }}</th>
              <th>{{ $t('recipes.table.category') }}</th>
              <th>{{ $t('recipes.table.yield') }}</th>
              <th class="num">{{ $t('recipes.table.ingredientCost') }}</th>
              <th class="num">{{ $t('recipes.table.totalCost') }}</th>
              <th class="num">{{ $t('recipes.table.sellingPrice') }}</th>
              <th>{{ $t('recipes.table.margin') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="recipe in recipes" :key="recipe._id">
              <td><strong>{{ recipe.name }}</strong></td>
              <td>
                <span class="badge" :class="recipe.category === 'Cakes' ? 'badge-accent' : ''">
                  {{ categoryLabel(recipe.category) }}
                </span>
              </td>
              <td class="muted">{{ `${recipe.yield} ${recipe.yieldUnit}` }}</td>
              <td class="num">{{ money(recipe.ingredientCost) }}</td>
              <td class="num">{{ money(recipe.totalCost) }}</td>
              <td class="num">{{ money(recipe.sellingPrice) }}</td>
              <td>
                <span class="badge" :class="marginBadge(recipe.margin)">{{ formatMargin(recipe.margin) }}</span>
              </td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(recipe)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(recipe)">
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
      :title="editingId ? $t('recipes.form.editTitle') : $t('recipes.newRecipe')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">{{ $t('recipes.form.name') }}</label>
          <input id="name" v-model="form.name" :placeholder="$t('recipes.form.namePlaceholder')" required />
        </div>
        <div class="field full">
          <label for="category">{{ $t('recipes.form.category') }}</label>
          <select id="category" v-model="form.category">
            <option v-for="cat in CATEGORIES" :key="cat.value" :value="cat.value">{{ $t(`recipes.categories.${cat.key}`) }}</option>
          </select>
        </div>
        <div class="field">
          <label for="yield">{{ $t('recipes.form.yield') }}</label>
          <input id="yield" v-model.number="form.yield" type="number" min="1" />
        </div>
        <div class="field">
          <label for="yieldUnit">{{ $t('recipes.form.yieldUnit') }}</label>
          <select id="yieldUnit" v-model="form.yieldUnit">
            <option v-for="unit in YIELD_UNITS" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </div>
        <div class="field">
          <label for="sellingPrice">{{ $t('recipes.form.sellingPrice') }}</label>
          <input id="sellingPrice" v-model.number="form.sellingPrice" type="number" min="0" step="0.01" />
        </div>
        <div class="field">
          <label for="laborCost">{{ $t('recipes.form.laborCost') }}</label>
          <input id="laborCost" v-model.number="form.laborCost" type="number" min="0" step="0.01" />
        </div>
        <div class="field full">
          <label for="infraCostPercentage">{{ $t('recipes.form.infraCostPercentage') }}</label>
          <input
            id="infraCostPercentage"
            v-model.number="form.infraCostPercentage"
            type="number"
            min="0"
            max="100"
            :placeholder="$t('recipes.form.infraPlaceholder')"
          />
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>{{ $t('recipes.form.ingredients') }}</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addIngredient">
            <span class="material-symbols-outlined">add</span> {{ $t('recipes.form.addIngredient') }}
          </button>
        </div>

        <p v-if="!form.ingredients.length" class="muted" :class="$style.note">{{ $t('recipes.form.noIngredients') }}</p>

        <div v-for="(item, index) in form.ingredients" :key="index" data-test="ingredient-row" :class="$style.item">
          <select v-model="item.ingredient">
            <option value="">{{ $t('recipes.form.ingredientPlaceholder') }}</option>
            <option v-for="ingredient in ingredients" :key="ingredient._id" :value="ingredient._id">
              {{ `${ingredient.name} (${ingredient.unit})` }}
            </option>
          </select>
          <input
            v-model.number="item.quantity"
            type="number"
            min="0"
            step="0.001"
            :placeholder="$t('recipes.form.quantityPlaceholder')"
          />
          <button type="button" class="btn-icon" :title="$t('common.remove')" @click="form.ingredients.splice(index, 1)">
            <span class="material-symbols-outlined">delete</span>
          </button>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, number, errorMessage } from '@yper/i18n';

const CATEGORIES = [
  { value: 'Cakes', key: 'cakes' },
  { value: 'Sweets', key: 'sweets' },
  { value: 'Breads', key: 'breads' },
  { value: 'Pastries', key: 'pastries' },
  { value: 'Other', key: 'other' },
];
const YIELD_UNITS = ['un', 'fatias', 'dz', 'kg', 'L'];
const empty = () => ({
  name: '', category: 'Other', yield: 1, yieldUnit: 'un',
  laborCost: 0, infraCostPercentage: null, sellingPrice: 0, ingredients: [],
});

export default {
  name: 'Recipes',
  components: { AppShell, Modal },
  data() {
    return {
      CATEGORIES,
      YIELD_UNITS,
      recipes: [],
      ingredients: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: empty(),
    };
  },
  async mounted() {
    await Promise.all([this.load(), this.loadIngredients()]);
  },
  methods: {
    categoryLabel(value) {
      const category = CATEGORIES.find((c) => c.value === value);
      return category ? this.$t(`recipes.categories.${category.key}`) : value;
    },
    money(value) {
      return value == null ? '—' : currency(value);
    },
    formatMargin(value) {
      return value == null ? '—' : `${number(value, 1)}%`;
    },
    marginBadge(value) {
      if (value == null) return 'badge-warn';
      if (value >= 40) return 'badge-ok';
      if (value >= 20) return 'badge-warn';
      return 'badge-danger';
    },
    async load() {
      this.loading = true;
      try {
        const { recipes } = await api.get('/recipes');
        this.recipes = recipes;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    async loadIngredients() {
      try {
        const { ingredients } = await api.get('/ingredients');
        this.ingredients = ingredients;
      } catch {
        this.ingredients = [];
      }
    },
    openForm(recipe = null) {
      this.editingId = recipe?._id || null;
      const defaults = empty();
      this.form = recipe
        ? {
            ...Object.fromEntries(
              Object.keys(defaults)
                .filter((key) => key !== 'ingredients')
                .map((key) => [key, recipe[key] ?? defaults[key]])
            ),
            ingredients: (recipe.ingredients || []).map((item) => ({
              ingredient: item.ingredient?._id || item.ingredient,
              quantity: item.quantity,
            })),
          }
        : defaults;
      this.showForm = true;
    },
    addIngredient() {
      this.form.ingredients.push({ ingredient: '', quantity: 0 });
    },
    async save() {
      this.saving = true;
      try {
        const body = { ...this.form, ingredients: this.form.ingredients.filter((item) => item.ingredient) };
        if (this.editingId) {
          await api.put(`/recipes/${this.editingId}`, body);
        } else {
          await api.post('/recipes', body);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(recipe) {
      if (!confirm(this.$t('common.confirmRemove', { name: recipe.name }))) return;
      try {
        await api.del(`/recipes/${recipe._id}`);
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

.items {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.item {
  display: grid;
  grid-template-columns: 1fr 110px auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.note {
  margin: 10px 0 0;
  font-size: 0.82rem;
}

@media (max-width: 520px) {
  .item {
    grid-template-columns: 1fr auto;
  }

  .item > select {
    grid-column: 1 / -1;
  }
}
</style>
