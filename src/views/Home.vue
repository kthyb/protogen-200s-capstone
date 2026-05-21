<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar, Line } from 'vue-chartjs'
import {
  CategoryScale,
  Chart as ChartJS,
  Filler,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  BarElement,
  Title,
  Tooltip,
} from 'chart.js'
import metricsJson from '../data/metrics.json'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Title,
  Tooltip,
  Legend,
  Filler,
)

type MetricRow = {
  month: string
  revenue: number
  visitors: number
  conversions: number
  orders: number
}

type MetricKey = 'revenue' | 'visitors' | 'conversions' | 'orders'

const metrics = metricsJson as MetricRow[]
const selectedMonth = ref<string>('ALL')

const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' })

function toMonthName(isoMonth: string): string {
  const [year, month] = isoMonth.split('-').map(Number)
  return monthLabel.format(new Date(year, month - 1, 1))
}

const monthItems = computed(() => [
  { title: 'All months', value: 'ALL' },
  ...metrics.map((entry) => ({
    title: `${toMonthName(entry.month)} 2025`,
    value: entry.month,
  })),
])

const filteredMetrics = computed(() => {
  if (selectedMonth.value === 'ALL') {
    return metrics
  }

  return metrics.filter((entry) => entry.month === selectedMonth.value)
})

const money = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const whole = new Intl.NumberFormat('en-US')

function previousEntry(month: string): MetricRow | null {
  const index = metrics.findIndex((entry) => entry.month === month)
  return index > 0 ? metrics[index - 1] : null
}

function summaryValue(key: MetricKey): number {
  if (key === 'conversions') {
    const total = filteredMetrics.value.reduce((sum, entry) => sum + entry.conversions, 0)
    return total / filteredMetrics.value.length
  }

  return filteredMetrics.value.reduce((sum, entry) => sum + entry[key], 0)
}

function comparisonValue(key: MetricKey): { current: number; previous: number | null } {
  if (selectedMonth.value === 'ALL') {
    const current = metrics[metrics.length - 1][key]
    const previous = metrics[metrics.length - 2]?.[key] ?? null
    return { current, previous }
  }

  const currentEntry = filteredMetrics.value[0]
  const previous = previousEntry(currentEntry.month)
  return {
    current: currentEntry[key],
    previous: previous ? previous[key] : null,
  }
}

function deltaPercent(key: MetricKey): number | null {
  const values = comparisonValue(key)
  if (values.previous === null || values.previous === 0) {
    return null
  }

  return ((values.current - values.previous) / values.previous) * 100
}

function formatValue(key: MetricKey): string {
  const value = summaryValue(key)
  if (key === 'revenue') {
    return money.format(value)
  }

  if (key === 'conversions') {
    return `${value.toFixed(2)}%`
  }

  return whole.format(Math.round(value))
}

function deltaIcon(value: number | null): string {
  if (value === null || value === 0) {
    return 'mdi-minus'
  }

  return value > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down'
}

function deltaColor(value: number | null): string {
  if (value === null || value === 0) {
    return 'grey'
  }

  return value > 0 ? 'success' : 'error'
}

function deltaLabel(value: number | null): string {
  if (value === null) {
    return 'No previous month'
  }

  const abs = Math.abs(value).toFixed(1)
  return `${abs}% vs previous month`
}

const summaryCards = computed(() => [
  {
    title: 'Revenue',
    icon: 'mdi-currency-usd',
    value: formatValue('revenue'),
    delta: deltaPercent('revenue'),
  },
  {
    title: 'Visitors',
    icon: 'mdi-account-group',
    value: formatValue('visitors'),
    delta: deltaPercent('visitors'),
  },
  {
    title: 'Conversions',
    icon: 'mdi-trending-up',
    value: formatValue('conversions'),
    delta: deltaPercent('conversions'),
  },
  {
    title: 'Orders',
    icon: 'mdi-cart-outline',
    value: formatValue('orders'),
    delta: deltaPercent('orders'),
  },
])

const chartLabels = computed(() => filteredMetrics.value.map((entry) => toMonthName(entry.month)))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      labels: {
        color: '#e6edf7',
      },
    },
  },
  scales: {
    x: {
      ticks: { color: '#9ea9bd' },
      grid: { color: 'rgba(114, 130, 157, 0.18)' },
    },
    y: {
      ticks: { color: '#9ea9bd' },
      grid: { color: 'rgba(114, 130, 157, 0.18)' },
    },
  },
}

const revenueChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'Revenue',
      data: filteredMetrics.value.map((entry) => entry.revenue),
      backgroundColor: 'rgba(82, 182, 154, 0.75)',
      borderRadius: 6,
      maxBarThickness: 44,
    },
  ],
}))

const visitorsChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'Visitors',
      data: filteredMetrics.value.map((entry) => entry.visitors),
      borderColor: '#68a7ff',
      backgroundColor: 'rgba(104, 167, 255, 0.2)',
      tension: 0.34,
      pointRadius: 4,
      pointBackgroundColor: '#8ac3ff',
    },
  ],
}))

const conversionChartData = computed(() => ({
  labels: chartLabels.value,
  datasets: [
    {
      label: 'Conversions %',
      data: filteredMetrics.value.map((entry) => entry.conversions),
      borderColor: '#f7b267',
      backgroundColor: 'rgba(247, 178, 103, 0.22)',
      fill: true,
      tension: 0.35,
      pointRadius: 3,
      pointBackgroundColor: '#ffd7a3',
    },
  ],
}))
</script>

<template>
  <v-app>
    <v-app-bar elevation="0" class="app-bar px-4">
      <v-app-bar-title>My Dashboard</v-app-bar-title>
      <v-select
        v-model="selectedMonth"
        :items="monthItems"
        item-title="title"
        item-value="value"
        label="Month"
        variant="solo-filled"
        density="comfortable"
        hide-details
        class="month-select"
      />
    </v-app-bar>

    <v-main>
      <v-container class="py-8">
        <v-row class="mb-4" dense>
          <v-col v-for="card in summaryCards" :key="card.title" cols="12" sm="6" lg="3">
            <v-card class="metric-card" rounded="xl">
              <v-card-item>
                <template #prepend>
                  <v-avatar color="surface-variant" size="44">
                    <v-icon :icon="card.icon" />
                  </v-avatar>
                </template>
                <v-card-title>{{ card.title }}</v-card-title>
              </v-card-item>
              <v-card-text>
                <div class="metric-value">{{ card.value }}</div>
                <div class="metric-delta" :class="`text-${deltaColor(card.delta)}`">
                  <v-icon :icon="deltaIcon(card.delta)" size="16" class="me-1" />
                  {{ deltaLabel(card.delta) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="mb-4" dense>
          <v-col cols="12" lg="6">
            <v-card class="chart-card" rounded="xl">
              <v-card-title>Monthly Revenue</v-card-title>
              <v-card-text class="chart-wrap">
                <Bar :data="revenueChartData" :options="chartOptions" />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="6">
            <v-card class="chart-card" rounded="xl">
              <v-card-title>Visitors Over Time</v-card-title>
              <v-card-text class="chart-wrap">
                <Line :data="visitorsChartData" :options="chartOptions" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row dense>
          <v-col cols="12">
            <v-card class="chart-card" rounded="xl">
              <v-card-title>Conversions Trend</v-card-title>
              <v-card-text class="chart-wrap chart-wrap-lg">
                <Line :data="conversionChartData" :options="chartOptions" />
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-bar {
  backdrop-filter: blur(10px);
  background: rgba(14, 22, 36, 0.82);
  border-bottom: 1px solid rgba(142, 156, 179, 0.2);
}

.month-select {
  max-width: 220px;
}

.metric-card {
  background: #111c2d;
  border: 1px solid rgba(142, 156, 179, 0.15);
}

.metric-value {
  font-size: 1.8rem;
  font-weight: 700;
  line-height: 1.15;
  margin-bottom: 8px;
}

.metric-delta {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
}

.chart-card {
  background: #111c2d;
  border: 1px solid rgba(142, 156, 179, 0.15);
  height: 100%;
}

.chart-wrap {
  height: 300px;
}

.chart-wrap-lg {
  height: 320px;
}
</style>
