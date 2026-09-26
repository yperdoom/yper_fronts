<template>
  <AppShell title="Alimentos">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Novo alimento
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="search">
          <span class="material-symbols-outlined">search</span>
          <input v-model="search" type="search" placeholder="Nome ou marca" />
        </div>
        <span class="muted">{{ filtered.length }} de {{ foods.length }}</span>
      </div>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">nutrition</span>
        <p>{{ foods.length ? 'Nenhum alimento com esse filtro.' : 'Cadastre seu primeiro alimento.' }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Alimento</th>
              <th class="num">Porção</th>
              <th class="num">Kcal</th>
              <th class="num">Proteína</th>
              <th class="num">Carbo</th>
              <th class="num">Gordura</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="food in filtered" :key="food._id">
              <td>
                <strong>{{ food.name }}</strong>
                <div v-if="food.brand" class="muted">{{ food.brand }}</div>
              </td>
              <td class="num muted">{{ number(food.servingSize) }} {{ food.servingUnit }}</td>
              <td class="num">{{ number(food.calories) }}</td>
              <td class="num">{{ number(food.protein, 1) }} g</td>
              <td class="num">{{ number(food.carbs, 1) }} g</td>
              <td class="num">{{ number(food.fat, 1) }} g</td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" title="Editar" @click="openForm(food)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" title="Remover" @click="remove(food)">
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
      :title="editingId ? 'Editar alimento' : 'Novo alimento'"
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
          <label for="brand">Marca</label>
          <input id="brand" v-model="form.brand" placeholder="opcional" />
        </div>
        <div class="field">
          <label for="servingSize">Porção de referência</label>
          <input id="servingSize" v-model.number="form.servingSize" type="number" step="0.1" min="0.1" required />
        </div>
        <div class="field">
          <label for="servingUnit">Unidade</label>
          <select id="servingUnit" v-model="form.servingUnit">
            <option value="g">gramas</option>
            <option value="ml">mililitros</option>
            <option value="un">unidade</option>
          </select>
        </div>
      </div>

      <p class="muted" :class="$style.note">
        Os valores abaixo são <strong>por porção de referência</strong>. Ao montar a refeição você informa a
        quantidade real e os macros são convertidos.
      </p>

      <div class="form-grid" :class="$style.macros">
        <div class="field">
          <label for="calories">Calorias</label>
          <input id="calories" v-model.number="form.calories" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="protein">Proteína (g)</label>
          <input id="protein" v-model.number="form.protein" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="carbs">Carboidrato (g)</label>
          <input id="carbs" v-model.number="form.carbs" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="fat">Gordura (g)</label>
          <input id="fat" v-model.number="form.fat" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="fiber">Fibra (g)</label>
          <input id="fiber" v-model.number="form.fiber" type="number" step="0.1" min="0" />
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number } from '@yper/i18n';

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
        alert(err.message);
      } finally {
        this.loading = false;
      }
    },
    openForm(food = null) {
      this.editingId = food?._id || null;
      this.form = food ? { ...EMPTY, ...food } : { ...EMPTY };
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
        alert(err.message);
      } finally {
        this.saving = false;
      }
    },
    async remove(food) {
      if (!confirm(`Remover "${food.name}"?`)) return;
      try {
        await api.del(`/foods/${food._id}`);
        await this.load();
      } catch (err) {
        alert(err.message);
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
