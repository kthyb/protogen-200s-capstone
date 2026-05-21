<script setup lang="ts">
import { Bar } from 'vue-chartjs'
import {
  Chart as ChartJS,
  Title,
  Tooltip,
  Legend,
  BarElement,
  CategoryScale,
  LinearScale,
} from 'chart.js'

ChartJS.register(Title, Tooltip, Legend, BarElement, CategoryScale, LinearScale)

const chartData = {
  labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
  datasets: [
    {
      label: 'Sales',
      backgroundColor: '#1976D2',
      data: [40, 39, 10, 40, 39, 80],
    },
  ],
}

const chartOptions = {
  responsive: true,
  maintainAspectRatio: false,
}
</script>

<template>
  <v-container>
    <v-card>
      <v-card-title>Monthly Sales</v-card-title>
      <v-card-text>
        <div style="height: 400px">
          <Bar :data="chartData" :options="chartOptions" />
        </div>
      </v-card-text>
    </v-card>
  </v-container>
</template>
