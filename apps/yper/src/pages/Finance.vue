<template>
  <AppShell :title="$t('finance.title')">
    <template #actions><RouterLink class="btn" to="/finance/banking">{{ $t('banking.title') }}</RouterLink><button class="btn btn-primary" :disabled="!accounts.length" @click="openEntry()">{{ $t('finance.newEntry') }}</button></template>
    <div class="finance">
      <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
      <p v-if="projection.bankPending" role="status">{{ $t('banking.pendingHint', { count: projection.bankPending }) }} <RouterLink to="/finance/banking">{{ $t('banking.reviewAction') }}</RouterLink></p>
      <div class="row tabs"><button v-for="tab in ['planning', 'accounts', 'entries', 'estimates']" :key="tab" class="btn" :class="{ 'btn-primary': view === tab }" :aria-pressed="view === tab" @click="view = tab">{{ $t(`finance.${tab}`) }}</button></div>
      <p v-if="loading" class="loading">{{ $t('common.loading') }}</p>
      <div v-else-if="!accounts.length" class="card empty"><p>{{ $t('finance.start') }}</p><button class="btn btn-primary" @click="openAccount()">{{ $t('finance.newAccount') }}</button></div>
      <template v-else>
        <section v-if="view === 'planning'" class="planning">
          <div class="card"><div class="card-body form-grid">
            <div class="field"><label for="finance-from">{{ $t('finance.from') }}</label><input id="finance-from" v-model="from" type="month" @change="loadProjection" /></div>
            <div class="field"><label for="finance-count">{{ $t('finance.horizon') }}</label><select id="finance-count" v-model.number="count" @change="loadProjection"><option v-for="n in [3,6,12]" :key="n" :value="n">{{ $t('finance.months', { n }) }}</option></select></div>
            <div class="field"><label for="finance-filter">{{ $t('finance.account') }}</label><select id="finance-filter" v-model="accountFilter" @change="loadProjection"><option value="">{{ $t('finance.consolidated') }}</option><option v-for="a in accounts" :key="a._id" :value="a._id">{{ a.name }}</option></select></div>
          </div></div>
          <p class="muted">{{ $t('finance.coverage') }}</p>
          <div class="grid"><div v-for="a in projection.accounts" :key="a._id" class="card kpi"><div class="kpi-label">{{ a.name }}{{ ' · ' }}{{ $t(`finance.${a.kind}`) }}</div><div class="kpi-value">{{ money(a.currentBalanceCents) }}</div><div class="kpi-hint">{{ $t('finance.actual') }}</div></div></div>
          <div class="card chart"><div class="card-head"><h2>{{ $t('finance.comparison') }}</h2></div><div class="card-body chart-months"><button v-for="m in projection.months" :key="m.month" class="chart-month" @click="selectedMonth = m.month"><span>{{ monthLabel(m.month) }}</span><span class="bar income" :style="{width: bar(m.incomeCents + m.reimbursementsCents)}"></span><span class="bar expense" :style="{width: bar(m.expenseCents)}"></span><small>{{ money(m.resultCents) }}</small></button></div><p class="chart-legend muted">{{ $t('finance.chartLegend') }}</p></div>
          <div class="card desktop-projection table-wrap"><table class="data comparison"><thead><tr><th>{{ $t('finance.metric') }}</th><th v-for="m in projection.months" :key="m.month"><button class="btn" @click="selectedMonth = m.month">{{ monthLabel(m.month) }}</button></th></tr></thead><tbody><tr v-for="metric in metrics" :key="metric"><th>{{ $t(`finance.${metric}`) }}</th><td v-for="m in projection.months" :key="m.month" class="num" :class="{negative: m[metric] < 0}">{{ money(m[metric]) }}</td></tr></tbody></table></div>
          <div class="mobile-projection"><details v-for="m in projection.months" :key="m.month" class="card"><summary>{{ monthLabel(m.month) }} <strong :class="{negative: m.resultCents < 0}">{{ money(m.resultCents) }}</strong></summary><div class="card-body"><dl><template v-for="metric in metrics" :key="metric"><dt>{{ $t(`finance.${metric}`) }}</dt><dd>{{ money(m[metric]) }}</dd></template></dl><button class="btn" @click="selectedMonth = m.month">{{ $t('finance.details') }}</button></div></details></div>
          <section v-if="selected" class="card"><div class="card-head"><h2>{{ monthLabel(selected.month) }}{{ ' — ' }}{{ $t('finance.details') }}</h2></div><div class="card-body"><div class="row groups"><span v-for="(amount, group) in selected.groups" :key="group" class="badge">{{ $t(`finance.${group}`) }}{{ ': ' }}{{ money(amount) }}</span></div><p v-if="!selected.details.length" class="muted">{{ $t('finance.noEntries') }}</p><article v-for="item in selected.details" :key="item.id" class="entry-row"><div><strong>{{ item.description }}</strong><div class="muted">{{ accountName(item.account) }}<span v-if="item.toAccount">{{ ' → ' }}{{ accountName(item.toAccount) }}</span>{{ ' · ' }}{{ $t(`finance.${item.type}`) }}{{ ' · ' }}{{ item.creditor || item.category }}</div><small>{{ item.cashDate }}{{ ' · ' }}{{ $t(`finance.${item.status}`) }}<span v-if="item.installment">{{ ' · ' }}{{ item.installment }}{{ '/' }}{{ item.totalInstallments }}</span><span v-if="item.overdue">{{ ' · ' }}{{ $t('finance.overdue') }}</span></small></div><strong>{{ money(item.amountCents) }}</strong><button v-if="item.entryId" class="btn" @click="openOccurrence(item.entryId, item.month)">{{ $t('finance.status') }}</button></article></div></section>
        </section>
        <section v-if="view === 'accounts'" class="card"><div class="card-head"><h2>{{ $t('finance.accounts') }}</h2><button class="btn" @click="openAccount()">{{ $t('finance.newAccount') }}</button></div><div class="card-body"><p class="muted">{{ $t('finance.openingHint') }}</p><article v-for="a in accounts" :key="a._id" class="entry-row"><div><strong>{{ a.name }}</strong><div>{{ $t(`finance.${a.kind}`) }}{{ ' · ' }}{{ a.openingDate }}</div></div><span>{{ money(a.openingBalanceCents) }}</span><div class="row"><button class="btn" @click="openAccount(a)">{{ $t('common.edit') }}</button><button class="btn" @click="remove('accounts', a)">{{ $t('common.remove') }}</button></div></article></div></section>
        <section v-if="view === 'entries'" class="card"><div class="card-head"><h2>{{ $t('finance.entries') }}</h2><button class="btn" @click="openEntry()">{{ $t('finance.newEntry') }}</button></div><div class="card-body"><p class="muted">{{ $t('finance.cardHint') }}</p><p v-if="!entries.length">{{ $t('finance.noEntries') }}</p><article v-for="e in entries" :key="e._id" class="entry-row"><div><strong>{{ e.description }}</strong><div class="muted">{{ e.date }}{{ ' · ' }}{{ $t(`finance.${e.type}`) }}{{ ' · ' }}{{ $t(`finance.${e.repeat}`) }}</div><small>{{ e.creditor || e.category }}<span v-if="e.repeat === 'installments'">{{ ' · ' }}{{ e.installment }}{{ '/' }}{{ e.totalInstallments }}</span></small></div><strong>{{ money(e.amountCents) }}</strong><div class="row"><button class="btn" @click="openOccurrence(e._id, e.date.slice(0,7))">{{ $t('finance.status') }}</button><button class="btn" @click="openEntry(e)">{{ $t('common.edit') }}</button><button class="btn" @click="remove('entries', e)">{{ $t('common.remove') }}</button></div></article></div></section>
        <section v-if="view === 'estimates'" class="card"><div class="card-head"><h2>{{ $t('finance.estimates') }}</h2><button class="btn" @click="openEstimate()">{{ $t('finance.newEstimate') }}</button></div><div class="card-body"><p>{{ $t('finance.estimateHint') }}</p><article v-for="e in estimates" :key="e._id" class="entry-row"><div><strong>{{ e.category }}</strong><div>{{ monthLabel(e.month) }}{{ ' · ' }}{{ accountName(e.account) }}</div></div><span>{{ money(e.amountCents) }}</span><div class="row"><button class="btn" @click="openEstimate(e)">{{ $t('common.edit') }}</button><button class="btn" @click="remove('estimates', e)">{{ $t('common.remove') }}</button></div></article></div></section>
      </template>
    </div>
    <Modal :show="Boolean(modal)" :title="$t(`finance.${modal || 'title'}`)" :saving="saving" @close="modal = ''" @submit="save">
      <p v-if="formError" class="alert alert-danger" role="alert">{{ formError }}</p>
      <div class="form-grid">
        <template v-if="modal === 'accounts'">
          <div class="field full"><label for="fa-name">{{ $t('finance.name') }}</label><input id="fa-name" v-model="form.name" required maxlength="160" /></div>
          <div class="field"><label for="fa-kind">{{ $t('finance.kind') }}</label><select id="fa-kind" v-model="form.kind"><option value="operational">{{ $t('finance.operational') }}</option><option value="reserve">{{ $t('finance.reserve') }}</option></select></div>
          <div class="field"><label for="fa-date">{{ $t('finance.openingDate') }}</label><input id="fa-date" v-model="form.openingDate" type="date" required /></div>
          <div class="field"><label for="fa-balance">{{ $t('finance.openingBalance') }}</label><input id="fa-balance" v-model="form.amount" inputmode="decimal" /></div><p class="muted full">{{ $t('finance.openingHint') }}</p>
        </template>
        <template v-if="modal === 'entries'">
          <div class="field full"><label for="fe-description">{{ $t('finance.description') }}</label><input id="fe-description" v-model="form.description" required maxlength="160" /></div>
          <div class="field"><label for="fe-type">{{ $t('finance.kind') }}</label><select id="fe-type" v-model="form.type"><option v-for="type in ['expense','income','transfer','reimbursement']" :key="type" :value="type">{{ $t(`finance.${type}`) }}</option></select></div>
          <div class="field"><label for="fe-date">{{ $t('finance.dueDate') }}</label><input id="fe-date" v-model="form.date" type="date" required /></div>
          <div class="field"><label for="fe-repeat">{{ $t('finance.repeat') }}</label><select id="fe-repeat" v-model="form.repeat"><option v-for="r in ['once','monthly','installments']" :key="r" :value="r">{{ $t(`finance.${r}`) }}</option></select></div>
          <template v-if="form.repeat === 'installments'"><div class="field"><label for="fe-p">{{ $t('finance.installment') }}</label><input id="fe-p" v-model.number="form.installment" type="number" min="1" max="600" required /></div><div class="field"><label for="fe-t">{{ $t('finance.totalInstallments') }}</label><input id="fe-t" v-model.number="form.totalInstallments" type="number" :min="form.installment" max="600" required /></div></template>
          <div v-if="form.repeat === 'monthly'" class="field"><label for="fe-end">{{ $t('finance.endDate') }}</label><input id="fe-end" v-model="form.endDate" type="date" :min="form.date" /></div>
          <div v-if="form.type === 'expense'" class="field"><label for="fe-group">{{ $t('finance.group') }}</label><select id="fe-group" v-model="form.group"><option v-for="g in ['direct','card','financing']" :key="g" :value="g">{{ $t(`finance.${g}`) }}</option></select></div>
          <div v-if="form.type === 'expense' && form.group !== 'direct'" class="field"><label for="fe-creditor">{{ $t('finance.creditor') }}</label><input id="fe-creditor" v-model="form.creditor" required maxlength="160" /></div>
          <div class="field"><label for="fe-person">{{ $t('finance.counterpart') }}</label><input id="fe-person" v-model="form.counterpart" maxlength="160" /></div>
          <div v-if="form.type === 'transfer'" class="field"><label for="fe-to">{{ $t('finance.toAccount') }}</label><select id="fe-to" v-model="form.toAccount" required><option v-for="a in accounts.filter(a => a._id !== form.account)" :key="a._id" :value="a._id">{{ a.name }}</option></select></div>
        </template>
        <template v-if="['entries','estimates'].includes(modal)">
          <div class="field"><label for="ff-account">{{ $t('finance.account') }}</label><select id="ff-account" v-model="form.account" required><option v-for="a in accounts" :key="a._id" :value="a._id">{{ a.name }}</option></select></div>
          <div class="field"><label for="ff-amount">{{ $t('finance.amount') }}</label><input id="ff-amount" v-model="form.amount" inputmode="decimal" required /></div>
          <div v-if="modal === 'estimates' || form.type !== 'transfer'" class="field"><label for="ff-category">{{ $t('finance.category') }}</label><input id="ff-category" v-model="form.category" list="finance-categories" :required="modal === 'estimates' || form.type === 'expense'" maxlength="160" /><datalist id="finance-categories"><option v-for="category in categories" :key="category" :value="category" /></datalist></div>
        </template>
        <div v-if="['estimates','status'].includes(modal)" class="field"><label for="ff-month">{{ $t('finance.month') }}</label><input id="ff-month" v-model="form.month" type="month" required @change="modal === 'status' && occurrenceState()" /></div>
        <template v-if="modal === 'status'"><div class="field"><label for="fs-status">{{ $t('finance.status') }}</label><select id="fs-status" v-model="form.status"><option v-for="s in ['planned','paid','cancelled']" :key="s" :value="s">{{ $t(`finance.${s}`) }}</option></select></div><div v-if="form.status === 'paid'" class="field"><label for="fs-date">{{ $t('finance.paidDate') }}</label><input id="fs-date" v-model="form.paidDate" type="date" required /></div></template>
      </div>
      <p v-if="modal === 'entries'" class="muted">{{ $t('finance.entryHint') }}</p>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { currency, toDateInput, errorMessage } from '@yper/i18n';
import { moneyToCents, centsInput } from '../finance.js';

const resources = {
  accounts: {
    create: data => api.post('/finance/accounts', data),
    update: data => api.put(`/finance/accounts/${data._id}`, data),
    remove: item => api.del(`/finance/accounts/${item._id}?revision=${item.revision}`),
  },
  entries: {
    create: data => api.post('/finance/entries', data),
    update: data => api.put(`/finance/entries/${data._id}`, data),
    remove: item => api.del(`/finance/entries/${item._id}?revision=${item.revision}`),
  },
  estimates: {
    create: data => api.post('/finance/estimates', data),
    update: data => api.put(`/finance/estimates/${data._id}`, data),
    remove: item => api.del(`/finance/estimates/${item._id}?revision=${item.revision}`),
  },
};

export default {
  components: { AppShell, Modal },
  data: () => ({ view: 'planning', loading: true, saving: false, error: '', formError: '', modal: '', form: {},
    accounts: [], entries: [], estimates: [], projection: { months: [], accounts: [] }, from: toDateInput().slice(0,7), count: 12,
    accountFilter: '', selectedMonth: toDateInput().slice(0,7), requestId: 0,
    metrics: ['incomeCents','reimbursementsCents','expenseCents','paidExpenseCents','estimateCents','overdueCents','transferCents','resultCents','operationalCents','reserveCents','balanceCents'] }),
  computed: {
    selected() { return this.projection.months.find(m => m.month === this.selectedMonth); },
    categories() { return [...new Set([...this.entries.map(e => e.category), ...this.estimates.map(e => e.category)].filter(Boolean))].sort(); },
  },
  async mounted() { await this.load(); },
  methods: {
    money(value) { return value == null ? this.$t('finance.unknown') : currency(value / 100); },
    monthLabel(value) { return new Intl.DateTimeFormat(this.$i18n.locale, { month: 'short', year: 'numeric', timeZone: 'UTC' }).format(new Date(`${value}-15T12:00:00Z`)); },
    accountName(id) { return this.accounts.find(a => a._id === id)?.name || ''; },
    bar(value) { const max = Math.max(1, ...this.projection.months.flatMap(m => [m.incomeCents + m.reimbursementsCents, m.expenseCents])); return `${value / max * 100}%`; },
    async load() {
      this.loading = true; this.error = '';
      try {
        const [a,e,b] = await Promise.all([api.get('/finance/accounts'), api.get('/finance/entries'), api.get('/finance/estimates')]);
        this.accounts = a.accounts; this.entries = e.entries; this.estimates = b.estimates;
        if (!this.accounts.some(a => a._id === this.accountFilter)) this.accountFilter = '';
        await this.loadProjection();
      } catch (err) { this.error = errorMessage(this.$t, err); }
      finally { this.loading = false; }
    },
    async loadProjection() {
      if (!this.from) return;
      const request = ++this.requestId;
      this.error = '';
      try {
        const params = new URLSearchParams({ from: this.from, count: String(this.count), today: toDateInput() });
        if (this.accountFilter) params.set('account', this.accountFilter);
        const data = await api.get(`/finance/projection?${params}`);
        if (request !== this.requestId) return;
        this.projection = data;
        if (!data.months.some(m => m.month === this.selectedMonth)) this.selectedMonth = this.from;
      } catch (err) { if (request === this.requestId) this.error = errorMessage(this.$t, err); }
    },
    show(modal, form) { this.form = form; this.formError = ''; this.modal = modal; },
    openAccount(a) { this.show('accounts', a ? { ...a, amount: centsInput(a.openingBalanceCents) } : { name: '', kind: 'operational', openingDate: toDateInput(), amount: '' }); },
    openEntry(e) { this.show('entries', e ? { ...e, amount: centsInput(e.amountCents) } : { description: '', type: 'expense', date: toDateInput(), repeat: 'once', installment: 1, totalInstallments: 1, endDate: '', account: this.accounts[0]?._id || '', toAccount: '', category: '', counterpart: '', group: 'direct', creditor: '', amount: '' }); },
    openEstimate(e) { this.show('estimates', e ? { ...e, amount: centsInput(e.amountCents) } : { month: this.from, category: '', account: this.accounts[0]?._id || '', amount: '' }); },
    openOccurrence(id, month) { const e = this.entries.find(e => e._id === id); this.show('status', { _id: id, revision: e.revision, month, status: 'planned', paidDate: toDateInput() }); this.occurrenceState(); },
    occurrenceState() { const state = this.entries.find(e => e._id === this.form._id)?.overrides.find(o => o.month === this.form.month); this.form.status = state?.status || 'planned'; this.form.paidDate = state?.paidDate || toDateInput(); },
    async save() {
      this.saving = true; this.formError = '';
      try {
        const payload = { ...this.form };
        if (this.modal === 'accounts') payload.openingBalanceCents = payload.amount.trim() === '' ? null : moneyToCents(payload.amount);
        else if (this.modal !== 'status') payload.amountCents = moneyToCents(payload.amount);
        if (this.modal === 'status') await api.put(`/finance/entries/${payload._id}/occurrences/${payload.month}`, { status: payload.status, paidDate: payload.paidDate, revision: payload.revision });
        else if (payload._id) await resources[this.modal].update(payload);
        else await resources[this.modal].create(payload);
        this.modal = ''; await this.load();
      } catch (err) { this.formError = err.message === 'Invalid money' ? this.$t('finance.invalidMoney') : errorMessage(this.$t, err); }
      finally { this.saving = false; }
    },
    async remove(resource, item) {
      if (!confirm(this.$t('common.confirmRemove', { name: item.name || item.description || item.category }))) return;
      try { await resources[resource].remove(item); await this.load(); }
      catch (err) { this.error = errorMessage(this.$t, err); }
    },
  },
};
</script>

<style scoped>
.finance, .planning { display: grid; gap: 18px; min-width: 0; }
.tabs, .groups, .entry-row .row { flex-wrap: wrap; gap: 8px; }
.entry-row { display: flex; align-items: center; flex-wrap: wrap; gap: 14px; padding: 14px 0; border-bottom: 1px solid var(--border); }
.entry-row > div:first-child { flex: 1 1 220px; min-width: 0; overflow-wrap: anywhere; }
.entry-row:last-child { border-bottom: 0; }
.comparison { width: max-content; min-width: 100%; }
.comparison th:first-child { position: sticky; left: 0; z-index: 1; background: var(--surface, #16202f); min-width: 170px; }
.comparison td { min-width: 155px; }
.negative { color: var(--danger, #e95c68); }
.chart-months { display: grid; grid-template-columns: repeat(auto-fit, minmax(min(100%, 100px), 1fr)); gap: 14px; }
.chart-month { display: grid; gap: 6px; border: 0; background: none; color: inherit; font: inherit; cursor: pointer; text-align: left; min-height: 90px; }
.bar { display: block; height: 10px; border-radius: 3px; }
.income { background: #059669; }.expense { background: #ef8b45; }
.chart-legend { padding: 0 20px 14px; margin: 0; }
.mobile-projection { display: none; }
@media (max-width: 760px) {
  .desktop-projection { display: none; }.mobile-projection { display: grid; gap: 12px; }
  summary { display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px; padding: 16px; min-height: 48px; cursor: pointer; }
  dl { display: grid; grid-template-columns: minmax(0, 1fr) auto; gap: 10px; } dd { margin: 0; text-align: right; }
  .entry-row > .row { width: 100%; }.entry-row .btn { flex: 1; }
  .chart-months { grid-template-columns: repeat(3, minmax(0, 1fr)); }.chart-month small { overflow-wrap: anywhere; }
}
</style>
