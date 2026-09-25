<template>
  <AppShell title="Notas">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> Nova nota
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <select v-model="filterType" :class="$style.filter" @change="load">
            <option value="">Entradas e saídas</option>
            <option value="in">Só entradas</option>
            <option value="out">Só saídas</option>
          </select>
          <select v-model="filterStatus" :class="$style.filter" @change="load">
            <option value="">Todos os status</option>
            <option value="draft">Rascunho</option>
            <option value="confirmed">Confirmada</option>
            <option value="cancelled">Cancelada</option>
          </select>
        </div>
        <span class="muted">{{ invoices.length }} nota(s)</span>
      </div>

      <div v-if="loading" class="loading">Carregando...</div>

      <div v-else-if="!invoices.length" class="empty">
        <span class="material-symbols-outlined">receipt_long</span>
        <p>Nenhuma nota lançada.</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>Nota</th>
              <th>Emissão</th>
              <th>Tipo</th>
              <th>Contraparte</th>
              <th class="num">Itens</th>
              <th class="num">Total</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in invoices" :key="invoice._id">
              <td><strong>{{ invoice.number }}/{{ invoice.series }}</strong></td>
              <td class="muted">{{ date(invoice.issueDate) }}</td>
              <td>
                <span class="badge" :class="invoice.type === 'in' ? 'badge-ok' : 'badge-accent'">
                  {{ invoice.type === 'in' ? 'Entrada' : 'Saída' }}
                </span>
              </td>
              <td class="muted">{{ invoice.supplier?.name || invoice.counterpartName || '—' }}</td>
              <td class="num">{{ invoice.items.length }}</td>
              <td class="num">{{ currency(invoice.totalAmount) }}</td>
              <td>
                <span class="badge" :class="STATUS_BADGE[invoice.status]">{{ STATUS_LABEL[invoice.status] }}</span>
              </td>
              <td>
                <div class="row" :class="$style.actions">
                  <button
                    v-if="invoice.status === 'draft'"
                    class="btn-icon"
                    title="Confirmar e dar baixa no estoque"
                    @click="confirmInvoice(invoice)"
                  >
                    <span class="material-symbols-outlined">task_alt</span>
                  </button>
                  <button v-if="invoice.status === 'draft'" class="btn-icon" title="Editar" @click="openForm(invoice)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    v-if="invoice.status !== 'cancelled'"
                    class="btn-icon"
                    title="Cancelar"
                    @click="cancelInvoice(invoice)"
                  >
                    <span class="material-symbols-outlined">block</span>
                  </button>
                  <button v-if="invoice.status === 'draft'" class="btn-icon" title="Remover" @click="remove(invoice)">
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
      :title="editingId ? 'Editar nota' : 'Nova nota'"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="number">Número</label>
          <input id="number" v-model="form.number" required />
        </div>
        <div class="field">
          <label for="series">Série</label>
          <input id="series" v-model="form.series" />
        </div>
        <div class="field">
          <label for="type">Tipo</label>
          <select id="type" v-model="form.type">
            <option value="in">Entrada (compra)</option>
            <option value="out">Saída (venda)</option>
          </select>
        </div>
        <div class="field">
          <label for="issueDate">Emissão</label>
          <input id="issueDate" v-model="form.issueDate" type="date" required />
        </div>
        <div v-if="form.type === 'in'" class="field full">
          <label for="supplier">Fornecedor</label>
          <select id="supplier" v-model="form.supplier">
            <option :value="null">—</option>
            <option v-for="s in suppliers" :key="s._id" :value="s._id">{{ s.name }}</option>
          </select>
        </div>
        <div v-else class="field full">
          <label for="counterpart">Destinatário</label>
          <input id="counterpart" v-model="form.counterpartName" />
        </div>
        <div class="field full">
          <label for="accessKey">Chave de acesso</label>
          <input id="accessKey" v-model="form.accessKey" placeholder="44 dígitos (opcional)" />
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>Itens</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addItem">
            <span class="material-symbols-outlined">add</span> Item
          </button>
        </div>

        <p v-if="!form.items.length" class="muted" :class="$style.note">
          Adicione ao menos um item — é o que gera as movimentações na confirmação.
        </p>

        <div v-for="(item, index) in form.items" :key="index" :class="$style.item">
          <select v-model="item.product" required>
            <option value="" disabled>Produto</option>
            <option v-for="product in products" :key="product._id" :value="product._id">
              {{ product.name }}
            </option>
          </select>
          <input v-model.number="item.quantity" type="number" step="0.01" min="0" placeholder="Qtd" required />
          <input v-model.number="item.unitPrice" type="number" step="0.01" min="0" placeholder="Valor un." />
          <button type="button" class="btn-icon" @click="form.items.splice(index, 1)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div v-if="form.items.length" class="row" :class="$style.total">
          <div class="spacer"></div>
          <span class="muted">Total</span>
          <strong>{{ currency(formTotal) }}</strong>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, date, toDateInput } from '@yper/i18n';

const STATUS_LABEL = { draft: 'Rascunho', confirmed: 'Confirmada', cancelled: 'Cancelada' };
const STATUS_BADGE = { draft: 'badge', confirmed: 'badge-ok', cancelled: 'badge-danger' };

const empty = () => ({
  number: '', series: '1', type: 'in', issueDate: toDateInput(),
  supplier: null, counterpartName: '', accessKey: '', items: [],
});

export default {
  name: 'Invoices',
  components: { AppShell, Modal },
  data() {
    return {
      STATUS_LABEL,
      STATUS_BADGE,
      invoices: [],
      products: [],
      suppliers: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: empty(),
      filterType: '',
      filterStatus: '',
    };
  },
  computed: {
    formTotal() {
      return this.form.items.reduce((sum, item) => sum + (item.quantity || 0) * (item.unitPrice || 0), 0);
    },
  },
  async mounted() {
    await Promise.all([this.load(), this.loadProducts(), this.loadSuppliers()]);
  },
  methods: {
    currency,
    date,
    async load() {
      this.loading = true;
      try {
        const params = new URLSearchParams();
        if (this.filterType) params.set('type', this.filterType);
        if (this.filterStatus) params.set('status', this.filterStatus);
        const query = params.toString();
        const { invoices } = await api.get(`/invoices${query ? `?${query}` : ''}`);
        this.invoices = invoices;
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
    async loadSuppliers() {
      try {
        const { suppliers } = await api.get('/suppliers');
        this.suppliers = suppliers;
      } catch {
        this.suppliers = [];
      }
    },
    openForm(invoice = null) {
      this.editingId = invoice?._id || null;
      this.form = invoice
        ? {
            number: invoice.number,
            series: invoice.series,
            type: invoice.type,
            issueDate: toDateInput(invoice.issueDate),
            supplier: invoice.supplier?._id || invoice.supplier || null,
            counterpartName: invoice.counterpartName,
            accessKey: invoice.accessKey,
            items: invoice.items.map((item) => ({
              product: item.product?._id || item.product,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
            })),
          }
        : empty();
      this.showForm = true;
    },
    addItem() {
      this.form.items.push({ product: '', quantity: 1, unitPrice: 0 });
    },
    async save() {
      this.saving = true;
      try {
        const body = { ...this.form, items: this.form.items.filter((item) => item.product) };
        if (this.editingId) {
          await api.put(`/invoices/${this.editingId}`, body);
        } else {
          await api.post('/invoices', body);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(err.message);
      } finally {
        this.saving = false;
      }
    },
    async confirmInvoice(invoice) {
      const verb = invoice.type === 'in' ? 'somar' : 'subtrair';
      if (!confirm(`Confirmar a nota ${invoice.number}/${invoice.series}? Isso vai ${verb} os itens no estoque.`)) return;
      try {
        await api.post(`/invoices/${invoice._id}/confirm`);
        await this.load();
      } catch (err) {
        alert(err.message);
      }
    },
    async cancelInvoice(invoice) {
      if (!confirm(`Cancelar a nota ${invoice.number}/${invoice.series}? As movimentações geradas serão estornadas.`)) return;
      try {
        await api.post(`/invoices/${invoice._id}/cancel`);
        await this.load();
      } catch (err) {
        alert(err.message);
      }
    },
    async remove(invoice) {
      if (!confirm(`Remover a nota ${invoice.number}/${invoice.series}?`)) return;
      try {
        await api.del(`/invoices/${invoice._id}`);
        await this.load();
      } catch (err) {
        alert(err.message);
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
  grid-template-columns: 1fr 90px 110px auto;
  gap: 8px;
  align-items: center;
  margin-top: 8px;
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
    grid-template-columns: 1fr 1fr auto;
  }

  .item > select {
    grid-column: 1 / -1;
  }
}
</style>
