<template>
  <AppShell :title="$t('banking.title')">
    <template #actions><RouterLink class="btn" to="/finance">{{ $t('finance.planning') }}</RouterLink></template>
    <div class="banking">
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <p v-if="loading">{{ $t('common.loading') }}</p>
      <template v-else>
        <section class="card"><div class="card-body">
          <h2>{{ $t('banking.pilot') }}</h2><p>{{ $t('banking.intro') }}</p>
          <p v-if="!data.configured" role="status">{{ $t('banking.setup') }}</p>
          <button v-else class="btn btn-primary" :disabled="busy" @click="discover">{{ $t('banking.discover') }}</button>
          <button v-if="data.configured && data.links.some(c => c.active)" class="btn btn-primary" :disabled="busy" @click="syncAll">{{ $t('banking.syncAll') }}</button>
          <p v-if="syncMessage" role="status">{{ syncMessage }}</p>
          <p class="muted">{{ $t('banking.refreshHint') }}</p>
          <form v-for="external in available" :key="external.externalId" class="link-form" @submit.prevent="link(external)">
            <label :for="`account-${external.externalId}`">{{ external.name }}</label>
            <p v-if="external.kind === 'card'" class="muted">{{ $t('banking.cardHint') }}</p>
            <select v-else :id="`account-${external.externalId}`" v-model="accountChoices[external.externalId]" required>
              <option value="">{{ $t('banking.chooseAccount') }}</option>
              <option v-for="a in accounts.filter(a => a.kind !== 'card')" :key="a._id" :value="a._id">{{ a.name }}</option>
            </select><button class="btn" :disabled="busy">{{ $t(external.kind === 'card' ? 'banking.linkCard' : 'banking.linkAccount') }}</button>
          </form>
          <p v-if="discovered && !available.length">{{ $t('banking.noAvailable') }}</p>
          <p v-if="discovered && !accounts.length"><RouterLink to="/finance">{{ $t('banking.createAccount') }}</RouterLink></p>
        </div></section>
        <div class="connections">
          <article v-for="connection in data.links" :key="connection._id" class="card"><div class="card-body">
            <h2>{{ connection.name }}</h2><p>{{ accountName(connection.account) }}{{ ' · ' }}{{ $t(connection.active ? 'banking.active' : 'banking.paused') }}</p>
            <p>{{ $t('banking.lastSuccess') }}{{ ': ' }}{{ timestamp(connection.lastSuccess) }}</p>
            <p v-if="connection.error" class="alert alert-danger">{{ $t('banking.syncFailed') }}</p>
            <p>{{ $t('banking.reportedBalance') }}{{ ': ' }}<strong>{{ money(connection.balanceCents) }}</strong></p>
            <small>{{ $t('banking.sourceDate') }}{{ ': ' }}{{ timestamp(connection.balanceAt) }}{{ ' · ' }}{{ $t('banking.unverified') }}</small>
            <div class="actions"><button class="btn btn-primary" :disabled="busy || !data.configured || !connection.active" @click="sync(connection)">{{ $t('banking.sync') }}</button>
              <button class="btn" :disabled="busy" @click="toggle(connection)">{{ $t(connection.active ? 'banking.pause' : 'banking.resume') }}</button></div>
          </div></article>
        </div>
        <section class="card"><div class="card-body">
          <h2>{{ $t('banking.movements') }}</h2><p role="status">{{ $t('banking.pendingHint', { count: data.pending }) }}</p>
          <p>{{ $t('banking.uncategorizedHint', { count: data.uncategorized || 0 }) }}</p>
          <div class="actions"><button v-for="s in states" :key="s" class="btn" :class="{'btn-primary': state === s}" :disabled="busy" :aria-pressed="state === s" @click="setState(s)">{{ $t(`banking.${s}`) }}</button></div>
          <div v-if="categorizeable.length" class="actions"><label class="remember"><input type="checkbox" :checked="categorizeable.every(r => selection.includes(r._id))" :disabled="busy" @change="selection = $event.target.checked ? categorizeable.map(r => r._id) : []" />{{ $t('banking.selectPage') }}</label><button class="btn" :disabled="busy || !selection.length" @click="openCategories(rows.filter(r => selection.includes(r._id)))">{{ $t('banking.categorizeSelected', { count: selection.length }) }}</button></div>
          <p v-if="!rows.length">{{ $t('banking.empty') }}</p>
          <article v-for="row in rows" :key="row._id" class="movement">
            <label v-if="canCategorize(row)" class="movement-select"><input v-model="selection" type="checkbox" :value="row._id" :disabled="busy" :aria-label="$t('banking.selectMovement', { name: row.description })" /></label>
            <div><strong>{{ row.description }}</strong><p>{{ row.date }}{{ ' · ' }}{{ accountName(row.account) }}</p>
              <p>{{ row.category || $t('banking.uncategorized') }} <small v-if="row.categorySource === 'rule'">{{ '· ' }}{{ $t('banking.automatic') }}</small></p>
              <small v-if="row.bankStatus !== 'POSTED'">{{ $t('banking.bankPending') }}</small>
              <small v-if="row.state === 'changed'">{{ $t('banking.changedHint') }}</small>
              <small v-if="row.state === 'review' && row.reviewReason">{{ $t(`banking.reason_${row.reviewReason}`) }}</small>
            </div><strong>{{ row.direction === 'expense' ? '−' : '+' }}{{ money(row.amountCents) }}</strong>
            <button v-if="row.state === 'review'" class="btn" :disabled="busy || row.bankStatus !== 'POSTED'" @click="openReview(row)">{{ $t('banking.reviewAction') }}</button>
            <template v-else><button v-if="canCategorize(row)" class="btn" :disabled="busy" @click="openCategories([row])">{{ $t('banking.categorize') }}</button><button class="btn" :disabled="busy" @click="undo(row)">{{ $t('banking.undo') }}</button></template>
          </article>
          <div class="actions"><button class="btn" :disabled="busy || page === 1" @click="changePage(-1)">{{ $t('banking.previous') }}</button><span>{{ page }}{{ ' / ' }}{{ Math.max(1, Math.ceil(total / 30)) }}</span><button class="btn" :disabled="busy || page * 30 >= total" @click="changePage(1)">{{ $t('banking.next') }}</button></div>
        </div></section>
        <section class="card"><div class="card-body"><h2>{{ $t('banking.rules') }}</h2><p>{{ $t('banking.rulesHint') }}</p>
          <article v-for="rule in data.rules.filter(r => r.active)" :key="rule._id" class="movement"><div><strong>{{ rule.pattern }}{{ ' → ' }}{{ rule.category }}</strong><p>{{ rule.scope === '*' ? $t('banking.allAccounts') : accountName(rule.scope) }}{{ ' · ' }}{{ rule.since }}</p></div><button class="btn" :disabled="busy" @click="disableRule(rule)">{{ $t('banking.disableRule') }}</button></article>
        </div></section>
      </template>
    </div>
    <Modal :show="Boolean(selected)" :title="$t('banking.reviewAction')" :saving="busy" @close="!busy && (selected = null)" @submit="decide">
      <template v-if="selected">
        <p v-if="formError" class="alert alert-danger" role="alert">{{ formError }}</p>
        <p><strong>{{ selected.description }}</strong>{{ ' · ' }}{{ money(selected.amountCents) }}{{ ' · ' }}{{ selected.date }}</p>
        <p>{{ $t('banking.reviewHint') }}</p>
        <p v-if="candidates.similar.length" role="status">{{ $t('banking.similarHint', { count: candidates.similar.length }) }}</p>
        <ul v-if="candidates.similar.length"><li v-for="s in candidates.similar" :key="s._id">{{ s.date }}{{ ' · ' }}{{ s.description }}{{ ' · ' }}{{ money(s.amountCents) }}{{ ' · ' }}{{ $t(`banking.${s.state}`) }}</li></ul>
        <div class="field"><label for="bank-action">{{ $t('banking.action') }}</label><select id="bank-action" v-model="form.action"><option value="new">{{ $t('banking.new') }}</option><option v-if="candidates.manual.length" value="link">{{ $t('banking.link') }}</option><option v-if="candidates.transfers.length" value="transfer">{{ $t('banking.transfer') }}</option><option value="ignore">{{ $t('banking.ignore') }}</option></select></div>
        <template v-if="form.action === 'new'">
          <div class="field"><label for="bank-category">{{ $t('finance.category') }}</label><input id="bank-category" v-model="form.category" required maxlength="160" /></div>
          <label v-if="selected.canRemember" class="remember"><input v-model="form.remember" type="checkbox" />{{ $t('banking.remember') }}</label>
          <div v-if="form.remember" class="field"><label for="bank-scope">{{ $t('banking.scope') }}</label><select id="bank-scope" v-model="form.scope"><option value="account">{{ $t('banking.thisAccount') }}</option><option value="all">{{ $t('banking.allAccounts') }}</option></select></div>
          <label class="remember"><input v-model="form.confirmNew" type="checkbox" required />{{ $t('banking.confirmNew') }}</label>
        </template>
        <div v-if="form.action === 'link'" class="field"><label for="bank-match">{{ $t('banking.link') }}</label><select id="bank-match" v-model="form.match" required><option value="">{{ $t('banking.choose') }}</option><option v-for="m in candidates.manual" :key="m.id" :value="m.id">{{ m.dueDate }}{{ ' · ' }}{{ m.description }}{{ ' · ' }}{{ money(m.amountCents) }}</option></select></div>
        <div v-if="form.action === 'transfer'" class="field"><label for="bank-peer">{{ $t('banking.transfer') }}</label><select id="bank-peer" v-model="form.peer" required><option value="">{{ $t('banking.choose') }}</option><option v-for="m in candidates.transfers" :key="m._id" :value="m._id" :disabled="m.date !== selected.date">{{ accountName(m.account) }}{{ ' · ' }}{{ m.date }}{{ ' · ' }}{{ money(m.amountCents) }}</option></select><p>{{ $t('banking.transferHint') }}</p></div>
        <div v-if="form.action === 'ignore'" class="field"><label for="bank-reason">{{ $t('banking.reason') }}</label><input id="bank-reason" v-model="form.reason" required maxlength="160" /></div>
      </template>
    </Modal>
    <Modal :show="Boolean(categoryRows.length)" :title="$t('banking.categorizeSelected', { count: categoryRows.length })" :saving="busy" @close="!busy && (categoryRows = [])" @submit="saveCategories">
      <p v-if="formError" class="alert alert-danger" role="alert">{{ formError }}</p>
      <p>{{ $t('banking.categoryOnly') }}</p>
      <div class="field"><label for="bulk-category">{{ $t('finance.category') }}</label><input id="bulk-category" v-model="categoryForm.category" required maxlength="160" /></div>
      <label v-if="categoryRows.every(r => r.canRemember)" class="remember"><input v-model="categoryForm.remember" type="checkbox" />{{ $t('banking.remember') }}</label>
      <div v-if="categoryForm.remember" class="field"><label for="bulk-scope">{{ $t('banking.scope') }}</label><select id="bulk-scope" v-model="categoryForm.scope"><option value="account">{{ $t('banking.thisAccount') }}</option><option value="all">{{ $t('banking.allAccounts') }}</option></select></div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { currency, errorMessage } from '@yper/i18n';
import { api } from '../api.js';
export default {
  components: { AppShell, Modal },
  data: () => ({ loading: true, busy: false, error: '', formError: '', data: { links: [], rules: [], pending: 0 }, accounts: [], available: [], discovered: false, accountChoices: {},
    rows: [], total: 0, page: 1, state: 'accepted', states: ['accepted', 'uncategorized', 'review', 'changed', 'ignored'], selection: [], categoryRows: [], categoryForm: {}, syncMessage: '', selected: null, form: {}, candidates: { manual: [], similar: [], transfers: [] } }),
  computed: { categorizeable() { return this.rows.filter(this.canCategorize); } },
  async mounted() { await this.load(); },
  methods: {
    canCategorize(row) { return row.state === 'accepted' && ['new', 'auto'].includes(row.decision); },
    openCategories(rows) { this.categoryRows = rows; this.formError = ''; this.categoryForm = { category: rows.length === 1 ? rows[0].category : '', remember: false, scope: 'account' }; },
    async saveCategories() {
      if (this.busy) return; this.busy = true; this.formError = '';
      try { await api.post('/finance/banking/categorize', { ...this.categoryForm, items: this.categoryRows.map(r => ({ id: r._id, revision: r.revision })) });
        this.categoryRows = []; this.selection = []; await this.load();
      } catch (e) { this.formError = errorMessage(this.$t, e); } finally { this.busy = false; }
    },
    money(value) { return value == null ? this.$t('finance.unknown') : currency(value / 100); },
    timestamp(value) { return value ? new Date(value).toLocaleString(this.$i18n.locale) : this.$t('finance.unknown'); },
    accountName(id) { return this.accounts.find(a => a._id === id)?.name || ''; },
    async load() {
      try { const [data, accounts, list] = await Promise.all([api.get('/finance/banking'), api.get('/finance/accounts'), api.get(`/finance/banking/movements?state=${this.state}&page=${this.page}`)]);
        this.data = data; this.accounts = accounts.accounts; this.rows = list.rows; this.total = list.total;
      } catch (e) { this.error = errorMessage(this.$t, e); } finally { this.loading = false; }
    },
    async run(work) { if (this.busy) return; this.busy = true; this.error = ''; try { await work(); await this.load(); } catch (e) { this.error = errorMessage(this.$t, e); } finally { this.busy = false; } },
    async discover() { await this.run(async () => { this.available = (await api.post('/finance/banking/discover', {})).accounts; this.discovered = true; }); },
    async link(external) { await this.run(async () => { await api.post('/finance/banking/links', external.kind === 'card' ? { externalId: external.externalId } : { externalId: external.externalId, account: this.accountChoices[external.externalId] }); this.available = this.available.filter(a => a.externalId !== external.externalId); }); },
    async sync(c) { await this.run(async () => { const result = await api.post(`/finance/banking/links/${c._id}/sync`, {}); this.syncMessage = this.$t('banking.syncSummary', { imported: result.imported || 0, updated: result.updated || 0, transfers: result.transfers || 0 }); }); },
    async syncAll() { await this.run(async () => { const { results } = await api.post('/finance/banking/sync', {});
      this.syncMessage = this.$t('banking.syncSummary', { imported: results.reduce((s, r) => s + (r.imported || 0), 0), updated: results.reduce((s, r) => s + (r.updated || 0), 0), transfers: results.reduce((s, r) => s + (r.transfers || 0), 0) });
      if (results.some(r => r.status !== 'ok')) this.syncMessage += ' ' + this.$t('banking.syncPartial');
    }); },
    async toggle(c) { await this.run(() => api.put(`/finance/banking/links/${c._id}`, { active: !c.active })); },
    async setState(state) { this.state = state; this.page = 1; this.selection = []; await this.run(async () => {}); },
    async changePage(delta) { this.page += delta; this.selection = []; await this.run(async () => {}); },
    async openReview(row) {
      await this.run(async () => {
        this.candidates = await api.get(`/finance/banking/movements/${row._id}/candidates`);
        this.form = { action: 'new', category: row.category || '', remember: false, scope: 'account', peer: '', match: '', reason: '', confirmNew: false };
        this.formError = ''; this.selected = row;
      });
    },
    async decide() {
      if (this.busy || !this.selected) return;
      if (this.form.action === 'new' && !this.form.confirmNew) { this.formError = this.$t('banking.confirmNew'); return; }
      this.busy = true; this.formError = '';
      try {
        const payload = { ...this.form, revision: this.selected.revision };
        if (payload.action === 'link') { const match = this.candidates.manual.find(m => m.id === payload.match); payload.entry = match?.entryId; payload.month = match?.month; }
        await api.post(`/finance/banking/movements/${this.selected._id}/decision`, payload);
        this.selected = null; await this.load();
      } catch (e) { this.formError = errorMessage(this.$t, e); } finally { this.busy = false; }
    },
    async undo(row) { if (!confirm(this.$t('banking.undoConfirm'))) return; await this.run(() => api.post(`/finance/banking/movements/${row._id}/decision`, { action: 'undo', revision: row.revision })); },
    async disableRule(rule) { await this.run(() => api.put(`/finance/banking/rules/${rule._id}`, {})); },
  },
};
</script>

<style scoped>
.banking { display: grid; gap: 18px; min-width: 0; }
.connections { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 280px), 1fr)); gap: 14px; }
.actions { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 14px; }
.movement { display: flex; flex-wrap: wrap; align-items: center; gap: 14px; padding: 18px 0; border-bottom: 1px solid var(--border); }
.movement > div { flex: 1 1 250px; min-width: 0; overflow-wrap: anywhere; }
.movement p { margin: 5px 0; }.card h2 { font-size: 1.1rem; }.card-body { overflow-wrap: anywhere; }
.link-form { display: grid; grid-template-columns: minmax(0, 1fr) minmax(0, 1fr) auto; align-items: center; gap: 12px; padding: 12px 0; }
.remember { display: flex; align-items: start; gap: 10px; margin: 16px 0; }.remember input { flex: 0 0 auto; width: auto; }
.movement-select { flex: 0 0 44px; min-height: 44px; display: grid; place-items: center; cursor: pointer; }
.movement-select input[type="checkbox"] { width: 20px; height: 20px; min-height: 20px; padding: 0; }
@media (max-width: 640px) { .link-form { grid-template-columns: minmax(0, 1fr); }.movement .btn { width: 100%; }.actions .btn { flex: 1; } input, select { font-size: 16px; min-height: 44px; } }
</style>
