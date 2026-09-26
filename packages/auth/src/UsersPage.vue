<template>
  <AppShell :title="$t('users.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('users.newUser') }}
      </button>
    </template>

    <div class="card">
      <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

      <div v-else-if="!users.length" class="empty">
        <span class="material-symbols-outlined">group</span>
        <p>{{ $t('users.empty') }}</p>
      </div>

      <div v-else class="table-wrap">
        <table class="data">
          <thead>
            <tr>
              <th>{{ $t('users.table.name') }}</th>
              <th>{{ $t('users.table.email') }}</th>
              <th>{{ $t('users.table.role') }}</th>
              <th>{{ $t('users.table.apps') }}</th>
              <th>{{ $t('users.table.status') }}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="user in users" :key="user.id">
              <td>
                <strong>{{ user.name || '—' }}</strong>
                <span v-if="isSelf(user)" class="badge badge-accent" :class="$style.you">{{ $t('users.you') }}</span>
              </td>
              <td class="muted">{{ user.email }}</td>
              <td>{{ $t(`roles.${user.role}`) }}</td>
              <td class="muted">{{ appNames(user.apps) }}</td>
              <td>
                <span class="badge" :class="user.active ? 'badge-ok' : ''">
                  {{ user.active ? $t('users.status.active') : $t('users.status.inactive') }}
                </span>
              </td>
              <td>
                <div class="row" :class="$style.actions">
                  <button class="btn-icon" :title="$t('common.edit')" @click="openForm(user)">
                    <span class="material-symbols-outlined">edit</span>
                  </button>
                  <button class="btn-icon" :title="$t('users.resetPassword')" @click="openReset(user)">
                    <span class="material-symbols-outlined">key</span>
                  </button>
                  <button v-if="!isSelf(user)" class="btn-icon" :title="$t('common.remove')" @click="remove(user)">
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
      :title="editing ? $t('users.editTitle') : $t('users.newUser')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field full">
          <label for="user-name">{{ $t('users.form.name') }}</label>
          <input id="user-name" v-model="form.name" />
        </div>
        <div class="field full">
          <label for="user-email">{{ $t('users.form.email') }}</label>
          <input id="user-email" v-model="form.email" type="email" required />
        </div>
        <div v-if="!editing" class="field full">
          <label for="user-password">{{ $t('users.form.password') }}</label>
          <input id="user-password" v-model="form.password" type="password" required autocomplete="new-password" />
        </div>
        <div v-if="!editingSelf" class="field full">
          <label for="user-role">{{ $t('users.form.role') }}</label>
          <select id="user-role" v-model="form.role">
            <option v-for="role in roles" :key="role" :value="role">{{ $t(`roles.${role}`) }}</option>
          </select>
        </div>
        <div class="field full">
          <label>{{ $t('users.form.apps') }}</label>
          <div class="row">
            <label v-for="app in apps" :key="app" class="row" :class="$style.toggle">
              <input
                v-model="form.apps"
                type="checkbox"
                name="apps"
                :value="app"
                :disabled="form.role === 'admin'"
                :class="$style.checkbox"
              />
              <span>{{ $t(`apps.${app}`) }}</span>
            </label>
          </div>
          <span v-if="form.role === 'admin'" class="muted">{{ $t('users.form.adminAllApps') }}</span>
        </div>
        <label v-if="editing && !editingSelf" class="row full" :class="$style.toggle">
          <input id="user-active" v-model="form.active" type="checkbox" :class="$style.checkbox" />
          <span>{{ $t('users.form.activeToggle') }}</span>
        </label>
      </div>
    </Modal>

    <Modal
      :show="Boolean(resetting)"
      :title="resetting ? $t('users.resetPasswordTitle', { name: resetting.name || resetting.email }) : ''"
      :saving="saving"
      @close="resetting = null"
      @submit="savePassword"
    >
      <div class="field">
        <label for="reset-password">{{ $t('users.form.newPassword') }}</label>
        <input id="reset-password" v-model="newPassword" type="password" required autocomplete="new-password" />
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal, SHELL_KEY } from '@yper/ui';
import { translateApiError } from './translateApiError.js';

const ROLES = Object.freeze(['admin', 'manager', 'employee']);
const APPS = Object.freeze(['helake', 'movix', 'yper']);
const EMPTY = Object.freeze({ name: '', email: '', password: '', role: 'employee', apps: [], active: true });

export default {
  name: 'UsersPage',
  components: { AppShell, Modal },
  inject: {
    shell: { from: SHELL_KEY },
  },
  data() {
    return {
      users: [],
      loading: true,
      saving: false,
      showForm: false,
      editing: null,
      form: { ...EMPTY, apps: [] },
      resetting: null,
      newPassword: '',
      roles: ROLES,
      apps: APPS,
      currentUser: this.shell.api.session.getUser(),
    };
  },
  computed: {
    editingSelf() {
      return Boolean(this.editing) && this.isSelf(this.editing);
    },
  },
  watch: {
    'form.role'(role) {
      if (role === 'admin') this.form.apps = [...APPS];
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    async load() {
      this.loading = true;
      try {
        const { users } = await this.shell.api.auth.users.list();
        this.users = users;
      } catch (err) {
        alert(translateApiError(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    isSelf(user) {
      return user.id === this.currentUser?.id;
    },
    appNames(apps = []) {
      return apps.map((app) => this.$t(`apps.${app}`)).join(', ');
    },
    openForm(user = null) {
      this.editing = user;
      this.form = user
        ? { name: user.name, email: user.email, password: '', role: user.role, apps: [...user.apps], active: user.active }
        : { ...EMPTY, apps: [] };
      this.showForm = true;
    },
    async save() {
      const { password, active, ...fields } = this.form;
      this.saving = true;
      try {
        if (this.editing) {
          await this.shell.api.auth.users.update(this.editing.id, { ...fields, active });
        } else {
          await this.shell.api.auth.users.create({ ...fields, password });
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(translateApiError(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    openReset(user) {
      this.newPassword = '';
      this.resetting = user;
    },
    async savePassword() {
      this.saving = true;
      try {
        await this.shell.api.auth.users.setPassword(this.resetting.id, this.newPassword);
        this.resetting = null;
      } catch (err) {
        alert(translateApiError(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(user) {
      if (!confirm(this.$t('common.confirmRemove', { name: user.name || user.email }))) return;
      try {
        await this.shell.api.auth.users.remove(user.id);
        await this.load();
      } catch (err) {
        alert(translateApiError(this.$t, err));
      }
    },
  },
};
</script>

<style module>
.you {
  margin-left: 6px;
}

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
