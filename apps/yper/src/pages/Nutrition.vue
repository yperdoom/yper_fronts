<template>
  <AppShell :title="$t('nutrition.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('nutrition.newMealButton') }}
      </button>
    </template>

    <div class="stack">
      <section class="card">
        <div class="card-head">
          <div class="row">
            <button class="btn-icon" :title="$t('nutrition.prevDay')" @click="shiftDay(-1)">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <input v-model="day" type="date" :class="$style.day" @change="load" />
            <button class="btn-icon" :title="$t('nutrition.nextDay')" @click="shiftDay(1)">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <span class="muted">{{ $t('nutrition.mealsCount', { count: meals.length }) }}</span>
        </div>

        <div class="card-body">
          <div :class="$style.macros">
            <div v-for="macro in macros" :key="macro.key" :class="$style.macro">
              <div :class="$style.macroTop">
                <strong>{{ $t(`nutrition.macros.types.${macro.key}`) }}</strong>
                <span class="muted">{{ $t('nutrition.macros.consumedTarget', { value: number(macro.value), target: number(macro.target), unit: macro.unit }) }}</span>
              </div>
              <div class="bar">
                <span :style="{ width: `${macro.percent}%`, background: macro.color }"></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!meals.length" class="card">
        <div class="empty">
          <span class="material-symbols-outlined">restaurant</span>
          <p>{{ $t('nutrition.empty') }}</p>
        </div>
      </div>

      <section v-for="meal in meals" :key="meal._id" class="card">
        <div class="card-head">
          <div class="row">
            <h2>{{ $t(`nutrition.mealTypes.${meal.type}`) }}</h2>
            <span class="badge badge-accent">{{ $t('nutrition.caloriesValue', { value: number(meal.totals.calories) }) }}</span>
          </div>
          <div class="row" :class="$style.actions">
            <button class="btn-icon" :title="$t('common.edit')" @click="openForm(meal)">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" :title="$t('common.remove')" @click="remove(meal)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>{{ $t('nutrition.table.food') }}</th>
                <th class="num">{{ $t('nutrition.table.quantity') }}</th>
                <th class="num">{{ $t('nutrition.table.kcal') }}</th>
                <th class="num">{{ $t('nutrition.table.protein') }}</th>
                <th class="num">{{ $t('nutrition.table.carbs') }}</th>
                <th class="num">{{ $t('nutrition.table.fat') }}</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in meal.items" :key="index">
                <td>{{ item.food?.name || '—' }}</td>
                <td class="num">{{ $t('nutrition.itemQuantity', { quantity: number(item.quantity, 1), unit: item.food?.servingUnit }) }}</td>
                <td class="num">{{ number(macroOf(item, 'calories')) }}</td>
                <td class="num">{{ number(macroOf(item, 'protein'), 1) }}</td>
                <td class="num">{{ number(macroOf(item, 'carbs'), 1) }}</td>
                <td class="num">{{ number(macroOf(item, 'fat'), 1) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>{{ $t('nutrition.total') }}</strong></td>
                <td class="num"><strong>{{ number(meal.totals.calories) }}</strong></td>
                <td class="num"><strong>{{ number(meal.totals.protein, 1) }}</strong></td>
                <td class="num"><strong>{{ number(meal.totals.carbs, 1) }}</strong></td>
                <td class="num"><strong>{{ number(meal.totals.fat, 1) }}</strong></td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>

    <Modal
      :show="showForm"
      :title="editingId ? $t('nutrition.form.editTitle') : $t('nutrition.newMealTitle')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="type">{{ $t('nutrition.form.type') }}</label>
          <select id="type" v-model="form.type">
            <option v-for="type in MEAL_TYPES" :key="type" :value="type">{{ $t(`nutrition.mealTypes.${type}`) }}</option>
          </select>
        </div>
        <div class="field">
          <label for="mealDate">{{ $t('nutrition.form.date') }}</label>
          <input id="mealDate" v-model="form.date" type="date" required />
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>{{ $t('nutrition.items.title') }}</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addItem">
            <span class="material-symbols-outlined">add</span> {{ $t('nutrition.items.addButton') }}
          </button>
        </div>

        <p v-if="!foods.length" class="muted" :class="$style.note">
          {{ $t('nutrition.items.emptyBefore') }} <router-link to="/foods">{{ $t('nav.foods') }}</router-link> {{ $t('nutrition.items.emptyAfter') }}
        </p>

        <div v-for="(item, index) in form.items" :key="index" :class="$style.item">
          <select v-model="item.food" required>
            <option value="" disabled>{{ $t('nutrition.items.selectPlaceholder') }}</option>
            <option v-for="food in foods" :key="food._id" :value="food._id">
              {{ $t('nutrition.items.foodOption', { name: food.name, calories: number(food.calories), size: number(food.servingSize), unit: food.servingUnit }) }}
            </option>
          </select>
          <input v-model.number="item.quantity" type="number" step="0.1" min="0" :placeholder="$t('nutrition.items.quantityPlaceholder')" required />
          <span class="muted" :class="$style.unit">{{ unitOf(item.food) }}</span>
          <button type="button" class="btn-icon" @click="form.items.splice(index, 1)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div v-if="formCalories" class="row" :class="$style.total">
          <div class="spacer"></div>
          <span class="muted">{{ $t('nutrition.total') }}</span>
          <strong>{{ $t('nutrition.caloriesValue', { value: number(formCalories) }) }}</strong>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, toDateInput, errorMessage } from '@yper/i18n';

const MEAL_TYPES = ['breakfast', 'morning_snack', 'lunch', 'afternoon_snack', 'dinner', 'supper'];

const empty = (day) => ({ type: 'lunch', date: day, items: [] });

export default {
  name: 'Nutrition',
  components: { AppShell, Modal },
  data() {
    return {
      MEAL_TYPES,
      day: toDateInput(),
      meals: [],
      totals: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      targets: { calories: 0, protein: 0, carbs: 0, fat: 0 },
      foods: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: empty(toDateInput()),
    };
  },
  computed: {
    macros() {
      const spec = [
        { key: 'calories', label: 'Calorias', unit: ' kcal', color: 'var(--accent)' },
        { key: 'protein', label: 'Proteína', unit: 'g', color: '#2563eb' },
        { key: 'carbs', label: 'Carboidrato', unit: 'g', color: '#d97706' },
        { key: 'fat', label: 'Gordura', unit: 'g', color: '#db2777' },
      ];
      return spec.map((macro) => {
        const value = this.totals[macro.key] || 0;
        const target = this.targets[macro.key] || 0;
        return {
          ...macro,
          value,
          target,
          percent: target ? Math.min(100, (value / target) * 100) : 0,
        };
      });
    },
    formCalories() {
      return this.form.items.reduce((sum, item) => {
        const food = this.foods.find((f) => f._id === item.food);
        if (!food?.servingSize) return sum;
        return sum + food.calories * ((item.quantity || 0) / food.servingSize);
      }, 0);
    },
  },
  async mounted() {
    await Promise.all([this.load(), this.loadFoods(), this.loadTargets()]);
  },
  methods: {
    number,
    async load() {
      this.loading = true;
      try {
        const { meals, totals } = await api.get(`/meals?date=${this.day}`);
        this.meals = meals;
        this.totals = totals;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    async loadFoods() {
      try {
        const { foods } = await api.get('/foods');
        this.foods = foods;
      } catch {
        this.foods = [];
      }
    },
    async loadTargets() {
      try {
        const { profile } = await api.get('/profile');
        this.targets = {
          calories: profile.dailyCalories,
          protein: profile.proteinTarget,
          carbs: profile.carbsTarget,
          fat: profile.fatTarget,
        };
      } catch {
        // Sem metas carregadas as barras ficam zeradas, o resto da tela funciona.
      }
    },
    shiftDay(days) {
      const current = new Date(`${this.day}T12:00:00`);
      current.setDate(current.getDate() + days);
      this.day = toDateInput(current);
      this.load();
    },
    unitOf(foodId) {
      return this.foods.find((food) => food._id === foodId)?.servingUnit || '';
    },
    /** Macro de um item ja populado, aplicando o fator da porcao. */
    macroOf(item, macro) {
      const food = item.food;
      if (!food?.servingSize) return 0;
      return (food[macro] || 0) * (item.quantity / food.servingSize);
    },
    openForm(meal = null) {
      this.editingId = meal?._id || null;
      this.form = meal
        ? {
            type: meal.type,
            date: toDateInput(meal.date),
            items: meal.items.map((item) => ({
              food: item.food?._id || item.food,
              quantity: item.quantity,
            })),
          }
        : empty(this.day);
      this.showForm = true;
    },
    addItem() {
      this.form.items.push({ food: '', quantity: 100 });
    },
    async save() {
      this.saving = true;
      try {
        const body = { ...this.form, items: this.form.items.filter((item) => item.food) };
        if (this.editingId) {
          await api.put(`/meals/${this.editingId}`, body);
        } else {
          await api.post('/meals', body);
        }
        this.showForm = false;
        // A refeicao pode ter sido salva em outro dia: vai junto para ele.
        this.day = this.form.date;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(meal) {
      const mealLabel = this.$t(`nutrition.mealTypes.${meal.type}`).toLowerCase();
      if (!confirm(this.$t('nutrition.confirmRemove', { meal: mealLabel }))) return;
      try {
        await api.del(`/meals/${meal._id}`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      }
    },
  },
};
</script>

<style module>
.day {
  width: auto;
}

.macros {
  display: grid;
  gap: 18px;
  grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));
}

.macro {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.macroTop {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
}

.actions {
  flex-wrap: nowrap;
}

.items {
  margin-top: 20px;
  padding-top: 16px;
  border-top: 1px solid var(--border);
}

.item {
  display: grid;
  grid-template-columns: 1fr 88px 26px auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
}

.unit {
  font-size: 0.8rem;
}

.total {
  margin-top: 12px;
  gap: 10px;
}

.note {
  margin: 10px 0 0;
  font-size: 0.82rem;
}

@media (max-width: 520px) {
  .item {
    grid-template-columns: 1fr 26px auto;
  }

  .item > select {
    grid-column: 1 / -1;
  }
}
</style>
