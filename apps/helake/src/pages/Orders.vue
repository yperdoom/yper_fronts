<template>
  <AppShell :title="$t('orders.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('orders.newOrder') }}
      </button>
    </template>

    <div class="card">
      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!orders.length" class="empty">
        <span class="material-symbols-outlined">shopping_bag</span>
        <p>{{ $t('orders.empty') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('orders.table.customer') }}</th>
              <th>{{ $t('orders.table.recipe') }}</th>
              <th class="num">{{ $t('orders.table.quantity') }}</th>
              <th>{{ $t('orders.table.delivery') }}</th>
              <th>{{ $t('orders.table.status') }}</th>
              <th class="num">{{ $t('orders.table.value') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="order in orders" :key="order._id">
              <td>
                <div class="row" :class="$style.customer">
                  <span class="badge badge-accent" :class="$style.avatar">{{ initials(order.customer?.name) }}</span>
                  <strong>{{ order.customer?.name || '—' }}</strong>
                </div>
              </td>
              <td>{{ order.recipe?.name || '—' }}</td>
              <td class="num">{{ order.quantity }}</td>
              <td class="muted">{{ date(order.deliveryDate) }}</td>
              <td>
                <select
                  class="badge"
                  :class="[STATUS_BADGE[order.status], $style.status]"
                  :value="order.status"
                  @change="updateStatus(order, $event.target.value)"
                >
                  <option v-for="status in STATUSES" :key="status" :value="status">{{ $t(`orders.status.${status}`) }}</option>
                </select>
              </td>
              <td class="num">{{ currency(order.paidPrice) }}</td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(order)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(order)">
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
      :title="creatingCustomer ? $t('customers.newCustomer') : editingId ? $t('orders.form.editTitle') : $t('orders.newOrder')"
      :saving="saving"
      @close="closeForm"
      @submit="creatingCustomer ? saveCustomer() : save()"
    >
      <div v-if="creatingCustomer" class="form-grid">
        <div class="field full">
          <label for="newCustomerName">{{ $t('customers.form.name') }}</label>
          <input id="newCustomerName" v-model="customerForm.name" required />
        </div>
        <div class="field full">
          <label for="newCustomerPhone">{{ $t('customers.form.phone') }}</label>
          <input id="newCustomerPhone" v-model="customerForm.phone" type="tel" />
        </div>
        <div class="field full">
          <label for="newCustomerNotes">{{ $t('customers.form.notes') }}</label>
          <textarea id="newCustomerNotes" v-model="customerForm.notes"></textarea>
        </div>
        <p class="muted">{{ $t('orders.form.returnToOrder') }}</p>
      </div>
      <div v-else class="form-grid">
        <div class="field full">
          <label for="customer">{{ $t('orders.form.customer') }}</label>
          <select id="customer" v-model="form.customer" required>
            <option value="">{{ $t('orders.form.customerPlaceholder') }}</option>
            <option v-for="customer in customers" :key="customer._id" :value="customer._id">{{ customer.name }}</option>
          </select>
          <button type="button" class="btn" @click="startCustomer">{{ $t('customers.newCustomer') }}</button>
        </div>
        <div class="field full">
          <label for="recipe">{{ $t('orders.form.recipe') }}</label>
          <select id="recipe" v-model="form.recipe" required>
            <option value="">{{ $t('orders.form.recipePlaceholder') }}</option>
            <option v-for="recipe in recipes" :key="recipe._id" :value="recipe._id">{{ recipe.name }}</option>
          </select>
        </div>
        <div class="field">
          <label for="quantity">{{ $t('orders.form.quantity') }}</label>
          <input id="quantity" v-model.number="form.quantity" type="number" min="1" />
        </div>
        <div class="field">
          <label for="deliveryDate">{{ $t('orders.form.deliveryDate') }}</label>
          <input id="deliveryDate" v-model="form.deliveryDate" type="date" required />
        </div>
        <div class="field full">
          <label for="paidPrice">{{ $t('orders.form.paidPrice') }}</label>
          <input id="paidPrice" v-model.number="form.paidPrice" type="number" min="0" step="0.01" />
        </div>
        <div class="field full">
          <label for="notes">{{ $t('orders.form.notes') }}</label>
          <textarea id="notes" v-model="form.notes" rows="3" :placeholder="$t('orders.form.notesPlaceholder')"></textarea>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, date, toDateInput, errorMessage } from '@yper/i18n';
import { ORDER_STATUSES, ORDER_STATUS_BADGE } from '@/orderStatus';

const EMPTY = { customer: '', recipe: '', quantity: 1, deliveryDate: '', paidPrice: 0, notes: '' };

export default {
  name: 'Orders',
  components: { AppShell, Modal },
  data() {
    return {
      STATUSES: ORDER_STATUSES,
      STATUS_BADGE: ORDER_STATUS_BADGE,
      orders: [],
      customers: [],
      recipes: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: { ...EMPTY },
      creatingCustomer: false,
      customerForm: { name: '', phone: '', notes: '' },
    };
  },
  async mounted() {
    await Promise.all([this.load(), this.loadCustomers(), this.loadRecipes()]);
  },
  methods: {
    currency,
    date,
    startCustomer() {
      this.customerForm = { name: '', phone: '', notes: '' };
      this.creatingCustomer = true;
    },
    closeForm() {
      if (this.saving) return;
      if (this.creatingCustomer) this.creatingCustomer = false;
      else this.showForm = false;
    },
    async saveCustomer() {
      if (this.saving) return;
      this.saving = true;
      try {
        const { customer } = await api.post('/customers', this.customerForm);
        this.customers = [...this.customers, customer].sort((a, b) => a.name.localeCompare(b.name));
        this.form.customer = customer._id;
        this.creatingCustomer = false;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    initials(name) {
      return (name || '?').slice(0, 2).toUpperCase();
    },
    async load() {
      this.loading = true;
      try {
        const { orders } = await api.get('/orders');
        this.orders = orders;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    async loadCustomers() {
      try {
        const { customers } = await api.get('/customers');
        this.customers = customers;
      } catch {
        this.customers = [];
      }
    },
    async loadRecipes() {
      try {
        const { recipes } = await api.get('/recipes');
        this.recipes = recipes;
      } catch {
        this.recipes = [];
      }
    },
    openForm(order = null) {
      this.creatingCustomer = false;
      this.editingId = order?._id || null;
      this.form = order
        ? {
            customer: order.customer?._id || order.customer || '',
            recipe: order.recipe?._id || order.recipe || '',
            quantity: order.quantity ?? EMPTY.quantity,
            deliveryDate: order.deliveryDate ? toDateInput(order.deliveryDate) : '',
            paidPrice: order.paidPrice ?? EMPTY.paidPrice,
            notes: order.notes ?? EMPTY.notes,
          }
        : { ...EMPTY };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/orders/${this.editingId}`, this.form);
        } else {
          await api.post('/orders', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async updateStatus(order, status) {
      try {
        await api.put(`/orders/${order._id}`, { status });
      } catch (err) {
        alert(errorMessage(this.$t, err));
        return;
      }
      await this.load();
    },
    async remove(order) {
      const name = `${order.customer?.name || '—'} — ${order.recipe?.name || '—'}`;
      if (!confirm(this.$t('common.confirmRemove', { name }))) return;
      try {
        await api.del(`/orders/${order._id}`);
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

.status {
  width: auto;
  border: none;
  cursor: pointer;
  appearance: none;
  font: inherit;
  font-size: 0.78rem;
  font-weight: 600;
}

.actions {
  flex-wrap: nowrap;
  justify-content: flex-end;
}
</style>
