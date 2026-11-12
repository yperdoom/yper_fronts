<template>
  <section class="month-view">
    <div class="card"><div class="card-body form-grid">
      <div class="field"><label for="month-pick">{{ $t('finance.month') }}</label><input id="month-pick" v-model="month" type="month" @change="load" /></div>
    </div></div>
    <p v-if="error" class="alert alert-danger" role="alert">{{ error }}</p>
    <p v-if="loading" class="loading">{{ $t('common.loading') }}</p>
    <template v-else-if="current">
      <div class="grid month-summary">
        <div class="card kpi"><div class="kpi-label">{{ $t('finance.monthStart') }}</div><div class="kpi-value">{{ money(startBalance) }}</div></div>
        <div class="card kpi"><div class="kpi-label">{{ $t('finance.incomeCents') }}</div><div class="kpi-value">{{ money(income) }}</div></div>
        <div class="card kpi"><div class="kpi-label">{{ $t('finance.expenseCents') }}</div><div class="kpi-value">{{ money(current.expenseCents) }}</div></div>
        <div class="card kpi"><div class="kpi-label">{{ $t('finance.resultCents') }}</div><div class="kpi-value" :class="{ negative: current.resultCents < 0 }">{{ money(current.resultCents) }}</div>
          <div class="kpi-hint">{{ $t('finance.spentShare', { value: spentShare }) }}</div></div>
      </div>
      <section class="card month-account"><div class="card-head"><h2>{{ $t('finance.monthAccount') }}</h2></div><div class="card-body table-wrap">
        <p v-if="!accountItems.length" class="muted">{{ $t('finance.noEntries') }}</p>
        <table v-else class="data"><tbody>
          <tr v-for="item in accountItems" :key="item.id"><td>{{ item.description }}<small class="muted">{{ ' · ' }}{{ accountName(item.account) }}</small></td><td>{{ item.category || $t('banking.uncategorized') }}</td><td>{{ item.cashDate }}</td>
            <td class="num" :class="{ negative: item.type === 'expense' }">{{ money(item.type === 'expense' ? -item.amountCents : item.amountCents) }}</td></tr>
        </tbody></table>
      </div></section>
      <section v-for="card in cards" :key="card.id" class="card month-card"><div class="card-head"><h2>{{ card.name }}</h2>
        <span class="muted">{{ $t('finance.billDates', { closing: card.bill.closingDate, due: card.bill.dueDate || '—' }) }}</span></div>
        <div class="card-body table-wrap">
          <p v-if="!card.items.length" class="muted">{{ $t('finance.noEntries') }}</p>
          <table v-else class="data">
            <thead><tr><th>{{ $t('finance.description') }}</th><th>{{ $t('finance.category') }}</th><th>{{ $t('finance.date') }}</th><th>{{ $t('finance.installmentShort') }}</th><th class="num">{{ $t('finance.value') }}</th><th class="num">{{ $t('finance.remaining') }}</th></tr></thead>
            <tbody><tr v-for="item in card.items" :key="item.id"><td>{{ item.description }}</td><td>{{ item.category || $t('banking.uncategorized') }}</td><td>{{ item.date }}</td>
              <td>{{ item.installmentNumber ? `${item.installmentNumber}/${item.totalInstallments}` : '—' }}</td><td class="num">{{ money(item.amountCents) }}</td><td class="num">{{ item.remainingCents ? money(item.remainingCents) : '—' }}</td></tr></tbody>
            <tfoot><tr><th colspan="4">{{ $t('finance.billTotal') }}</th><th class="num">{{ money(card.bill.totalCents) }}</th><th class="num">{{ money(card.items.reduce((sum, i) => sum + i.remainingCents, 0)) }}</th></tr></tfoot>
          </table>
        </div></section>
    </template>
  </section>
</template>

<script>
import { api } from '@/api';
import { currency, toDateInput, errorMessage } from '@yper/i18n';

const previousMonth = month => {
  const [year, number] = month.split('-').map(Number);
  return number === 1 ? `${year - 1}-12` : `${year}-${String(number - 1).padStart(2, '0')}`;
};

export default {
  props: { accounts: { type: Array, required: true } },
  data: () => ({ month: toDateInput().slice(0, 7), loading: true, error: '', months: [], cards: [] }),
  computed: {
    current() { return this.months.find(m => m.month === this.month); },
    cardIds() { return this.accounts.filter(a => a.kind === 'card').map(a => a._id); },
    startBalance() {
      const balances = (this.months.find(m => m.month === previousMonth(this.month))?.balances || []).filter(b => !this.cardIds.includes(b.id));
      return !balances.length || balances.some(b => b.balanceCents == null) ? null : balances.reduce((sum, b) => sum + b.balanceCents, 0);
    },
    income() { return this.current.incomeCents + this.current.reimbursementsCents; },
    spentShare() { return this.income ? `${(this.current.expenseCents / this.income * 100).toLocaleString(this.$i18n.locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%` : '—'; },
    // Card purchases are listed in their bills; transfers (including bill payments) move money, they are not spending.
    accountItems() { return this.current.details.filter(d => d.type !== 'transfer' && !this.cardIds.includes(d.account)); },
  },
  async mounted() { await this.load(); },
  methods: {
    money(value) { return value == null ? this.$t('finance.unknown') : currency(value / 100); },
    accountName(id) { return this.accounts.find(a => a._id === id)?.name || ''; },
    async load() {
      if (!this.month) return;
      this.loading = true; this.error = '';
      try {
        const params = new URLSearchParams({ from: previousMonth(this.month), count: '3', today: toDateInput() });
        const [projection, cards] = await Promise.all([api.get(`/finance/projection?${params}`), api.get(`/finance/cards?month=${this.month}`)]);
        this.months = projection.months; this.cards = cards.cards;
      } catch (err) { this.error = errorMessage(this.$t, err); }
      finally { this.loading = false; }
    },
  },
};
</script>

<style scoped>
.month-view { display: grid; gap: 18px; min-width: 0; }
.month-summary { grid-template-columns: repeat(auto-fit, minmax(min(100%, 180px), 1fr)); }
.card-head { display: flex; flex-wrap: wrap; justify-content: space-between; gap: 8px; }
.negative { color: var(--danger, #e95c68); }
td small { display: inline; }
</style>
