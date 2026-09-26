<template>
  <AppShell :title="$t('dashboard.title')">
    <template #actions>
      <button class="btn btn-primary" @click="$router.push('/orders')">
        <span class="material-symbols-outlined">add_circle</span> {{ $t('orders.newOrder') }}
      </button>
    </template>

    <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

    <div v-else class="stack">
      <div class="grid">
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">shopping_basket</span> {{ $t('dashboard.kpis.activeOrders') }}</div>
          <div class="kpi-value">{{ data.activeOrders }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">payments</span> {{ $t('dashboard.kpis.revenueThisMonth') }}</div>
          <div class="kpi-value">{{ currency(data.revenueThisMonth) }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">alarm</span> {{ $t('dashboard.kpis.upcoming') }}</div>
          <div class="kpi-value">{{ data.upcomingDeadlines.length }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">checklist</span> {{ $t('dashboard.kpis.pending') }}</div>
          <div class="kpi-value">{{ data.pendingOrders.length }}</div>
        </div>
      </div>

      <div :class="$style.split">
        <section class="card" data-test="upcoming">
          <div class="card-head">
            <h2>{{ $t('dashboard.upcoming.title') }}</h2>
            <router-link to="/orders" class="badge badge-accent">{{ $t('dashboard.upcoming.viewAll') }}</router-link>
          </div>

          <div v-if="!data.upcomingDeadlines.length" class="empty">
            <span class="material-symbols-outlined">event_available</span>
            <p>{{ $t('dashboard.upcoming.empty') }}</p>
          </div>

          <div v-else class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>{{ $t('orders.table.customer') }}</th>
                  <th>{{ $t('orders.table.recipe') }}</th>
                  <th>{{ $t('orders.table.delivery') }}</th>
                  <th>{{ $t('orders.table.status') }}</th>
                  <th class="num">{{ $t('orders.table.value') }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="order in data.upcomingDeadlines" :key="order._id">
                  <td>
                    <div class="row" :class="$style.customer">
                      <span class="badge badge-accent" :class="$style.avatar">{{ initials(order.customer?.name) }}</span>
                      <span>{{ order.customer?.name || '—' }}</span>
                    </div>
                  </td>
                  <td>{{ order.recipe?.name || '—' }}</td>
                  <td class="muted">{{ date(order.deliveryDate) }}</td>
                  <td>
                    <span class="badge" :class="ORDER_STATUS_BADGE[order.status]">{{ $t(`orders.status.${order.status}`) }}</span>
                  </td>
                  <td class="num">{{ currency(order.paidPrice) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card" data-test="alerts">
          <div class="card-head">
            <h2>{{ $t('dashboard.alerts.title') }}</h2>
            <span class="badge" :class="data.ingredientAlerts.length ? 'badge-warn' : 'badge-ok'">
              {{ data.ingredientAlerts.length }}
            </span>
          </div>

          <div v-if="!data.ingredientAlerts.length" class="empty">
            <span class="material-symbols-outlined">check_circle</span>
            <p>{{ $t('dashboard.alerts.empty') }}</p>
          </div>

          <ul v-else :class="$style.alerts">
            <li v-for="item in data.ingredientAlerts" :key="item.ingredient._id" :class="$style.alert">
              <span
                class="material-symbols-outlined"
                :class="item.severity === 'critical' ? $style.critical : $style.low"
              >{{ item.severity === 'critical' ? 'error' : 'warning' }}</span>
              <div :class="$style.alertInfo">
                <strong>{{ item.ingredient.name }}</strong>
                <div class="muted">
                  {{ $t('dashboard.alerts.detail', {
                    current: item.currentStock,
                    projected: item.projectedStock?.toFixed(2),
                    unit: item.ingredient.unit,
                  }) }}
                </div>
              </div>
              <span class="badge" :class="item.severity === 'critical' ? 'badge-danger' : 'badge-warn'">
                {{ $t(`ingredients.status.${item.severity}`) }}
              </span>
            </li>
          </ul>
        </section>
      </div>
    </div>
  </AppShell>
</template>

<script>
import { AppShell } from '@yper/ui';
import { api } from '@/api';
import { currency, date, errorMessage } from '@yper/i18n';
import { ORDER_STATUS_BADGE } from '@/orderStatus';

export default {
  name: 'Dashboard',
  components: { AppShell },
  data() {
    return {
      ORDER_STATUS_BADGE,
      loading: true,
      data: {
        activeOrders: 0,
        revenueThisMonth: 0,
        upcomingDeadlines: [],
        pendingOrders: [],
        ingredientAlerts: [],
      },
    };
  },
  async mounted() {
    await this.load();
  },
  methods: {
    currency,
    date,
    initials(name) {
      return (name || '?').slice(0, 2).toUpperCase();
    },
    async load() {
      this.loading = true;
      try {
        this.data = await api.get('/dashboard');
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
  },
};
</script>

<style module>
.split {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  align-items: start;
}

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

.alerts {
  list-style: none;
  margin: 0;
  padding: 0;
}

.alert {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 18px;
  border-top: 1px solid var(--border);
}

.alert:first-child {
  border-top: none;
}

.alertInfo {
  flex: 1;
  min-width: 0;
}

.critical {
  color: var(--danger);
}

.low {
  color: var(--warning);
}
</style>
