<template>
  <AppShell :title="$t('customers.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">person_add</span> {{ $t('customers.newCustomer') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="search">
          <span class="material-symbols-outlined">search</span>
          <input v-model="search" type="search" :placeholder="$t('customers.search.placeholder')" />
        </div>
        <span class="muted">{{ $t('customers.count', { shown: filtered.length, total: customers.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">group</span>
        <p>{{ customers.length ? $t('customers.empty.filtered') : $t('customers.empty.first') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('customers.table.customer') }}</th>
              <th>{{ $t('customers.table.phone') }}</th>
              <th class="num">{{ $t('customers.table.orders') }}</th>
              <th class="num">{{ $t('customers.table.spent') }}</th>
              <th>{{ $t('customers.table.lastOrder') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="customer in filtered" :key="customer._id">
              <td>
                <div class="row" :class="$style.customer">
                  <span class="badge badge-accent" :class="$style.avatar">{{ initials(customer.name) }}</span>
                  <strong>{{ customer.name }}</strong>
                </div>
                <div v-if="customer.notes" class="muted">{{ customer.notes }}</div>
              </td>
              <td class="muted">{{ customer.phone || '—' }}</td>
              <td class="num">{{ number(customer.totalOrders) }}</td>
              <td class="num">{{ currency(customer.totalSpent) }}</td>
              <td class="muted">{{ date(customer.lastOrder) }}</td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(customer)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(customer)">
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
      :title="editingId ? $t('customers.form.editTitle') : $t('customers.newCustomer')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">{{ $t('customers.form.name') }}</label>
          <input id="name" v-model="form.name" required />
        </div>
        <div class="field full">
          <label for="phone">{{ $t('customers.form.phone') }}</label>
          <input id="phone" v-model="form.phone" />
        </div>
        <div class="field full">
          <label for="notes">{{ $t('customers.form.notes') }}</label>
          <textarea id="notes" v-model="form.notes"></textarea>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, number, date, errorMessage } from '@yper/i18n';

const EMPTY = { name: '', phone: '', notes: '' };

export default {
  name: 'Customers',
  components: { AppShell, Modal },
  data() {
    return {
      customers: [],
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
      if (!term) return this.customers;
      return this.customers.filter((customer) =>
        [customer.name, customer.phone].some((value) => (value || '').toLowerCase().includes(term))
      );
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    currency,
    number,
    date,
    initials(name) {
      return name.slice(0, 2).toUpperCase();
    },
    async load() {
      this.loading = true;
      try {
        const { customers } = await api.get('/customers');
        this.customers = customers;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    openForm(customer = null) {
      this.editingId = customer?._id || null;
      this.form = customer
        ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, customer[key] ?? EMPTY[key]]))
        : { ...EMPTY };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/customers/${this.editingId}`, this.form);
        } else {
          await api.post('/customers', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(customer) {
      if (!confirm(this.$t('common.confirmRemove', { name: customer.name }))) return;
      try {
        await api.del(`/customers/${customer._id}`);
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      }
    },
  },
};
</script>

<style module>
.customer {
  flex-wrap: nowrap;
}

.avatar {
  border-radius: 999px;
  width: 26px;
  height: 26px;
  padding: 0;
  justify-content: center;
}

.actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}
</style>
