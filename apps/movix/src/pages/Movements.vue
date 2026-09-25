<template>
  <AppShell title="Movimentações">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Lançar
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <select v-model="filterProduct" :class="$style.filter" @change="load">
            <option value="">Todos os produtos</option>
            <option v-for="product in products" :key="product._id" :value="product._id">
              {{ product.name }}
            </option>
          </select>
          <select v-model="filterType" :class="$style.filter" @change="load">
            <option value="">Todos os tipos</option>
            <option value="in">Entrada</option>
            <option value="out">Saída</option>
            <option value="adjustment">Ajuste</option>
          </select>
        </div>
        <span class="muted">{{ movements.length }} lançamento(s)</span>
      </div>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="!movements.length" class="empty">
        <span class="material-symbols-outlined">swap_vert</span>
        <p>Nenhuma movimentação encontrada.</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Quando</th>
              <th>Produto</th>
              <th>Tipo</th>
              <th class="num">Variação</th>
              <th class="num">Saldo</th>
              <th>Origem</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="movement in movements" :key="movement._id">
              <td class="muted">{{ dateTime(movement.occurredAt) }}</td>
              <td>
                <strong>{{ movement.product?.name || '—' }}</strong>
                <div v-if="movement.product?.sku" class="muted">{{ movement.product.sku }}</div>
              </td>
              <td>
                <span class="badge" :class="TYPE_BADGE[movement.type]">{{ TYPE_LABEL[movement.type] }}</span>
              </td>
              <td class="num">
                <strong :class="movement.delta >= 0 ? $style.pos : $style.neg">
                  {{ movement.delta >= 0 ? '+' : '' }}{{ number(movement.delta, 2) }}
                </strong>
              </td>
              <td class="num">{{ number(movement.balanceAfter, 2) }}</td>
              <td class="muted">
                <router-link v-if="movement.invoice" to="/notas">
                  NF {{ movement.invoice.number }}/{{ movement.invoice.series }}
                </router-link>
                <span v-else>{{ movement.reason || '—' }}</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>

    <Modal
      :show="showForm"
      title="Nova movimentação"
      submit-label="Lançar"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="product">Produto</label>
          <select id="product" v-model="form.product" required>
            <option value="" disabled>Selecione</option>
            <option v-for="product in products" :key="product._id" :value="product._id">
              {{ product.name }} — saldo {{ number(product.currentStock, 2) }} {{ product.unit }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="type">Tipo</label>
          <select id="type" v-model="form.type">
            <option value="in">Entrada</option>
            <option value="out">Saída</option>
            <option value="adjustment">Ajuste (saldo final)</option>
          </select>
        </div>
        <div class="field">
          <label for="quantity">{{ form.type === 'adjustment' ? 'Novo saldo' : 'Quantidade' }}</label>
          <input id="quantity" v-model.number="form.quantity" type="number" step="0.01" min="0" required />
        </div>
        <div class="field">
          <label for="unitCost">Custo unitário</label>
          <input id="unitCost" v-model.number="form.unitCost" type="number" step="0.01" min="0" />
        </div>
        <div class="field full">
          <label for="reason">Motivo</label>
          <input id="reason" v-model="form.reason" placeholder="compra, perda, contagem..." />
        </div>
      </div>

      <p class="muted" :class="$style.note">
        <template v-if="form.type === 'adjustment'">
          No ajuste, informe o saldo que o produto passa a ter. A diferença é calculada e registrada.
        </template>
        <template v-else>
          Movimentações não podem ser editadas nem apagadas. Para corrigir, lance um ajuste.
        </template>
      </p>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, dateTime } from '@yper/i18n';

const TYPE_LABEL = { in: 'Entrada', out: 'Saída', adjustment: 'Ajuste' };
const TYPE_BADGE = { in: 'badge-ok', out: 'badge-danger', adjustment: 'badge-accent' };
const EMPTY = { product: '', type: 'in', quantity: 0, unitCost: 0, reason: '' };

export default {
  name: 'Movements',
  components: { AppShell, Modal },
  data() {
    return {
      TYPE_LABEL,
      TYPE_BADGE,
      movements: [],
      products: [],
      loading: true,
      saving: false,
      showForm: false,
      form: { ...EMPTY },
      filterProduct: this.$route.query.produto || '',
      filterType: '',
    };
  },
  async mounted() {
    await Promise.all([this.load(), this.loadProducts()]);
    // Chegou de /produtos com um produto escolhido: ja abre o lancamento.
    if (this.$route.query.produto) this.openForm(this.$route.query.produto);
  },
  methods: {
    number,
    dateTime,
    async load() {
      this.loading = true;
      try {
        const params = new URLSearchParams();
        if (this.filterProduct) params.set('product', this.filterProduct);
        if (this.filterType) params.set('type', this.filterType);
        const query = params.toString();
        const { movements } = await api.get(`/movements${query ? `?${query}` : ''}`);
        this.movements = movements;
      } catch (err) {
        alert(err.message);
      } finally {
        this.loading = false;
      }
    },
    async loadProducts() {
      try {
        const { products } = await api.get('/products');
        this.products = products;
      } catch {
        this.products = [];
      }
    },
    openForm(productId = '') {
      this.form = { ...EMPTY, product: productId };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        await api.post('/movements', this.form);
        this.showForm = false;
        await Promise.all([this.load(), this.loadProducts()]);
      } catch (err) {
        alert(err.message);
      } finally {
        this.saving = false;
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

.pos {
  color: var(--success);
}

.neg {
  color: var(--danger);
}

.note {
  margin: 14px 0 0;
  font-size: 0.82rem;
}
</style>
