// Ticket rules per department. These are SAMPLE rules until MAOP provides examples of
// complete and incomplete tickets; see docs/rules.md. Change rules here only.

export type Department = "it" | "engineering";

export interface Field {
  id: string;
  label: string;
  /** Checked in code: an empty required field makes the ticket invalid without asking the AI. */
  required: boolean;
  /** Asked when the field is required and empty. */
  question: string;
}

export interface Rule {
  id: string;
  label: string;
  /** Field the rule is mostly about. If that field is required and empty, the code check already reports it and the AI skips the rule. */
  field: string;
  /** What the AI checks, judged against the whole ticket. */
  criterion: string;
  /** Default follow-up question when the rule is not met. */
  question: string;
}

export interface DepartmentRules {
  label: string;
  fields: Field[];
  rules: Rule[];
}

export const RULES: Record<Department, DepartmentRules> = {
  it: {
    label: "IT (notranja podpora: računalniki, računi, omrežje, tiskalniki)",
    fields: [
      { id: "summary", label: "Kratek naslov", required: true, question: "V enem stavku: kaj je narobe?" },
      { id: "system", label: "Naprava ali storitev", required: true, question: "Katera naprava, program ali storitev ne deluje?" },
      { id: "description", label: "Opis težave", required: true, question: "Opišite, kaj se zgodi, ko poskusite delati." },
      { id: "errorMessage", label: "Sporočilo o napaki", required: false, question: "Ali se prikaže sporočilo o napaki? Če da, ga prepišite." },
      { id: "since", label: "Od kdaj", required: false, question: "Od kdaj težava traja?" },
    ],
    rules: [
      {
        id: "it.system",
        label: "Prizadeta naprava ali storitev",
        field: "system",
        criterion:
          "Jasno je, katera konkretna naprava, program, storitev ali račun ne deluje (npr. »Outlook na službenem prenosniku«). Splošno »računalnik« ali »sistem« ni dovolj.",
        question: "Katera naprava ali storitev točno ne deluje (ime programa, naprave ali računa)?",
      },
      {
        id: "it.problem",
        label: "Konkreten opis težave",
        field: "description",
        criterion:
          "Opis pove, kaj se konkretno zgodi oziroma ne zgodi. Izjave, kot so »ne dela«, »ne gre«, »nekaj je narobe«, niso dovolj.",
        question: "Kaj točno se zgodi, ko poskusite? Kaj vidite na zaslonu?",
      },
      {
        id: "it.error",
        label: "Sporočilo o napaki",
        field: "errorMessage",
        criterion:
          "Zahtevek navaja besedilo sporočila o napaki ali izrecno pove, da se sporočilo ne prikaže.",
        question: "Ali se prikaže sporočilo o napaki? Če da, ga prepišite; če ne, to napišite.",
      },
      {
        id: "it.since",
        label: "Kdaj se je začelo",
        field: "since",
        criterion: "Zahtevek pove, od kdaj težava traja ali kdaj se je pojavila.",
        question: "Od kdaj težava traja? Je prej delovalo?",
      },
    ],
  },
  engineering: {
    label: "Inženiring (težave v programih, ki jih razvija MAOP)",
    fields: [
      { id: "summary", label: "Kratek naslov", required: true, question: "V enem stavku: kaj je narobe?" },
      { id: "program", label: "Program in verzija", required: true, question: "Kateri program in katera verzija?" },
      { id: "module", label: "Modul", required: false, question: "V katerem modulu se težava pojavi?" },
      { id: "description", label: "Opis težave", required: true, question: "Opišite, kaj se zgodi." },
      { id: "steps", label: "Koraki za ponovitev", required: false, question: "Po katerih korakih se težava ponovi?" },
      { id: "errorMessage", label: "Sporočilo o napaki", required: false, question: "Ali se prikaže sporočilo o napaki? Če da, ga prepišite." },
      { id: "expected", label: "Pričakovano delovanje", required: false, question: "Kaj bi se moralo zgoditi?" },
    ],
    rules: [
      {
        id: "eng.program",
        label: "Program, verzija in modul",
        field: "program",
        criterion:
          "Zahtevek navaja ime programa, konkretno številko verzije in modul, v katerem se težava pojavi. »Zadnja verzija« ali samo ime programa ni dovolj.",
        question: "Kateri program, katera verzija (številka) in kateri modul?",
      },
      {
        id: "eng.problem",
        label: "Konkreten opis težave",
        field: "description",
        criterion:
          "Opis pove, kaj se konkretno zgodi (dejansko delovanje). Izjave, kot so »ne dela«, »ne gre«, »je počasno« brez podrobnosti, niso dovolj.",
        question: "Kaj točno se zgodi? Kaj vidite na zaslonu?",
      },
      {
        id: "eng.steps",
        label: "Koraki za ponovitev",
        field: "steps",
        criterion:
          "Zahtevek opiše korake ali dejanje, po katerem se težava pojavi, ali izrecno pove, da se pojavi naključno.",
        question: "Kaj ste naredili, preden se je težava pojavila? Naštejte korake.",
      },
      {
        id: "eng.error",
        label: "Sporočilo o napaki",
        field: "errorMessage",
        criterion:
          "Zahtevek navaja besedilo sporočila o napaki ali izrecno pove, da se sporočilo ne prikaže.",
        question: "Ali se prikaže sporočilo o napaki? Če da, ga prepišite; če ne, to napišite.",
      },
      {
        id: "eng.expected",
        label: "Pričakovano delovanje",
        field: "expected",
        criterion:
          "Iz zahtevka je jasno, kaj bi se moralo zgoditi namesto tega, kar se zgodi (lahko je očitno iz opisa, npr. »poročilo se ne naloži«).",
        question: "Kaj bi se moralo zgoditi?",
      },
    ],
  },
};

export function isDepartment(value: unknown): value is Department {
  return typeof value === "string" && Object.hasOwn(RULES, value);
}
