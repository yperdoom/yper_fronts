<template>
  <AppShell title="Visão geral">
    <div v-if="loading" class="loading">Carregando...</div>

    <div v-else class="stack">
      <div class="grid">
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">inventory_2</span> Produtos ativos</div>
          <div class="kpi-value">{{ data.totalProducts }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">payments</span> Valor em estoque</div>
          <div class="kpi-value">{{ currency(data.stockValue) }}</div>
          <div class="kpi-hint">pelo preço de custo</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">shopping_cart</span> Compras no mês</div>
          <div class="kpi-value">{{ currency(data.purchasesThisMonth) }}</div>
          <div class="kpi-hint">{{ data.invoicesThisMonth }} nota(s) confirmada(s)</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">sell</span> Vendas no mês</div>
          <div class="kpi-value">{{ currency(data.salesThisMonth) }}</div>
        </div>
      </div>

      <div :class="$style.split">
        <section class="card">
          <div class="card-head">
            <h2>Abaixo do mínimo</h2>
            <span class="badge" :class="data.lowStock.length ? 'badge-warn' : 'badge-ok'">
              {{ data.lowStock.length }}
            </span>
          </div>

          <div v-if="!data.lowStock.length" class="empty">
            <span class="material-symbols-outlined">check_circle</span>
            <p>Nenhum produto abaixo do mínimo.</p>
          </div>

          <div v-else class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Produto</th>
                  <th class="num">Atual</th>
                  <th class="num">Mínimo</th>
                  <th class="num">Repor</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="product in data.lowStock" :key="product._id">
                  <td>
                    {{ product.name }}
                    <span v-if="product.sku" class="muted">· {{ product.sku }}</span>
                  </td>
                  <td class="num">
                    <span class="badge" :class="product.currentStock <= 0 ? 'badge-danger' : 'badge-warn'">
                      {{ number(product.currentStock) }} {{ product.unit }}
                    </span>
                  </td>
                  <td class="num muted">{{ number(product.minimumStock) }}</td>
                  <td class="num">{{ number(product.minimumStock - product.currentStock) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section class="card">
          <div class="card-head">
            <h2>Últimas movimentações</h2>
            <router-link to="/movimentacoes" class="badge badge-accent">ver tudo</router-link>
          </div>

          <div v-if="!data.recentMovements.length" class="empty">
            <span class="material-symbols-outlined">swap_vert</span>
            <p>Nenhuma movimentação registrada.</p>
          </div>

          <div v-else class="table-wrap">
            <table class="data">
              <thead>
                <tr>
                  <th>Quando</th>
                  <th>Produto</th>
                  <th class="num">Variação</th>
                  <th class="num">Saldo</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="movement in data.recentMovements" :key="movement._id">
                  <td class="muted">{{ dateTime(movement.occurredAt) }}</td>
                  <td>{{ movement.product?.name || '—' }}</td>
                  <td class="num">
                    <span class="badge" :class="movement.delta >= 0 ? 'badge-ok' : 'badge-danger'">
                      {{ movement.delta >= 0 ? '+' : '' }}{{ number(movement.delta) }}
                    </span>
                  </td>
                  <td class="num">{{ number(movement.balanceAfter) }}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  </AppShell>
</template>

<script>
import { AppShell } from '@yper/ui';
import { api } from '@/api';
import { currency, number, dateTime } from '@yper/i18n';

export default {
  name: 'Dashboard',
  components: { AppShell },
  data() {
    return {
      loading: true,
      data: {
        totalProducts: 0,
        stockValue: 0,
        purchasesThisMonth: 0,
        salesThisMonth: 0,
        invoicesThisMonth: 0,
        lowStock: [],
        recentMovements: [],
      },
    };
  },
  async mounted() {
    try {
      this.data = await api.get('/dashboard');
    } catch (err) {
      alert(err.message);
    } finally {
      this.loading = false;
    }
  },
  methods: { currency, number, dateTime },
};
</script>

<style module>
.split {
  display: grid;
  gap: 16px;
  grid-template-columns: repeat(auto-fit, minmax(340px, 1fr));
  align-items: start;
}
</style>
