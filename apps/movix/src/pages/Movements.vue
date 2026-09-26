<template>
  <AppShell :title="$t('movements.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('movements.addButton') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <select v-model="filterProduct" :class="$style.filter" @change="load">
            <option value="">{{ $t('movements.filters.allProducts') }}</option>
            <option v-for="product in products" :key="product._id" :value="product._id">
              {{ product.name }}
            </option>
          </select>
          <select v-model="filterType" :class="$style.filter" @change="load">
            <option value="">{{ $t('movements.filters.allTypes') }}</option>
            <option value="in">{{ $t('movements.types.in') }}</option>
            <option value="out">{{ $t('movements.types.out') }}</option>
            <option value="adjustment">{{ $t('movements.types.adjustment') }}</option>
          </select>
        </div>
        <span class="muted">{{ $t('movements.count', { count: movements.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!movements.length" class="empty">
        <span class="material-symbols-outlined">swap_vert</span>
        <p>{{ $t('movements.empty') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('movements.table.when') }}</th>
              <th>{{ $t('movements.table.product') }}</th>
              <th>{{ $t('movements.table.type') }}</th>
              <th class="num">{{ $t('movements.table.delta') }}</th>
              <th class="num">{{ $t('movements.table.balance') }}</th>
              <th>{{ $t('movements.table.origin') }}</th>
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
                <span class="badge" :class="TYPE_BADGE[movement.type]">{{ $t(`movements.types.${movement.type}`) }}</span>
              </td>
              <td class="num">
                <strong :class="movement.delta >= 0 ? $style.pos : $style.neg">
                  {{ movement.delta >= 0 ? '+' : '' }}{{ number(movement.delta, 2) }}
                </strong>
              </td>
              <td class="num">{{ number(movement.balanceAfter, 2) }}</td>
              <td class="muted">
                <router-link v-if="movement.invoice" to="/invoices">
                  {{ $t('movements.invoiceRef', { number: movement.invoice.number, series: movement.invoice.series }) }}
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
      :title="$t('movements.form.title')"
      :submit-label="$t('movements.addButton')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="product">{{ $t('movements.form.product') }}</label>
          <select id="product" v-model="form.product" required>
            <option value="" disabled>{{ $t('movements.form.selectProduct') }}</option>
            <option v-for="product in products" :key="product._id" :value="product._id">
              {{ $t('movements.form.productOption', { name: product.name, balance: number(product.currentStock, 2), unit: product.unit }) }}
            </option>
          </select>
        </div>
        <div class="field">
          <label for="type">{{ $t('movements.form.type') }}</label>
          <select id="type" v-model="form.type">
            <option value="in">{{ $t('movements.types.in') }}</option>
            <option value="out">{{ $t('movements.types.out') }}</option>
            <option value="adjustment">{{ $t('movements.form.adjustmentType') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="quantity">{{ form.type === 'adjustment' ? $t('movements.form.newBalance') : $t('movements.form.quantity') }}</label>
          <input id="quantity" v-model.number="form.quantity" type="number" step="0.01" min="0" required />
        </div>
        <div class="field">
          <label for="unitCost">{{ $t('movements.form.unitCost') }}</label>
          <input id="unitCost" v-model.number="form.unitCost" type="number" step="0.01" min="0" />
        </div>
        <div class="field full">
          <label for="reason">{{ $t('movements.form.reason') }}</label>
          <input id="reason" v-model="form.reason" :placeholder="$t('movements.form.reasonPlaceholder')" />
        </div>
      </div>

      <p class="muted" :class="$style.note">
        <template v-if="form.type === 'adjustment'">
          {{ $t('movements.form.noteAdjustment') }}
        </template>
        <template v-else>
          {{ $t('movements.form.noteDefault') }}
        </template>
      </p>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, dateTime, errorMessage } from '@yper/i18n';

const TYPE_BADGE = { in: 'badge-ok', out: 'badge-danger', adjustment: 'badge-accent' };
const EMPTY = { product: '', type: 'in', quantity: 0, unitCost: 0, reason: '' };

export default {
  name: 'Movements',
  components: { AppShell, Modal },
  data() {
    return {
      TYPE_BADGE,
      movements: [],
      products: [],
      loading: true,
      saving: false,
      showForm: false,
      form: { ...EMPTY },
      filterProduct: this.$route.query.product || '',
      filterType: '',
    };
  },
  async mounted() {
    await Promise.all([this.load(), this.loadProducts()]);
    // Chegou de /products com um produto escolhido: ja abre o lancamento.
    if (this.$route.query.product) this.openForm(this.$route.query.product);
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
        alert(errorMessage(this.$t, err));
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
        alert(errorMessage(this.$t, err));
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
