<script setup lang="ts">
import { computed, ref } from 'vue'
import { Bar, Doughnut, Line } from 'vue-chartjs'
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartJS,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from 'chart.js'
import { geoAlbersUsa, geoPath } from 'd3-geo'
import { scaleLinear } from 'd3-scale'
import { feature } from 'topojson-client'
import metricsJson from '../data/metrics.json'
import usStatesTopology from 'us-atlas/states-10m.json'

ChartJS.register(
  ArcElement,
  CategoryScale,
  LinearScale,
  BarElement,
  LineElement,
  PointElement,
  Tooltip,
  Legend,
)

type ExceptionKey = 'lateShipments' | 'damagedPackages' | 'customsHolds'

type MetricRow = {
  month: string
  costPerShipment: number
  averageTransitTime: number
  orderToDeliveryTime: number
  shipmentVolume: number
  onTimeDeliveryRate: number
  regionalPerformance: Record<string, { avgTransportationTime: number }>
  openExceptions: Record<ExceptionKey, number>
}

const metrics = metricsJson as MetricRow[]
const selectedMonth = ref<string>('ALL')
const hoveredStateId = ref<number | null>(null)

const monthLabel = new Intl.DateTimeFormat('en-US', { month: 'short' })
const currencyFmt = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 1,
  maximumFractionDigits: 1,
})
const numberFmt = new Intl.NumberFormat('en-US')

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

const selectedEntry = computed(() =>
  selectedMonth.value === 'ALL'
    ? null
    : metrics.find((entry) => entry.month === selectedMonth.value) ?? null,
)

const weightedAll = computed(() => {
  const totalShipments = metrics.reduce((sum, item) => sum + item.shipmentVolume, 0)
  const weightedCost =
    metrics.reduce((sum, item) => sum + item.costPerShipment * item.shipmentVolume, 0) /
    totalShipments
  const weightedTransit =
    metrics.reduce((sum, item) => sum + item.averageTransitTime * item.shipmentVolume, 0) /
    totalShipments
  const weightedOrderToDelivery =
    metrics.reduce((sum, item) => sum + item.orderToDeliveryTime * item.shipmentVolume, 0) /
    totalShipments

  return {
    costPerShipment: weightedCost,
    averageTransitTime: weightedTransit,
    orderToDeliveryTime: weightedOrderToDelivery,
  }
})

const summaryValues = computed(() => {
  if (selectedEntry.value) {
    return {
      costPerShipment: selectedEntry.value.costPerShipment,
      averageTransitTime: selectedEntry.value.averageTransitTime,
      orderToDeliveryTime: selectedEntry.value.orderToDeliveryTime,
    }
  }
  return weightedAll.value
})

function previousMonthRow(month: string): MetricRow | null {
  const index = metrics.findIndex((item) => item.month === month)
  return index > 0 ? metrics[index - 1] : null
}

function metricDeltaPercent(
  key: 'costPerShipment' | 'averageTransitTime' | 'orderToDeliveryTime',
): number | null {
  if (!selectedEntry.value) {
    const current = metrics[metrics.length - 1][key]
    const previous = metrics[metrics.length - 2][key]
    return ((current - previous) / previous) * 100
  }

  const previous = previousMonthRow(selectedEntry.value.month)
  if (!previous) {
    return null
  }

  return ((selectedEntry.value[key] - previous[key]) / previous[key]) * 100
}

function deltaIcon(value: number | null): string {
  if (value === null || value === 0) {
    return 'mdi-minus'
  }
  return value > 0 ? 'mdi-arrow-up' : 'mdi-arrow-down'
}

function deltaColor(value: number | null, lowerIsBetter = false): string {
  if (value === null || value === 0) {
    return 'grey'
  }
  if (lowerIsBetter) {
    return value < 0 ? 'success' : 'error'
  }
  return value > 0 ? 'success' : 'error'
}

function deltaText(value: number | null): string {
  if (value === null) {
    return 'No previous month'
  }
  return `${Math.abs(value).toFixed(1)}% vs previous month`
}

const summaryCards = computed(() => [
  {
    title: 'Cost Per Shipment',
    icon: 'mdi-currency-usd',
    value: currencyFmt.format(summaryValues.value.costPerShipment),
    delta: metricDeltaPercent('costPerShipment'),
    lowerIsBetter: true,
  },
  {
    title: 'Avg Transit Time',
    icon: 'mdi-truck-fast-outline',
    value: `${summaryValues.value.averageTransitTime.toFixed(1)} days`,
    delta: metricDeltaPercent('averageTransitTime'),
    lowerIsBetter: true,
  },
  {
    title: 'Order-to-Delivery',
    icon: 'mdi-timer-outline',
    value: `${summaryValues.value.orderToDeliveryTime.toFixed(1)} days`,
    delta: metricDeltaPercent('orderToDeliveryTime'),
    lowerIsBetter: true,
  },
])

const volumeChartData = computed(() => {
  const rows = selectedEntry.value ? [selectedEntry.value] : metrics
  return {
    labels: rows.map((item) => toMonthName(item.month)),
    datasets: [
      {
        label: 'Shipment Volume',
        data: rows.map((item) => item.shipmentVolume),
        backgroundColor: 'rgba(89, 155, 255, 0.8)',
        borderRadius: 7,
        maxBarThickness: 42,
      },
    ],
  }
})

const onTimeChartData = computed(() => ({
  labels: metrics.map((item) => toMonthName(item.month)),
  datasets: [
    {
      label: 'On-Time Delivery %',
      data: metrics.map((item) => item.onTimeDeliveryRate),
      borderColor: '#4fd1a5',
      backgroundColor: 'rgba(79, 209, 165, 0.18)',
      tension: 0.35,
      pointRadius: 4,
      pointHoverRadius: 5,
      pointBackgroundColor: '#97f3d3',
      fill: true,
    },
  ],
}))

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
  plugins: {
    legend: {
      display: false,
    },
  },
  scales: {
    x: {
      ticks: { color: '#9ab0cc' },
      grid: { color: 'rgba(112, 135, 166, 0.15)' },
    },
    y: {
      ticks: { color: '#9ab0cc' },
      grid: { color: 'rgba(112, 135, 166, 0.15)' },
    },
  },
}

const onTimeSingle = computed(() => {
  if (!selectedEntry.value) {
    return null
  }
  const previous = previousMonthRow(selectedEntry.value.month)
  const delta = previous
    ? ((selectedEntry.value.onTimeDeliveryRate - previous.onTimeDeliveryRate) /
        previous.onTimeDeliveryRate) *
      100
    : null

  return {
    value: selectedEntry.value.onTimeDeliveryRate,
    delta,
  }
})

const exceptionTotals = computed<Record<ExceptionKey, number>>(() => {
  if (selectedEntry.value) {
    return selectedEntry.value.openExceptions
  }

  return {
    lateShipments: metrics.reduce((sum, item) => sum + item.openExceptions.lateShipments, 0),
    damagedPackages: metrics.reduce((sum, item) => sum + item.openExceptions.damagedPackages, 0),
    customsHolds: metrics.reduce((sum, item) => sum + item.openExceptions.customsHolds, 0),
  }
})

const exceptionBreakdown = computed(() => {
  const rows = [
    { key: 'lateShipments', type: 'Late Shipments', color: '#f97386' },
    { key: 'damagedPackages', type: 'Damaged Packages', color: '#f7c873' },
    { key: 'customsHolds', type: 'Customs Holds', color: '#6ad3c1' },
  ] as const

  const total = rows.reduce((sum, row) => sum + exceptionTotals.value[row.key], 0)

  return rows.map((row) => ({
    ...row,
    amount: exceptionTotals.value[row.key],
    percent: total === 0 ? 0 : (exceptionTotals.value[row.key] / total) * 100,
  }))
})

const exceptionsDonutData = computed(() => ({
  labels: exceptionBreakdown.value.map((item) => item.type),
  datasets: [
    {
      data: exceptionBreakdown.value.map((item) => item.amount),
      backgroundColor: exceptionBreakdown.value.map((item) => item.color),
      borderColor: '#0f1a2e',
      borderWidth: 3,
      hoverOffset: 5,
    },
  ],
}))

const exceptionsDonutOptions = {
  responsive: true,
  maintainAspectRatio: false,
  cutout: '70%',
  plugins: {
    legend: {
      display: false,
    },
  },
}

const stateAbbrById: Record<number, string> = {
  1: 'AL',
  2: 'AK',
  4: 'AZ',
  5: 'AR',
  6: 'CA',
  8: 'CO',
  9: 'CT',
  10: 'DE',
  11: 'DC',
  12: 'FL',
  13: 'GA',
  15: 'HI',
  16: 'ID',
  17: 'IL',
  18: 'IN',
  19: 'IA',
  20: 'KS',
  21: 'KY',
  22: 'LA',
  23: 'ME',
  24: 'MD',
  25: 'MA',
  26: 'MI',
  27: 'MN',
  28: 'MS',
  29: 'MO',
  30: 'MT',
  31: 'NE',
  32: 'NV',
  33: 'NH',
  34: 'NJ',
  35: 'NM',
  36: 'NY',
  37: 'NC',
  38: 'ND',
  39: 'OH',
  40: 'OK',
  41: 'OR',
  42: 'PA',
  44: 'RI',
  45: 'SC',
  46: 'SD',
  47: 'TN',
  48: 'TX',
  49: 'UT',
  50: 'VT',
  51: 'VA',
  53: 'WA',
  54: 'WV',
  55: 'WI',
  56: 'WY',
}

const stateIds = Object.keys(stateAbbrById).map(Number)
const longHaulStateIds = new Set<number>([2, 15, 30, 38, 46, 56, 16, 32, 35, 49])
const denseTrafficStateIds = new Set<number>([6, 12, 36, 48, 17, 25, 34, 42])

function syntheticStateTransportationTime(stateId: number, row: MetricRow, monthIndex: number): number {
  const base = row.averageTransitTime
  const wave = Math.sin((stateId * 0.62) + monthIndex * 0.45) * 0.38
  const noise = (((stateId * 31 + monthIndex * 17) % 19) - 9) * 0.022
  const longHaulBoost = longHaulStateIds.has(stateId) ? 0.55 : 0
  const denseTrafficBoost = denseTrafficStateIds.has(stateId) ? 0.26 : 0
  const monthLift = (monthIndex < 2 || monthIndex > 9) ? 0.14 : 0
  const value = base + wave + noise + longHaulBoost + denseTrafficBoost + monthLift
  return Number(Math.max(2.6, Math.min(7.3, value)).toFixed(2))
}

const stateTransportationTimes = computed<Record<number, number>>(() => {
  if (selectedEntry.value) {
    const monthIndex = metrics.findIndex((item) => item.month === selectedEntry.value?.month)
    return Object.fromEntries(
      stateIds.map((stateId) => [
        stateId,
        syntheticStateTransportationTime(stateId, selectedEntry.value as MetricRow, monthIndex),
      ]),
    )
  }

  return Object.fromEntries(
    stateIds.map((stateId) => {
      const avg =
        metrics.reduce(
          (sum, row, monthIndex) => sum + syntheticStateTransportationTime(stateId, row, monthIndex),
          0,
        ) / metrics.length
      return [stateId, Number(avg.toFixed(2))]
    }),
  )
})

const transportationTimeRange = computed(() => {
  const values = Object.values(stateTransportationTimes.value)
  return {
    min: Math.min(...values),
    max: Math.max(...values),
  }
})

const stateColorScale = computed(() =>
  scaleLinear<string>()
    .domain([transportationTimeRange.value.min, transportationTimeRange.value.max])
    .range(['#95bbff', '#0f274f']),
)

function stateFill(stateId: number): string {
  return stateColorScale.value(stateTransportationTimes.value[stateId] ?? transportationTimeRange.value.min)
}

function stateMetricText(stateId: number): string {
  return `${(stateTransportationTimes.value[stateId] ?? transportationTimeRange.value.min).toFixed(1)} days avg transit`
}

const usMapStates = computed(() => {
  const topology = usStatesTopology as {
    objects: { states: unknown }
  }
  const stateFeatureCollection = feature(
    topology as never,
    topology.objects.states as never,
  ) as unknown as GeoJSON.FeatureCollection
  const projection = geoAlbersUsa().fitSize(
    [1000, 700],
    stateFeatureCollection as unknown as GeoJSON.FeatureCollection,
  )
  const pathBuilder = geoPath(projection)

  return stateFeatureCollection.features
    .map((entry) => {
      const id = Number(entry.id)
      return {
        id,
        d: pathBuilder(entry as unknown as GeoJSON.Feature) || '',
      }
    })
    .filter((entry) => entry.d)
})

const hoveredStateInfo = computed(() => {
  if (hoveredStateId.value === null) {
    return null
  }
  return {
    state: stateAbbrById[hoveredStateId.value] ?? `State ${hoveredStateId.value}`,
    metric: stateMetricText(hoveredStateId.value),
  }
})

const exceptionRows = computed(() => {
  const rows = [
    { type: 'Late Shipments', amount: exceptionTotals.value.lateShipments },
    { type: 'Damaged Packages', amount: exceptionTotals.value.damagedPackages },
    { type: 'Customs Holds', amount: exceptionTotals.value.customsHolds },
  ]

  const max = Math.max(...rows.map((row) => row.amount))
  return rows.map((row): { type: string; amount: number; severity: 'high' | 'medium' | 'low' } => ({
    ...row,
    severity:
      row.amount >= max * 0.85 ? 'high' : row.amount >= max * 0.55 ? 'medium' : 'low',
  }))
})

function severityClass(severity: 'high' | 'medium' | 'low'): string {
  if (severity === 'high') {
    return 'severity-high'
  }
  if (severity === 'medium') {
    return 'severity-medium'
  }
  return 'severity-low'
}
</script>

<template>
  <v-app>
    <v-app-bar elevation="0" class="app-bar px-4">
      <v-app-bar-title class="brand-title">
        <span class="brand-wrap">
          <span class="logo-bolt" aria-hidden="true">
            <svg viewBox="0 0 32 32" role="img" aria-label="FastForward logo">
              <path
                d="M18.4 2 8.2 16.1h7.4L13.8 30l10-14.3h-7.1L18.4 2Z"
                fill="url(#boltGradient)"
              />
              <defs>
                <linearGradient id="boltGradient" x1="8" y1="2" x2="24" y2="30">
                  <stop offset="0%" stop-color="#9ad5ff" />
                  <stop offset="100%" stop-color="#2f8dff" />
                </linearGradient>
              </defs>
            </svg>
          </span>
          <span class="brand-text">FastForward Logistics</span>
        </span>
      </v-app-bar-title>

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
        <v-row class="section-row">
          <v-col v-for="card in summaryCards" :key="card.title" cols="12" md="4" class="section-col">
            <v-card class="metric-card" rounded="xl">
              <v-card-item>
                <template #prepend>
                  <v-icon :icon="card.icon" class="summary-icon" />
                </template>
                <v-card-title class="metric-title">{{ card.title }}</v-card-title>
              </v-card-item>
              <v-card-text>
                <div class="metric-value">{{ card.value }}</div>
                <div class="metric-delta" :class="`text-${deltaColor(card.delta, card.lowerIsBetter)}`">
                  <v-icon :icon="deltaIcon(card.delta)" size="15" class="me-1" />
                  {{ deltaText(card.delta) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="section-row">
          <v-col cols="12" lg="6" class="section-col">
            <v-card class="panel-card" rounded="xl">
              <v-card-item class="panel-head">
                <v-card-title class="metric-title">Shipment Volume</v-card-title>
              </v-card-item>
              <v-card-subtitle>
                {{ selectedMonth === 'ALL' ? 'Monthly total shipments' : 'Selected month volume' }}
              </v-card-subtitle>
              <v-card-text class="chart-wrap">
                <Bar :data="volumeChartData" :options="chartOptions" />
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="6" class="section-col">
            <v-card class="panel-card" rounded="xl">
              <v-card-item class="panel-head">
                <v-card-title class="metric-title">On-Time Delivery Rate</v-card-title>
              </v-card-item>
              <v-card-subtitle>
                {{ selectedMonth === 'ALL' ? 'Trend across all months' : 'Selected month with MoM delta' }}
              </v-card-subtitle>
              <v-card-text class="chart-wrap" v-if="selectedMonth === 'ALL'">
                <Line :data="onTimeChartData" :options="chartOptions" />
              </v-card-text>
              <v-card-text v-else class="single-metric-wrap">
                <div class="single-rate">{{ onTimeSingle?.value.toFixed(1) }}%</div>
                <div class="single-delta" :class="`text-${deltaColor(onTimeSingle?.delta ?? null)}`">
                  <v-icon :icon="deltaIcon(onTimeSingle?.delta ?? null)" size="16" class="me-1" />
                  {{ deltaText(onTimeSingle?.delta ?? null) }}
                </div>
              </v-card-text>
            </v-card>
          </v-col>
        </v-row>

        <v-row class="section-row map-exceptions-row">
          <v-col cols="12" lg="8" class="section-col d-flex map-col">
            <v-card class="panel-card map-card h-100" rounded="xl">
              <v-card-item class="panel-head">
                <v-card-title class="metric-title">US Transportation Time Map</v-card-title>
              </v-card-item>
              <v-card-subtitle>
                Darker states indicate slower average transportation time
              </v-card-subtitle>
              <v-card-text>
                <div class="map-wrap">
                  <svg viewBox="0 0 1000 700" class="regional-map" role="img" aria-label="US transportation performance map">
                    <path
                      v-for="state in usMapStates"
                      :key="state.id"
                      :d="state.d"
                      :fill="stateFill(state.id)"
                      class="region-shape"
                      @mouseenter="hoveredStateId = state.id"
                      @mouseleave="hoveredStateId = null"
                    />
                  </svg>

                  <div class="map-tooltip" v-if="hoveredStateInfo">
                    <div class="tooltip-title">{{ hoveredStateInfo.state }}</div>
                    <div class="tooltip-value">{{ hoveredStateInfo.metric }}</div>
                  </div>

                  <div class="map-scale-vertical" aria-label="Transportation time scale">
                    <span class="map-scale-label">Slower</span>
                    <span class="map-scale-value">{{ transportationTimeRange.max.toFixed(1) }} days</span>
                    <div class="map-scale-bar-vertical"></div>
                    <span class="map-scale-value">{{ transportationTimeRange.min.toFixed(1) }} days</span>
                    <span class="map-scale-label">Faster</span>
                  </div>
                </div>
              </v-card-text>
            </v-card>
          </v-col>

          <v-col cols="12" lg="4" class="section-col d-flex side-col">
            <div class="side-stack h-100">
              <v-card class="panel-card h-100" rounded="xl">
                <v-card-item class="panel-head">
                  <v-card-title class="metric-title">Exception Breakdown</v-card-title>
                </v-card-item>
                <v-card-subtitle>
                  {{ selectedMonth === 'ALL' ? 'Year-to-date percentage split' : 'Selected month percentage split' }}
                </v-card-subtitle>
                <v-card-text class="donut-card-body">
                  <div class="donut-wrap">
                    <Doughnut :data="exceptionsDonutData" :options="exceptionsDonutOptions" />
                  </div>
                  <div class="donut-legend">
                    <div v-for="item in exceptionBreakdown" :key="item.type" class="donut-legend-row">
                      <span class="donut-dot" :style="{ backgroundColor: item.color }"></span>
                      <span class="donut-label">{{ item.type }}</span>
                      <span class="donut-value">{{ item.percent.toFixed(1) }}%</span>
                    </div>
                  </div>
                </v-card-text>
              </v-card>

              <v-card class="panel-card h-100" rounded="xl">
                <v-card-item class="panel-head">
                  <v-card-title class="metric-title">Open Exceptions</v-card-title>
                </v-card-item>
                <v-card-subtitle>
                  {{ selectedMonth === 'ALL' ? 'Year-to-date totals by exception type' : 'Selected month exceptions by type' }}
                </v-card-subtitle>
                <v-card-text class="exceptions-table-wrap">
                  <v-table class="exceptions-table">
                    <thead>
                      <tr>
                        <th>Exception Type</th>
                        <th class="text-right">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      <tr v-for="row in exceptionRows" :key="row.type">
                        <td>{{ row.type }}</td>
                        <td class="text-right">
                          <span class="severity-pill" :class="severityClass(row.severity)">
                            {{ numberFmt.format(row.amount) }}
                          </span>
                        </td>
                      </tr>
                    </tbody>
                  </v-table>
                </v-card-text>
              </v-card>
            </div>
          </v-col>
        </v-row>
      </v-container>
    </v-main>
  </v-app>
</template>

<style scoped>
.app-bar {
  backdrop-filter: blur(10px);
  background: rgba(8, 16, 30, 0.86);
  border-bottom: 1px solid rgba(140, 161, 189, 0.2);
}

.brand-title {
  height: 100%;
  display: flex;
  align-items: center;
}

.brand-title :deep(.v-toolbar-title__placeholder) {
  height: 100%;
  display: flex;
  align-items: center;
}

.brand-wrap {
  display: inline-flex;
  align-items: center;
  gap: 12px;
}

.brand-text {
  line-height: 1;
  display: inline-flex;
  align-items: center;
}

.logo-bolt {
  width: 30px;
  height: 30px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.logo-bolt svg {
  width: 100%;
  height: 100%;
  display: block;
}

.section-row {
  margin: 0 -10px 4px;
}

.section-col {
  padding: 10px;
}

.map-exceptions-row {
  align-items: stretch;
}

.map-col,
.side-col {
  display: flex;
}

.map-col {
  flex: 0 0 66.6667%;
  max-width: 66.6667%;
}

.side-col {
  flex: 0 0 33.3333%;
  max-width: 33.3333%;
}

.month-select {
  max-width: 220px;
}

.metric-card,
.panel-card {
  background: #212222;
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.02);
}

.metric-card :deep(.v-card-item),
.panel-card :deep(.v-card-item) {
  padding: 20px 20px 8px;
}

.metric-card :deep(.v-card-text),
.panel-card :deep(.v-card-text) {
  padding: 0 20px 20px;
}

.panel-card :deep(.v-card-subtitle) {
  padding: 0 20px 12px;
  color: #8fa5c4;
}

.panel-head {
  padding-bottom: 8px;
}

.metric-value {
  font-size: 2.15rem;
  font-weight: 700;
  line-height: 1.1;
  margin-bottom: 8px;
}

.summary-icon {
  color: #ffffff;
  font-size: 1.2rem;
  margin-right: 4px;
}

.metric-title {
  font-size: 0.72rem;
  letter-spacing: 0.13em;
  text-transform: uppercase;
  color: #9ab0cc;
  font-weight: 700;
}

.metric-delta,
.single-delta {
  display: flex;
  align-items: center;
  font-size: 0.9rem;
}

.chart-wrap {
  height: 300px;
}

.single-metric-wrap {
  min-height: 300px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: flex-start;
  gap: 10px;
}

.single-rate {
  font-size: 3rem;
  font-weight: 700;
  line-height: 1;
}

.map-wrap {
  position: relative;
  display: flex;
  align-items: stretch;
  gap: 14px;
  height: 100%;
  min-height: 460px;
}

.map-card :deep(.v-card-text) {
  display: flex;
  flex: 1;
  min-height: 0;
}

.map-card {
  display: flex;
  flex-direction: column;
  width: 100%;
}

.regional-map {
  flex: 1;
  width: 100%;
  height: 100%;
  max-height: none;
  min-height: 0;
}

.region-shape {
  stroke: rgba(226, 238, 255, 0.48);
  stroke-width: 0.8;
  transition: opacity 0.2s ease, transform 0.2s ease;
  cursor: pointer;
}

.region-shape:hover {
  opacity: 0.92;
  transform: translateY(-1px);
}

.map-tooltip {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(6, 14, 28, 0.95);
  border: 1px solid rgba(142, 165, 196, 0.3);
  border-radius: 10px;
  padding: 10px 12px;
}

.tooltip-title {
  font-weight: 700;
}

.tooltip-value {
  color: #acc4e8;
  font-size: 0.9rem;
}

.map-scale-vertical {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
}

.map-scale-bar-vertical {
  width: 12px;
  height: 136px;
  border-radius: 999px;
  border: 1px solid rgba(180, 199, 228, 0.35);
  background: linear-gradient(180deg, #0f274f 0%, #95bbff 100%);
}

.map-scale-label {
  font-size: 0.75rem;
  letter-spacing: 0.06em;
  text-transform: uppercase;
  color: #9bb2d1;
}

.map-scale-value {
  font-size: 0.82rem;
  color: #aac1df;
  line-height: 1;
}

.side-stack {
  display: flex;
  flex-direction: column;
  gap: 20px;
  width: 100%;
}

.side-stack > .panel-card {
  flex: 1;
  min-height: 0;
}

.donut-card-body {
  display: grid;
  grid-template-columns: minmax(140px, 1fr) minmax(150px, 1fr);
  gap: 14px;
  align-items: center;
}

.donut-wrap {
  height: 170px;
}

.donut-legend {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.donut-legend-row {
  display: grid;
  grid-template-columns: 10px 1fr auto;
  align-items: center;
  gap: 8px;
}

.donut-dot {
  width: 10px;
  height: 10px;
  border-radius: 999px;
}

.donut-label {
  color: #c7d8ef;
  font-size: 0.86rem;
}

.donut-value {
  color: #e5efff;
  font-size: 0.86rem;
  font-weight: 600;
}

.exceptions-table {
  background: transparent;
}

.exceptions-table-wrap {
  padding: 0 20px 20px;
}

.exceptions-table :deep(th),
.exceptions-table :deep(td) {
  padding-left: 14px;
  padding-right: 14px;
}

.exceptions-table :deep(th:first-child),
.exceptions-table :deep(td:first-child) {
  padding-left: 0;
}

.exceptions-table :deep(th:last-child),
.exceptions-table :deep(td:last-child) {
  padding-right: 0;
}

.severity-pill {
  display: inline-flex;
  border-radius: 999px;
  padding: 3px 12px;
  font-weight: 600;
  font-size: 0.85rem;
}

.severity-low {
  color: #8be7c8;
  background: rgba(72, 195, 155, 0.16);
}

.severity-medium {
  color: #f7cd82;
  background: rgba(237, 164, 56, 0.18);
}

.severity-high {
  color: #ffadaf;
  background: rgba(225, 77, 91, 0.2);
}

@media (max-width: 960px) {
  .month-select {
    max-width: 170px;
  }

  .single-rate {
    font-size: 2.4rem;
  }

  .map-scale-vertical {
    gap: 6px;
  }

  .map-wrap {
    min-height: 360px;
  }

  .side-stack {
    gap: 12px;
  }

  .donut-card-body {
    grid-template-columns: 1fr;
  }

  .donut-wrap {
    height: 150px;
  }
}

@media (max-width: 1279px) {
  .map-col,
  .side-col {
    flex: 0 0 100%;
    max-width: 100%;
  }
}
</style>
