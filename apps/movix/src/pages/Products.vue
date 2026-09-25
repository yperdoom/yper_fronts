<template>
  <AppShell :title="$t('products.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('products.newProduct') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <div class="search">
            <span class="material-symbols-outlined">search</span>
            <input v-model="search" type="search" :placeholder="$t('products.search.placeholder')" />
          </div>
          <label class="row" :class="$style.toggle">
            <input v-model="onlyLow" type="checkbox" :class="$style.checkbox" />
            <span>{{ $t('products.filters.onlyLow') }}</span>
          </label>
        </div>
        <span class="muted">{{ $t('products.count', { shown: filtered.length, total: products.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">inventory_2</span>
        <p>{{ products.length ? $t('products.empty.filtered') : $t('products.empty.first') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('products.table.product') }}</th>
              <th>{{ $t('products.table.category') }}</th>
              <th>{{ $t('products.table.supplier') }}</th>
              <th class="num">{{ $t('products.table.stock') }}</th>
              <th class="num">{{ $t('products.table.cost') }}</th>
              <th class="num">{{ $t('products.table.sale') }}</th>
              <th class="num">{{ $t('products.table.stockValue') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="product in filtered" :key="product._id">
              <td>
                <strong>{{ product.name }}</strong>
                <div v-if="product.sku" class="muted">{{ product.sku }}</div>
              </td>
              <td class="muted">{{ product.category }}</td>
              <td class="muted">{{ product.supplier?.name || '—' }}</td>
              <td class="num">
                <span class="badge" :class="stockBadge(product)">
                  {{ number(product.currentStock) }} {{ product.unit }}
                </span>
              </td>
              <td class="num">{{ currency(product.costPrice) }}</td>
              <td class="num">{{ currency(product.salePrice) }}</td>
              <td class="num">{{ currency(product.stockValue) }}</td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('products.actions.move')" @click="$router.push(`/movimentacoes?produto=${product._id}`)">
                    <span class="material-symbols-outlined">swap_vert</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(product)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(product)">
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
      :title="editingId ? $t('products.form.editTitle') : $t('products.form.newTitle')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">{{ $t('products.form.name') }}</label>
          <input id="name" v-model="form.name" required />
        </div>
        <div class="field">
          <label for="sku">{{ $t('products.form.sku') }}</label>
          <input id="sku" v-model="form.sku" :placeholder="$t('products.form.optionalPlaceholder')" />
        </div>
        <div class="field">
          <label for="barcode">{{ $t('products.form.barcode') }}</label>
          <input id="barcode" v-model="form.barcode" :placeholder="$t('products.form.optionalPlaceholder')" />
        </div>
        <div class="field">
          <label for="category">{{ $t('products.form.category') }}</label>
          <input id="category" v-model="form.category" list="categories" />
          <datalist id="categories">
            <option v-for="c in categories" :key="c" :value="c" />
          </datalist>
        </div>
        <div class="field">
          <label for="unit">{{ $t('products.form.unit') }}</label>
          <select id="unit" v-model="form.unit">
            <option v-for="unit in UNITS" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </div>
        <div class="field">
          <label for="supplier">{{ $t('products.form.supplier') }}</label>
          <select id="supplier" v-model="form.supplier">
            <option :value="null">{{ '—' }}</option>
            <option v-for="s in suppliers" :key="s._id" :value="s._id">{{ s.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="costPrice">{{ $t('products.form.costPrice') }}</label>
          <input id="costPrice" v-model.number="form.costPrice" type="number" step="0.01" min="0" />
        </div>
        <div class="field">
          <label for="salePrice">{{ $t('products.form.salePrice') }}</label>
          <input id="salePrice" v-model.number="form.salePrice" type="number" step="0.01" min="0" />
        </div>
        <div class="field">
          <label for="minimumStock">{{ $t('products.form.minimumStock') }}</label>
          <input id="minimumStock" v-model.number="form.minimumStock" type="number" step="0.01" min="0" />
        </div>
        <div v-if="!editingId" class="field">
          <label for="currentStock">{{ $t('products.form.currentStock') }}</label>
          <input id="currentStock" v-model.number="form.currentStock" type="number" step="0.01" />
        </div>
      </div>

      <p v-if="editingId" class="muted" :class="$style.note">
        {{ $t('products.form.note') }}
      </p>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, number, errorMessage } from '@yper/i18n';

const UNITS = ['un', 'cx', 'kg', 'g', 'L', 'ml', 'm', 'pct'];

const EMPTY = {
  name: '', sku: '', barcode: '', category: 'Geral', unit: 'un',
  costPrice: 0, salePrice: 0, minimumStock: 0, currentStock: 0, supplier: null,
};

export default {
  name: 'Products',
  components: { AppShell, Modal },
  data() {
    return {
      UNITS,
      products: [],
      suppliers: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: { ...EMPTY },
      search: '',
      onlyLow: false,
    };
  },
  computed: {
    filtered() {
      const term = this.search.trim().toLowerCase();
      return this.products.filter((product) => {
        if (this.onlyLow && !product.belowMinimum) return false;
        if (!term) return true;
        return [product.name, product.sku, product.category]
          .some((value) => (value || '').toLowerCase().includes(term));
      });
    },
    categories() {
      return [...new Set(this.products.map((p) => p.category).filter(Boolean))];
    },
  },
  async mounted() {
    await Promise.all([this.load(), this.loadSuppliers()]);
  },
  methods: {
    currency,
    number,
    stockBadge(product) {
      if (product.currentStock <= 0) return 'badge-danger';
      return product.belowMinimum ? 'badge-warn' : 'badge-ok';
    },
    async load() {
      this.loading = true;
      try {
        const { products } = await api.get('/products');
        this.products = products;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    async loadSuppliers() {
      try {
        const { suppliers } = await api.get('/suppliers');
        this.suppliers = suppliers;
      } catch {
        this.suppliers = [];
      }
    },
    openForm(product = null) {
      this.editingId = product?._id || null;
      this.form = product
        ? {
            name: product.name,
            sku: product.sku,
            barcode: product.barcode,
            category: product.category,
            unit: product.unit,
            costPrice: product.costPrice,
            salePrice: product.salePrice,
            minimumStock: product.minimumStock,
            supplier: product.supplier?._id || product.supplier || null,
          }
        : { ...EMPTY };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/products/${this.editingId}`, this.form);
        } else {
          await api.post('/products', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(product) {
      if (!confirm(this.$t('common.confirmRemove', { name: product.name }))) return;
      try {
        await api.del(`/products/${product._id}`);
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

.toggle {
  gap: 6px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.checkbox {
  width: auto;
  margin: 0;
  accent-color: var(--accent);
}

.note {
  margin: 14px 0 0;
  font-size: 0.82rem;
}
</style>
