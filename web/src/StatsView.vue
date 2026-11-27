<script setup lang="ts">
import { onMounted, ref } from "vue";
import { api, type GroupStats, type StatsResponse } from "./api";
import { formatDate, formatHours, formatNumber, formatShare, verdictText } from "./format";

const data = ref<StatsResponse | null>(null);
const error = ref("");
const syncing = ref(false);
const syncMessage = ref("");

async function load() {
  try {
    data.value = await api.stats();
    error.value = "";
  } catch (err) {
    error.value = (err as Error).message;
  }
}

async function sync() {
  syncing.value = true;
  syncMessage.value = "";
  try {
    const res = await api.syncJira();
    syncMessage.value =
      res.failed > 0
        ? `Osveženih ${res.synced} zahtevkov, ${res.failed} ni uspelo (podrobnosti so v dnevniku strežnika).`
        : `Osveženih ${res.synced} zahtevkov.`;
    await load();
  } catch (err) {
    syncMessage.value = (err as Error).message;
  } finally {
    syncing.value = false;
  }
}

onMounted(load);

const known = (g: GroupStats["firstCheck"]) => g.valid + g.invalid;

function groups(d: StatsResponse): [string, GroupStats][] {
  return [
    ["IT", d.it],
    ["Inženiring", d.engineering],
    ["Skupaj", d.total],
  ];
}
</script>

<template>
  <section class="stats">
    <h1>Statistika zahtevkov</h1>
    <p v-if="error" class="notice notice-error">Statistike ni bilo mogoče naložiti: {{ error }}</p>
    <p v-else-if="!data" class="status">Nalagam statistiko …</p>

    <template v-else>
      <p v-if="data.total.submissions === 0" class="lead">
        Oddanih zahtevkov še ni. Ko bo prvi oddan prek <a href="/">obrazca</a>, se bo prikazal tukaj.
      </p>

      <template v-else>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Oddelek</th>
                <th scope="col">Oddanih</th>
                <th scope="col">Popolnih ob prvem preverjanju</th>
                <th scope="col">Popolnih ob oddaji</th>
                <th scope="col">Povprečno preverjanj</th>
                <th scope="col">Čas obravnave (mediana)</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="[name, g] in groups(data)" :key="name" :class="{ total: name === 'Skupaj' }">
                <th scope="row">{{ name }}</th>
                <td>{{ g.submissions }}</td>
                <td>
                  {{ formatShare(g.firstCheck.valid, known(g.firstCheck)) }}
                  <span v-if="g.firstCheck.unknown" class="small">, {{ g.firstCheck.unknown }} nepreverjenih</span>
                </td>
                <td>
                  {{ formatShare(g.final.valid, known(g.final)) }}
                  <span v-if="g.final.unknown" class="small">, {{ g.final.unknown }} nepreverjenih</span>
                </td>
                <td>{{ formatNumber(g.averageChecks) }}</td>
                <td>
                  {{ formatHours(g.handling.medianHours) }}
                  <span v-if="g.handling.resolved" class="small">iz {{ g.handling.resolved }} rešenih</span>
                </td>
              </tr>
            </tbody>
          </table>
        </div>

        <p class="small">
          Deleži upoštevajo le preverjene zahtevke. Čas obravnave je čas od nastanka do rešitve v Jiri;
          <template v-if="data.jira === 'demo'">
            Jira še ni povezana, zato časa obravnave ni ({{ data.total.handling.demo }} demo zahtevkov).
          </template>
          <template v-else>Nerešenih v Jiri: {{ data.total.handling.unresolved }}.</template>
        </p>
      </template>

      <div class="actions">
        <button type="button" class="button button-quiet" :disabled="syncing || data.jira === 'demo'" @click="sync">
          {{ syncing ? "Osvežujem …" : "Osveži čase iz Jire" }}
        </button>
      </div>
      <p v-if="syncMessage" class="small">{{ syncMessage }}</p>

      <template v-if="data.recent.length">
        <h2>Zadnji zahtevki</h2>
        <div class="table-wrap">
          <table>
            <thead>
              <tr>
                <th scope="col">Zahtevek</th>
                <th scope="col">Oddan</th>
                <th scope="col">Oddelek</th>
                <th scope="col">Naslov</th>
                <th scope="col">Prvo preverjanje</th>
                <th scope="col">Ob oddaji</th>
                <th scope="col">Manjkalo</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="r in data.recent" :key="r.id">
                <td>{{ r.jiraKey ?? "ni ključa" }}</td>
                <td>{{ formatDate(r.createdAt) }}</td>
                <td>{{ r.department === "it" ? "IT" : "Inženiring" }}</td>
                <td>{{ r.summary }}</td>
                <td>{{ r.checks === 0 ? "oddan brez preverjanja" : verdictText(r.firstValid) }}</td>
                <td :class="`verdict-${verdictText(r.finalValid).replace(' ', '-')}`">{{ verdictText(r.finalValid) }}</td>
                <td>{{ r.missing.join(", ") || "nič" }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>
    </template>
  </section>
</template>
