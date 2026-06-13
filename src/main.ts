import { createApp } from 'vue';
import { createRouter, createWebHashHistory } from 'vue-router';
import App from './App.vue';
import './style.css';

import TimelineView from './views/TimelineView.vue';
import ExecutionView from './views/ExecutionView.vue';
import OverviewView from './views/OverviewView.vue';

const routes = [
  { path: '/', component: TimelineView },
  { path: '/overview', component: OverviewView },
  { path: '/execution', component: ExecutionView },
];

const router = createRouter({
  history: createWebHashHistory(),
  routes,
});

const app = createApp(App);
app.use(router);
app.mount('#app');
