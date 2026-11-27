import { call } from "./call";
import ForgeReconciler, { Button, Checkbox, Heading, SectionMessage, Spinner, Stack, Text } from "@forge/react";
import React, { useEffect, useState } from "react";
import type { Context, ProjectOption } from "../admin";

const keyOf = (c: Context) => `${c.projectId}:${c.issueTypeId}`;

function App() {
  const [projects, setProjects] = useState<ProjectOption[] | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    Promise.all([call<ProjectOption[]>("listProjects"), call<Context[]>("getContexts")])
      .then(([list, contexts]) => {
        setProjects(list);
        setSelected(new Set(contexts.map(keyOf)));
      })
      .catch((error: unknown) => setMessage({ ok: false, text: `Nalaganje ni uspelo: ${String(error)}` }));
  }, []);

  const toggle = (key: string) =>
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });

  const save = async () => {
    setSaving(true);
    setMessage(null);
    const contexts = [...selected].map((key) => {
      const [projectId, issueTypeId] = key.split(":");
      return { projectId, issueTypeId };
    });
    try {
      const result = await call<{ saved: number }>("saveContexts", { contexts });
      setMessage({ ok: true, text: `Shranjeno: preverjanje je vklopljeno za ${result.saved} kombinacij.` });
    } catch (error) {
      setMessage({ ok: false, text: `Shranjevanje ni uspelo: ${String(error)}` });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Stack space="space.200">
      <Heading size="medium">Preverjanje zahtevkov</Heading>
      <Text>Izberite projekte in vrste zahtevkov, pri katerih okno Ustvari preverja popolnost zahtevka.</Text>
      {message && (
        <SectionMessage appearance={message.ok ? "success" : "error"}>
          <Text>{message.text}</Text>
        </SectionMessage>
      )}
      {projects === null ? (
        <Spinner />
      ) : (
        projects.map((project) => (
          <Stack key={project.id} space="space.050">
            <Text>
              {project.name} ({project.key})
            </Text>
            {project.issueTypes.map((type) => {
              const key = keyOf({ projectId: project.id, issueTypeId: type.id });
              return <Checkbox key={key} label={type.name} isChecked={selected.has(key)} onChange={() => toggle(key)} />;
            })}
          </Stack>
        ))
      )}
      <Button appearance="primary" isDisabled={projects === null || saving} onClick={save}>
        Shrani
      </Button>
    </Stack>
  );
}

ForgeReconciler.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
