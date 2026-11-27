// Spike: proves the create dialog can reach the Worker through the uim-resolver backend.
// On open it pings the Worker and shows the outcome as the Summary field's help text.
import { call } from "../../../src/frontend/call";
import { uiModificationsApi } from "@forge/jira-bridge";

type Ping = { ok: true; data: { departments: number; mode: string } } | { ok: false; error: string };

uiModificationsApi.onInit(
  async ({ api }) => {
    const summary = api.getFieldById("summary");
    if (!summary) return;
    try {
      const ping = await call<Ping>("pingWorker");
      summary.setDescription(
        ping.ok
          ? `Preverjanje povezano (oddelkov: ${ping.data.departments}, način: ${ping.data.mode}).`
          : `Preverjanje ni na voljo: ${ping.error}`,
      );
    } catch (error) {
      summary.setDescription(`Preverjanje ni na voljo: ${String(error)}`);
    }
  },
  () => ["summary"],
);

uiModificationsApi.onError(({ errors }) => {
  console.error("intake checks", errors);
});
