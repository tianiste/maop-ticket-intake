<script setup lang="ts">
import StatsView from "./StatsView.vue";
import TicketForm from "./TicketForm.vue";

const page = window.location.pathname.startsWith("/statistika") ? "stats" : "form";
</script>

<template>
  <header class="topbar">
    <span class="brand">MAOP podpora</span>
    <nav>
      <a href="/" :aria-current="page === 'form' ? 'page' : undefined">Nova prijava</a>
      <a href="/statistika" :aria-current="page === 'stats' ? 'page' : undefined">Statistika</a>
    </nav>
  </header>
  <main>
    <TicketForm v-if="page === 'form'" />
    <StatsView v-else />
  </main>
</template>
