<script setup lang="ts">
import { computed, onMounted, reactive, ref } from "vue";
import { api, type Department, type Missing, type RulesResponse, type SubmitResponse, type ValidationResult } from "./api";

const rules = ref<RulesResponse | null>(null);
const loadError = ref("");
const department = ref<Department | null>(null);
const values = reactive<Record<string, string>>({});

const result = ref<ValidationResult | null>(null);
const checkedSnapshot = ref("");
const checks = ref(0);
const firstValid = ref<boolean | null>(null);
const checking = ref(false);
const submitting = ref(false);
const actionError = ref("");
const submitted = ref<SubmitResponse | null>(null);

onMounted(async () => {
  try {
    rules.value = await api.rules();
  } catch (err) {
    loadError.value = (err as Error).message;
  }
});

const fields = computed(() => (department.value && rules.value ? rules.value.departments[department.value].fields : []));

function currentFields(): Record<string, string> {
  return Object.fromEntries(fields.value.map((f) => [f.id, values[f.id] ?? ""]));
}

const snapshot = computed(() => JSON.stringify([department.value, currentFields()]));
const stale = computed(() => result.value !== null && snapshot.value !== checkedSnapshot.value);
const freshResult = computed(() => (stale.value ? null : result.value));

const missingByField = computed(() => {
  const map: Record<string, Missing[]> = {};
  for (const item of freshResult.value?.missing ?? []) (map[item.field] ??= []).push(item);
  return map;
});

const hasSummary = computed(() => (values.summary ?? "").trim() !== "");

function chooseDepartment(dept: Department) {
  department.value = dept;
  actionError.value = "";
}

async function check() {
  if (!department.value) return;
  checking.value = true;
  actionError.value = "";
  const sentSnapshot = snapshot.value;
  try {
    const res = await api.validate(department.value, currentFields());
    if (checks.value === 0) firstValid.value = res.valid;
    checks.value++;
    result.value = res;
    checkedSnapshot.value = sentSnapshot;
  } catch (err) {
    actionError.value = (err as Error).message;
  } finally {
    checking.value = false;
  }
}

async function submit() {
  if (!department.value || !hasSummary.value) return;
  submitting.value = true;
  actionError.value = "";
  try {
    submitted.value = await api.submit(department.value, currentFields(), checks.value, firstValid.value);
  } catch (err) {
    actionError.value = (err as Error).message;
  } finally {
    submitting.value = false;
  }
}

function startOver() {
  for (const key of Object.keys(values)) delete values[key];
  department.value = null;
  result.value = null;
  checkedSnapshot.value = "";
  checks.value = 0;
  firstValid.value = null;
  submitted.value = null;
  actionError.value = "";
}
</script>

<template>
  <p v-if="loadError" class="notice notice-error">Obrazca ni bilo mogoče naložiti: {{ loadError }}</p>

  <section v-else-if="submitted" class="done">
    <h1>Zahtevek {{ submitted.key }} je oddan</h1>
    <p v-if="submitted.mode === 'demo'" class="notice">
      Jira še ni povezana, zato je zahtevek shranjen samo v tej aplikaciji (demo oznaka {{ submitted.key }}).
    </p>
    <p v-else-if="submitted.url"><a :href="submitted.url" target="_blank" rel="noopener">Odpri zahtevek v Jiri</a></p>

    <template v-if="submitted.result.valid === false">
      <p class="lead">
        Zahtevek je oddan, vendar mu manjkajo spodnji podatki. Prejemnik vas bo verjetno vprašal zanje,
        zato jih imejte pripravljene.
      </p>
      <ul class="missing-list">
        <li v-for="item in submitted.result.missing" :key="item.rule">
          <strong>{{ item.label }}</strong>
          <span>{{ item.question }}</span>
        </li>
      </ul>
    </template>
    <p v-else-if="submitted.result.valid === null" class="lead">
      Popolnosti zahtevka ni bilo mogoče preveriti, zato je označen kot nepreverjen.
    </p>
    <p v-else class="lead">Zahtevek vsebuje vse, kar prejemnik potrebuje.</p>

    <button type="button" class="button" @click="startOver">Nova prijava</button>
  </section>

  <div v-else-if="rules" class="layout">
    <form class="ticket" @submit.prevent="check">
      <h1>Nova prijava</h1>

      <fieldset class="departments">
        <legend>Komu je zahtevek namenjen?</legend>
        <label v-for="(dept, id) in rules.departments" :key="id" class="department" :class="{ active: department === id }">
          <input type="radio" name="department" :value="id" :checked="department === id" @change="chooseDepartment(id)" />
          <span class="department-name">{{ dept.label }}</span>
          <span class="department-hint">{{ dept.description }}</span>
        </label>
      </fieldset>

      <template v-if="department">
        <div v-for="field in fields" :key="field.id" class="field" :class="{ flagged: missingByField[field.id] }">
          <label :for="`f-${field.id}`">
            {{ field.label }}
            <span v-if="!field.required" class="optional">neobvezno</span>
          </label>
          <textarea
            v-if="field.multiline"
            :id="`f-${field.id}`"
            v-model="values[field.id]"
            rows="4"
            :aria-describedby="missingByField[field.id] ? `q-${field.id}` : undefined"
          />
          <input
            v-else
            :id="`f-${field.id}`"
            v-model="values[field.id]"
            type="text"
            :aria-describedby="missingByField[field.id] ? `q-${field.id}` : undefined"
          />
          <div v-if="missingByField[field.id]" :id="`q-${field.id}`" class="question">
            <p v-for="item in missingByField[field.id]" :key="item.rule">{{ item.question }}</p>
          </div>
        </div>
      </template>
    </form>

    <aside v-if="department" class="check" aria-live="polite">
      <h2>Preverjanje</h2>

      <p v-if="checking" class="status">Preverjam zahtevek …</p>
      <p v-else-if="!result" class="status">
        Preden oddate, preverite, ali zahtevek vsebuje vse, kar prejemnik potrebuje.
      </p>
      <p v-else-if="stale" class="status">Zahtevek ste spremenili. Preverite ga znova.</p>
      <template v-else-if="freshResult">
        <p v-if="freshResult.valid === true" class="status status-ok">Zahtevek je popoln.</p>
        <template v-else-if="freshResult.valid === false">
          <p class="status status-missing">
            Manjka {{ freshResult.missing.length }}
            {{ freshResult.missing.length === 1 ? "podatek" : freshResult.missing.length === 2 ? "podatka" : freshResult.missing.length < 5 ? "podatki" : "podatkov" }}.
            Vprašanja so pri poljih.
          </p>
          <ul class="checklist">
            <li v-for="item in freshResult.missing" :key="item.rule">
              <a :href="`#f-${item.field}`">{{ item.label }}</a>
              <span>{{ item.reason }}</span>
            </li>
          </ul>
        </template>
        <template v-else>
          <p class="status status-unknown">Popolnosti ni bilo mogoče preveriti.</p>
          <ul v-if="freshResult.missing.length" class="checklist">
            <li v-for="item in freshResult.missing" :key="item.rule">
              <a :href="`#f-${item.field}`">{{ item.label }}</a>
              <span>{{ item.reason }}</span>
            </li>
          </ul>
          <p class="small">Zahtevek lahko vseeno oddate; označen bo kot nepreverjen.</p>
        </template>
      </template>

      <div class="actions">
        <button type="button" class="button" :disabled="checking || submitting" @click="check">
          {{ result ? "Preveri znova" : "Preveri zahtevek" }}
        </button>
        <button type="button" class="button button-quiet" :disabled="checking || submitting || !hasSummary" @click="submit">
          {{ submitting ? "Oddajam …" : "Oddaj zahtevek" }}
        </button>
      </div>
      <p v-if="!hasSummary" class="small">Za oddajo vpišite vsaj kratek naslov.</p>
      <p v-else-if="freshResult?.valid === false" class="small">
        Zahtevek lahko oddate tudi nepopoln, vendar bo prejemnik verjetno vprašal za manjkajoče podatke.
      </p>
      <p v-if="actionError" class="notice notice-error">{{ actionError }}</p>
      <p v-if="rules.jira === 'demo'" class="small demo">Jira še ni povezana: oddani zahtevki se shranijo samo v tej aplikaciji.</p>
    </aside>
  </div>

  <p v-else class="status">Nalagam obrazec …</p>
</template>
