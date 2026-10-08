<template>
  <AppShell :title="$t('invoices.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('invoices.newTitle') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="row">
          <select v-model="filterType" :class="$style.filter" @change="load">
            <option value="">{{ $t('invoices.filters.allTypes') }}</option>
            <option value="in">{{ $t('invoices.filters.onlyIn') }}</option>
            <option value="out">{{ $t('invoices.filters.onlyOut') }}</option>
          </select>
          <select v-model="filterStatus" :class="$style.filter" @change="load">
            <option value="">{{ $t('invoices.filters.allStatus') }}</option>
            <option value="draft">{{ $t('invoices.status.draft') }}</option>
            <option value="confirmed">{{ $t('invoices.status.confirmed') }}</option>
            <option value="cancelled">{{ $t('invoices.status.cancelled') }}</option>
          </select>
        </div>
        <span class="muted">{{ $t('invoices.count', { count: invoices.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!invoices.length" class="empty">
        <span class="material-symbols-outlined">receipt_long</span>
        <p>{{ $t('invoices.empty') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('invoices.table.number') }}</th>
              <th>{{ $t('invoices.table.issueDate') }}</th>
              <th>{{ $t('invoices.table.type') }}</th>
              <th>{{ $t('invoices.table.counterpart') }}</th>
              <th class="num">{{ $t('invoices.table.items') }}</th>
              <th class="num">{{ $t('invoices.table.total') }}</th>
              <th>{{ $t('invoices.table.status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="invoice in invoices" :key="invoice._id">
              <td><strong>{{ `${invoice.number}/${invoice.series}` }}</strong></td>
              <td class="muted">{{ date(invoice.issueDate) }}</td>
              <td>
                <span class="badge" :class="invoice.type === 'in' ? 'badge-ok' : 'badge-accent'">
                  {{ invoice.type === 'in' ? $t('invoices.types.in') : $t('invoices.types.out') }}
                </span>
              </td>
              <td class="muted">{{ invoice.supplier?.name || invoice.counterpartName || '—' }}</td>
              <td class="num">{{ invoice.items.length }}</td>
              <td class="num">{{ currency(invoice.totalAmount) }}</td>
              <td>
                <span class="badge" :class="STATUS_BADGE[invoice.status]">{{ $t(`invoices.status.${invoice.status}`) }}</span>
              </td>
              <td>
                <div class="row" :class="$style.actions">
                  <button
                    v-if="invoice.status === 'draft'"
                    class="btn-icon"
                    :title="$t('invoices.actions.confirm')"
                    @click="confirmInvoice(invoice)"
                  >
                    <span class="material-symbols-outlined">task_alt</span>
                  </button>
                  <button v-if="invoice.status === 'draft'" class="btn-icon" :title="$t('common.edit')" @click="openForm(invoice)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button
                    v-if="invoice.status !== 'cancelled'"
                    class="btn-icon"
                    :title="$t('common.cancel')"
                    @click="cancelInvoice(invoice)"
                  >
                    <span class="material-symbols-outlined">block</span>
                  </button>
                  <button v-if="invoice.status === 'draft'" class="btn-icon" :title="$t('common.remove')" @click="remove(invoice)">
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
      :title="editingId ? $t('invoices.editTitle') : $t('invoices.newTitle')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="number">{{ $t('invoices.form.number') }}</label>
          <input id="number" v-model="form.number" required />
        </div>
        <div class="field">
          <label for="series">{{ $t('invoices.form.series') }}</label>
          <input id="series" v-model="form.series" />
        </div>
        <div class="field">
          <label for="type">{{ $t('invoices.form.type') }}</label>
          <select id="type" v-model="form.type">
            <option value="in">{{ $t('invoices.form.types.in') }}</option>
            <option value="out">{{ $t('invoices.form.types.out') }}</option>
          </select>
        </div>
        <div class="field">
          <label for="issueDate">{{ $t('invoices.form.issueDate') }}</label>
          <input id="issueDate" v-model="form.issueDate" type="date" required />
        </div>
        <div v-if="form.type === 'in'" class="field full">
          <label for="supplier">{{ $t('invoices.form.supplier') }}</label>
          <select id="supplier" v-model="form.supplier">
            <option :value="null">{{ '—' }}</option>
            <option v-for="s in suppliers" :key="s._id" :value="s._id">{{ s.name }}</option>
          </select>
        </div>
        <div v-else class="field full">
          <label for="counterpart">{{ $t('invoices.form.counterpart') }}</label>
          <input id="counterpart" v-model="form.counterpartName" />
        </div>
        <div class="field full">
          <label for="accessKey">{{ $t('invoices.form.accessKey') }}</label>
          <input id="accessKey" v-model="form.accessKey" :placeholder="$t('invoices.form.accessKeyPlaceholder')" />
        </div>
      </div>

      <div :class="$style.items">
        <div class="row">
          <strong>{{ $t('invoices.items.title') }}</strong>
          <div class="spacer"></div>
          <button type="button" class="btn" @click="addItem">
            <span class="material-symbols-outlined">add</span> {{ $t('invoices.items.addButton') }}
          </button>
        </div>

        <p v-if="!form.items.length" class="muted" :class="$style.note">
          {{ $t('invoices.items.empty') }}
        </p>

        <div v-for="(item, index) in form.items" :key="index" :class="$style.item">
          <select v-model="item.product" required>
            <option value="" disabled>{{ $t('invoices.items.productPlaceholder') }}</option>
            <option v-for="product in products" :key="product._id" :value="product._id">
              {{ product.name }}
            </option>
          </select>
          <input v-model.number="item.quantity" type="number" step="0.01" min="0" :placeholder="$t('invoices.items.quantityPlaceholder')" required />
          <input v-model.number="item.unitPrice" type="number" step="0.01" min="0" :placeholder="$t('invoices.items.unitPricePlaceholder')" />
          <button type="button" class="btn-icon" @click="form.items.splice(index, 1)">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <div v-if="form.items.length" class="row" :class="$style.total">
          <div class="spacer"></div>
          <span class="muted">{{ $t('invoices.items.total') }}</span>
          <strong>{{ currency(formTotal) }}</strong>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, date, toDateInput, errorMessage } from '@yper/i18n';

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
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async confirmInvoice(invoice) {
      const verb = this.$t(`invoices.confirmVerb.${invoice.type}`);
      const message = this.$t('invoices.confirmMessage', { number: invoice.number, series: invoice.series, verb });
      if (!confirm(message)) return;
      try {
        await api.post(`/invoices/${invoice._id}/confirm`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      }
    },
    async cancelInvoice(invoice) {
      const message = this.$t('invoices.cancelMessage', { number: invoice.number, series: invoice.series });
      if (!confirm(message)) return;
      try {
        await api.post(`/invoices/${invoice._id}/cancel`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      }
    },
    async remove(invoice) {
      const message = this.$t('invoices.removeMessage', { number: invoice.number, series: invoice.series });
      if (!confirm(message)) return;
      try {
        await api.del(`/invoices/${invoice._id}`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
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
  grid-template-columns: minmax(0, 1fr) 90px 110px auto;
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
    grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto;
  }

  .item > select {
    grid-column: 1 / -1;
  }
}
</style>
