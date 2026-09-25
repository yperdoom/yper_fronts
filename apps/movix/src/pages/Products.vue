<template>
  <AppShell title="Produtos">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Novo produto
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <div class="search">
            <span class="material-symbols-outlined">search</span>
            <input v-model="search" type="search" placeholder="Nome, SKU ou categoria" />
          </div>
          <label class="row" :class="$style.toggle">
            <input v-model="onlyLow" type="checkbox" :class="$style.checkbox" />
            <span>Só abaixo do mínimo</span>
          </label>
        </div>
        <span class="muted">{{ filtered.length }} de {{ products.length }}</span>
      </div>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">inventory_2</span>
        <p>{{ products.length ? 'Nenhum produto com esse filtro.' : 'Cadastre seu primeiro produto.' }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Produto</th>
              <th>Categoria</th>
              <th>Fornecedor</th>
              <th class="num">Estoque</th>
              <th class="num">Custo</th>
              <th class="num">Venda</th>
              <th class="num">Em estoque</th>
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
                  <button class="btn-icon" title="Movimentar" @click="$router.push(`/movimentacoes?produto=${product._id}`)">
                    <span class="material-symbols-outlined">swap_vert</span>
                  </button>
                  <button class="btn-icon" title="Editar" @click="openForm(product)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" title="Remover" @click="remove(product)">
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
      :title="editingId ? 'Editar produto' : 'Novo produto'"
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
          <label for="sku">SKU</label>
          <input id="sku" v-model="form.sku" placeholder="opcional" />
        </div>
        <div class="field">
          <label for="barcode">Código de barras</label>
          <input id="barcode" v-model="form.barcode" placeholder="opcional" />
        </div>
        <div class="field">
          <label for="category">Categoria</label>
          <input id="category" v-model="form.category" list="categories" />
          <datalist id="categories">
            <option v-for="c in categories" :key="c" :value="c" />
          </datalist>
        </div>
        <div class="field">
          <label for="unit">Unidade</label>
          <select id="unit" v-model="form.unit">
            <option v-for="unit in UNITS" :key="unit" :value="unit">{{ unit }}</option>
          </select>
        </div>
        <div class="field">
          <label for="supplier">Fornecedor</label>
          <select id="supplier" v-model="form.supplier">
            <option :value="null">—</option>
            <option v-for="s in suppliers" :key="s._id" :value="s._id">{{ s.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="costPrice">Preço de custo</label>
          <input id="costPrice" v-model.number="form.costPrice" type="number" step="0.01" min="0" />
        </div>
        <div class="field">
          <label for="salePrice">Preço de venda</label>
          <input id="salePrice" v-model.number="form.salePrice" type="number" step="0.01" min="0" />
        </div>
        <div class="field">
          <label for="minimumStock">Estoque mínimo</label>
          <input id="minimumStock" v-model.number="form.minimumStock" type="number" step="0.01" min="0" />
        </div>
        <div v-if="!editingId" class="field">
          <label for="currentStock">Estoque inicial</label>
          <input id="currentStock" v-model.number="form.currentStock" type="number" step="0.01" />
        </div>
      </div>

      <p v-if="editingId" class="muted" :class="$style.note">
        O saldo não é editado aqui. Para corrigir, lance uma movimentação do tipo ajuste.
      </p>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, number } from '@yper/i18n';

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
        alert(err.message);
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
        alert(err.message);
      } finally {
        this.saving = false;
      }
    },
    async remove(product) {
      if (!confirm(`Remover "${product.name}"?`)) return;
      try {
        await api.del(`/products/${product._id}`);
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
