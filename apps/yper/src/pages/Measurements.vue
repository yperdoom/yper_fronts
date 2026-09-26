<template>
  <AppShell :title="$t('measurements.title')">
    <template #actions>
      <button class="btn btn-primary" @click="openForm()">
        <span class="material-symbols-outlined">add</span> {{ $t('measurements.newMeasurement') }}
      </button>
    </template>

    <div class="stack">
      <div v-if="measurements.length" class="grid">
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">monitor_weight</span> {{ $t('measurements.kpi.currentWeight') }}</div>
          <div class="kpi-value">{{ $t('measurements.kpi.weightValue', { value: number(latest.weightKg, 1) }) }}</div>
          <div class="kpi-hint">{{ date(latest.date) }}</div>
        </div>
        <div class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">trending_down</span> {{ $t('measurements.kpi.totalVariation') }}</div>
          <div class="kpi-value" :class="variation > 0 ? $style.up : $style.down">
            {{ variation > 0 ? '+' : '' }}{{ $t('measurements.kpi.weightValue', { value: number(variation, 1) }) }}
          </div>
          <div class="kpi-hint">{{ $t('measurements.kpi.since', { date: date(first.date) }) }}</div>
        </div>
        <div v-if="latest.bodyFatPercentage != null" class="card kpi">
          <div class="kpi-label"><span class="material-symbols-outlined">percent</span> {{ $t('measurements.kpi.bodyFat') }}</div>
          <div class="kpi-value">{{ $t('measurements.kpi.percentValue', { value: number(latest.bodyFatPercentage, 1) }) }}</div>
        </div>
      </div>

      <section v-if="chart.points.length > 1" class="card">
        <div class="card-head">
          <h2>{{ $t('measurements.chart.title') }}</h2>
          <span class="muted">{{ $t('measurements.chart.count', { count: chart.points.length }) }}</span>
        </div>
        <div class="card-body">
          <svg :viewBox="`0 0 ${chart.width} ${chart.height}`" :class="$style.chart" preserveAspectRatio="none">
            <polyline
              :points="chart.polyline"
              fill="none"
              stroke="var(--accent)"
              stroke-width="2"
              vector-effect="non-scaling-stroke"
            />
            <circle
              v-for="(point, index) in chart.points"
              :key="index"
              :cx="point.x"
              :cy="point.y"
              r="3"
              fill="var(--accent)"
            />
          </svg>
          <div class="row" :class="$style.chartAxis">
            <span class="muted">{{ date(first.date) }}</span>
            <div class="spacer"></div>
            <span class="muted">{{ $t('measurements.chart.range', { min: number(chart.min, 1), max: number(chart.max, 1) }) }}</span>
            <div class="spacer"></div>
            <span class="muted">{{ date(latest.date) }}</span>
          </div>
        </div>
      </section>

      <div class="card">
        <div class="card-head">
          <h2>{{ $t('measurements.list.title') }}</h2>
          <span class="muted">{{ $t('measurements.list.count', { count: measurements.length }) }}</span>
        </div>

        <div v-if="loading" class="loading">{{ $t('common.loading') }}</div>

        <div v-else-if="!measurements.length" class="empty">
          <span class="material-symbols-outlined">monitoring</span>
          <p>{{ $t('measurements.list.empty') }}</p>
        </div>

        <div v-else class="table-wrap">
          <table class="data">
            <thead>
              <tr>
                <th>{{ $t('measurements.table.date') }}</th>
                <th class="num">{{ $t('measurements.table.weight') }}</th>
                <th class="num">{{ $t('measurements.table.fat') }}</th>
                <th class="num">{{ $t('measurements.table.chest') }}</th>
                <th class="num">{{ $t('measurements.table.waist') }}</th>
                <th class="num">{{ $t('measurements.table.hip') }}</th>
                <th class="num">{{ $t('measurements.table.arm') }}</th>
                <th class="num">{{ $t('measurements.table.thigh') }}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="item in measurements" :key="item._id">
                <td class="muted">{{ date(item.date) }}</td>
                <td class="num"><strong>{{ $t('measurements.kpi.weightValue', { value: number(item.weightKg, 1) }) }}</strong></td>
                <td class="num">{{ item.bodyFatPercentage != null ? $t('measurements.kpi.percentValue', { value: number(item.bodyFatPercentage, 1) }) : '—' }}</td>
                <td class="num">{{ cm(item.chestCm) }}</td>
                <td class="num">{{ cm(item.waistCm) }}</td>
                <td class="num">{{ cm(item.hipCm) }}</td>
                <td class="num">{{ cm(item.armCm) }}</td>
                <td class="num">{{ cm(item.thighCm) }}</td>
                <td>
                  <div class="row" :class="$style.actions">
                    <button class="btn-icon" :title="$t('common.edit')" @click="openForm(item)">
                      <span class="material-symbols-outlined">edit</span>
                    </button>
                    <button class="btn-icon" :title="$t('common.remove')" @click="remove(item)">
                      <span class="material-symbols-outlined">delete</span>
                    </button>
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>

    <Modal
      :show="showForm"
      :title="editingId ? $t('measurements.form.editTitle') : $t('measurements.newMeasurement')"
      :saving="saving"
      @close="showForm = false"
      @submit="save"
    >
      <div class="form-grid">
        <div class="field">
          <label for="date">{{ $t('measurements.form.date') }}</label>
          <input id="date" v-model="form.date" type="date" required />
        </div>
        <div class="field">
          <label for="weightKg">{{ $t('measurements.form.weight') }}</label>
          <input id="weightKg" v-model.number="form.weightKg" type="number" step="0.1" min="0" required />
        </div>
        <div class="field">
          <label for="bodyFat">{{ $t('measurements.form.bodyFat') }}</label>
          <input id="bodyFat" v-model.number="form.bodyFatPercentage" type="number" step="0.1" min="0" max="100" />
        </div>
        <div class="field">
          <label for="chest">{{ $t('measurements.form.chest') }}</label>
          <input id="chest" v-model.number="form.chestCm" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="waist">{{ $t('measurements.form.waist') }}</label>
          <input id="waist" v-model.number="form.waistCm" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="hip">{{ $t('measurements.form.hip') }}</label>
          <input id="hip" v-model.number="form.hipCm" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="arm">{{ $t('measurements.form.arm') }}</label>
          <input id="arm" v-model.number="form.armCm" type="number" step="0.1" min="0" />
        </div>
        <div class="field">
          <label for="thigh">{{ $t('measurements.form.thigh') }}</label>
          <input id="thigh" v-model.number="form.thighCm" type="number" step="0.1" min="0" />
        </div>
        <div class="field full">
          <label for="notes">{{ $t('measurements.form.notes') }}</label>
          <textarea id="notes" v-model="form.notes"></textarea>
        </div>
      </div>
    </Modal>
  </AppShell>
</template>

<script>
import { AppShell, Modal } from '@yper/ui';
import { api } from '@/api';
import { number, date, toDateInput, errorMessage } from '@yper/i18n';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 140;
const PADDING = 10;

const empty = () => ({
  date: toDateInput(),
  weightKg: 0,
  bodyFatPercentage: null,
  chestCm: null,
  waistCm: null,
  hipCm: null,
  armCm: null,
  thighCm: null,
  notes: '',
});

export default {
  name: 'Measurements',
  components: { AppShell, Modal },
  data() {
    return {
      measurements: [],
      loading: true,
      saving: false,
      showForm: false,
      editingId: null,
      form: empty(),
    };
  },
  computed: {
    // A API devolve da mais recente para a mais antiga.
    latest() {
      return this.measurements[0] || {};
    },
    first() {
      return this.measurements[this.measurements.length - 1] || {};
    },
    variation() {
      if (this.measurements.length < 2) return 0;
      return this.latest.weightKg - this.first.weightKg;
    },
    chart() {
      const series = [...this.measurements].reverse().filter((item) => item.weightKg > 0);
      if (series.length < 2) {
        return { points: [], polyline: '', min: 0, max: 0, width: CHART_WIDTH, height: CHART_HEIGHT };
      }

      const weights = series.map((item) => item.weightKg);
      const min = Math.min(...weights);
      const max = Math.max(...weights);
      const span = max - min || 1;
      const usableHeight = CHART_HEIGHT - PADDING * 2;

      const points = series.map((item, index) => ({
        x: (index / (series.length - 1)) * CHART_WIDTH,
        y: PADDING + (1 - (item.weightKg - min) / span) * usableHeight,
      }));

      return {
        points,
        polyline: points.map((point) => `${point.x},${point.y}`).join(' '),
        min,
        max,
        width: CHART_WIDTH,
        height: CHART_HEIGHT,
      };
    },
  },
  async mounted() {
    await this.load();
  },
  methods: {
    number,
    date,
    cm(value) {
      return value != null ? `${number(value, 1)}` : '—';
    },
    async load() {
      this.loading = true;
      try {
        const { measurements } = await api.get('/measurements');
        this.measurements = measurements;
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.loading = false;
      }
    },
    openForm(item = null) {
      this.editingId = item?._id || null;
      this.form = item ? { ...empty(), ...item, date: toDateInput(item.date) } : empty();
      this.showForm = true;
    },
    async save() {
      this.saving = true;
      try {
        if (this.editingId) {
          await api.put(`/measurements/${this.editingId}`, this.form);
        } else {
          await api.post('/measurements', this.form);
        }
        this.showForm = false;
        await this.load();
      } catch (err) {
        alert(errorMessage(this.$t, err));
      } finally {
        this.saving = false;
      }
    },
    async remove(item) {
      if (!confirm(this.$t('measurements.confirmRemove', { date: date(item.date) }))) return;
      try {
        await api.del(`/measurements/${item._id}`);
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

.chart {
  width: 100%;
  height: 140px;
  overflow: visible;
}

.chartAxis {
  margin-top: 8px;
  font-size: 0.8rem;
}

.up {
  color: var(--warning);
}

.down {
  color: var(--success);
}
</style>
