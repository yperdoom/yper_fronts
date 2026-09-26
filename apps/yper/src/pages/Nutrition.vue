<template>
  <AppShell title="Nutrição">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Refeição
      </button>
    </template>

    <div class="stack">
      <section class="card">
        <div class="card-head">
          <div class="row">
            <button class="btn-icon" title="Dia anterior" @click="shiftDay(-1)">
              <span class="material-symbols-outlined">chevron_left</span>
            </button>
            <input v-model="day" type="date" :class="$style.day" @change="load" />
            <button class="btn-icon" title="Próximo dia" @click="shiftDay(1)">
              <span class="material-symbols-outlined">chevron_right</span>
            </button>
          </div>
          <span class="muted">{{ meals.length }} refeição(ões)</span>
        </div>

        <div class="card-body">
          <div :class="$style.macros">
            <div v-for="macro in macros" :key="macro.key" :class="$style.macro">
              <div :class="$style.macroTop">
                <strong>{{ macro.label }}</strong>
                <span class="muted">{{ number(macro.value) }} / {{ number(macro.target) }}{{ macro.unit }}</span>
              </div>
              <div class="bar">
                <span :style="{ width: `${macro.percent}%`, background: macro.color }"></span>
              </div>
            </div>
          </div>
        </div>
      </section>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="!meals.length" class="card">
        <div class="empty">
          <span class="material-symbols-outlined">restaurant</span>
          <p>Nenhuma refeição registrada nesse dia.</p>
        </div>
      </div>

      <section v-for="meal in meals" :key="meal._id" class="card">
        <div class="card-head">
          <div class="row">
            <h2>{{ MEAL_LABEL[meal.type] }}</h2>
            <span class="badge badge-accent">{{ number(meal.totals.calories) }} kcal</span>
          </div>
          <div class="row" :class="$style.actions">
            <button class="btn-icon" title="Editar" @click="openForm(meal)">
              <span class="material-symbols-outlined">edit</span>
            </button>
            <button class="btn-icon" title="Remover" @click="remove(meal)">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </div>

        <div class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>Alimento</th>
                <th class="num">Quantidade</th>
                <th class="num">Kcal</th>
                <th class="num">P</th>
                <th class="num">C</th>
                <th class="num">G</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="(item, index) in meal.items" :key="index">
                <td>{{ item.food?.name || '—' }}</td>
                <td class="num">{{ number(item.quantity, 1) }} {{ item.food?.servingUnit }}</td>
                <td class="num">{{ number(macroOf(item, 'calories')) }}</td>
                <td class="num">{{ number(macroOf(item, 'protein'), 1) }}</td>
                <td class="num">{{ number(macroOf(item, 'carbs'), 1) }}</td>
                <td class="num">{{ number(macroOf(item, 'fat'), 1) }}</td>
              </tr>
            </tbody>
            <tfoot>
              <tr>
                <td colspan="2"><strong>Total</strong></td>
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
      :title="editingId ? 'Editar refeição' : 'Nova refeição'"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="type">Refeição</label>
          <select id="type" v-model="form.type">
            <option v-for="(label, value) in MEAL_LABEL" :key="value" :value="value">{{ label }}</option>
          </select>
        </div>
        <div class="field">
          <label for="mealDate">Data</label>
          <input id="mealDate" v-model="form.date" type="date" required />
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>Alimentos</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addItem">
            <span class="material-symbols-outlined">add</span> Alimento
          </button>
        </div>

        <p v-if="!foods.length" class="muted" :class="$style.note">
          Cadastre alimentos em <router-link to="/alimentos">Alimentos</router-link> para montar a refeição.
        </p>

        <div v-for="(item, index) in form.items" :key="index" :class="$style.item">
          <select v-model="item.food" required>
            <option value="" disabled>Alimento</option>
            <option v-for="food in foods" :key="food._id" :value="food._id">
              {{ food.name }} ({{ number(food.calories) }} kcal / {{ number(food.servingSize) }}{{ food.servingUnit }})
            </option>
          </select>
          <input v-model.number="item.quantity" type="number" step="0.1" min="0" placeholder="Qtd" required />
          <span class="muted" :class="$style.unit">{{ unitOf(item.food) }}</span>
          <button type="button" class="btn-icon" @click="form.items.splice(index, 1)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div v-if="formCalories" class="row" :class="$style.total">
          <div class="spacer"></div>
          <span class="muted">Total</span>
          <strong>{{ number(formCalories) }} kcal</strong>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, toDateInput } from '@yper/i18n';

const MEAL_LABEL = {
  breakfast: 'Café da manhã',
  morning_snack: 'Lanche da manhã',
  lunch: 'Almoço',
  afternoon_snack: 'Lanche da tarde',
  dinner: 'Jantar',
  supper: 'Ceia',
};

const empty = (day) => ({ type: 'lunch', date: day, items: [] });

export default {
  name: 'Nutrition',
  components: { AppShell, Modal },
  data() {
    return {
      MEAL_LABEL,
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
        alert(err.message);
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
        alert(err.message);
      } finally {
        this.saving = false;
      }
    },
    async remove(meal) {
      if (!confirm(`Remover ${MEAL_LABEL[meal.type].toLowerCase()}?`)) return;
      try {
        await api.del(`/meals/${meal._id}`);
        await this.load();
      } catch (err) {
        alert(err.message);
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
