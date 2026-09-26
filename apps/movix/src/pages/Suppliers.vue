<template>
  <AppShell :title="$t('suppliers.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('suppliers.newSupplier') }}
      </button>
    </template>

    <div class="card">
      <div class="card-head">
        <div class="search">
          <span class="material-symbols-outlined">search</span>
          <input v-model="search" type="search" :placeholder="$t('suppliers.search.placeholder')" />
        </div>
        <span class="muted">{{ $t('suppliers.count', { shown: filtered.length, total: suppliers.length }) }}</span>
      </div>

      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!filtered.length" class="empty">
        <span class="material-symbols-outlined">local_shipping</span>
        <p>{{ suppliers.length ? $t('suppliers.empty.filtered') : $t('suppliers.empty.first') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('suppliers.table.name') }}</th>
              <th>{{ $t('suppliers.table.document') }}</th>
              <th>{{ $t('suppliers.table.contact') }}</th>
              <th>{{ $t('suppliers.table.status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="supplier in filtered" :key="supplier._id">
              <td>
                <strong>{{ supplier.name }}</strong>
                <div v-if="supplier.notes" class="muted">{{ supplier.notes }}</div>
              </td>
              <td class="muted">{{ supplier.document || '—' }}</td>
              <td class="muted">
                <div v-if="supplier.phone">{{ supplier.phone }}</div>
                <div v-if="supplier.email">{{ supplier.email }}</div>
                <span v-if="!supplier.phone && !supplier.email">{{ '—' }}</span>
              </td>
              <td>
                <span class="badge" :class="supplier.active ? 'badge-ok' : ''">
                  {{ supplier.active ? $t('suppliers.status.active') : $t('suppliers.status.inactive') }}
                </span>
              </td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(supplier)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('common.remove')" @click="remove(supplier)">
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
      :title="editingId ? $t('suppliers.form.editTitle') : $t('suppliers.newSupplier')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="name">{{ $t('suppliers.form.name') }}</label>
          <input id="name" v-model="form.name" required />
        </div>
        <div class="field">
          <label for="document">{{ $t('suppliers.form.document') }}</label>
          <input id="document" v-model="form.document" />
        </div>
        <div class="field">
          <label for="phone">{{ $t('suppliers.form.phone') }}</label>
          <input id="phone" v-model="form.phone" />
        </div>
        <div class="field full">
          <label for="email">{{ $t('suppliers.form.email') }}</label>
          <input id="email" v-model="form.email" type="email" />
        </div>
        <div class="field full">
          <label for="notes">{{ $t('suppliers.form.notes') }}</label>
          <textarea id="notes" v-model="form.notes"></textarea>
        </div>
        <label class="row full" :class="$style.toggle">
          <input v-model="form.active" type="checkbox" :class="$style.checkbox" />
          <span>{{ $t('suppliers.form.activeToggle') }}</span>
        </label>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { errorMessage } from '@yper/i18n';

const EMPTY = { name: '', document: '', email: '', phone: '', notes: '', active: true };

export default {
  name: 'Suppliers',
  components: { AppShell, Modal },
  data() {
    return {
      suppliers: [],
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
      if (!term) return this.suppliers;
      return this.suppliers.filter((supplier) =>
        [supplier.name, supplier.document].some((value) => (value || '').toLowerCase().includes(term))
      );
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const { suppliers } = await api.get('/suppliers');
        this.suppliers = suppliers;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    openForm(supplier = null) {
      this.editingId = supplier?._id || null;
      this.form = supplier
        ? Object.fromEntries(Object.keys(EMPTY).map((key) => [key, supplier[key] ?? EMPTY[key]]))
        : { ...EMPTY };
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/suppliers/${this.editingId}`, this.form);
        } else {
          await api.post('/suppliers', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(supplier) {
      if (!confirm(this.$t('common.confirmRemove', { name: supplier.name }))) return;
      try {
        await api.del(`/suppliers/${supplier._id}`);
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
  gap: 7px;
  color: var(--text-muted);
  cursor: pointer;
  user-select: none;
}

.checkbox {
  width: auto;
  margin: 0;
  accent-color: var(--accent);
}
</style>
