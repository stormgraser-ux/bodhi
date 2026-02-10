export interface NotePreset {
  id: string;
  label: string;
  icon: string;
  body: string | (() => string);
  tag?: string;
}

export function getPresetBody(preset: NotePreset): string {
  return typeof preset.body === "function" ? preset.body() : preset.body;
}

export const NOTE_PRESETS: NotePreset[] = [
  {
    id: "blank",
    label: "Blank",
    icon: "\u00B7",
    body: "",
  },
  {
    id: "checklist",
    label: "Checklist",
    icon: "\u2611",
    tag: "checklist",
    body: "- [ ] \u200B\n- [ ] \u200B\n- [ ] \u200B\n",
  },
  {
    id: "journal",
    label: "Journal",
    icon: "\u2638",
    tag: "journal",
    body: "## What is present today?\n\n\u200B\n\n## What am I grateful for?\n\n\u200B\n\n## What am I setting aside?\n\n\u200B\n",
  },
  {
    id: "meeting",
    label: "Meeting",
    icon: "\u25CB",
    tag: "meeting",
    body: () => {
      const date = new Date().toLocaleDateString();
      return `## ${date}\n\n### Attendees\n\n- \u200B\n\n### Discussion\n\n- \u200B\n\n### Action Items\n\n- [ ] \u200B\n- [ ] \u200B\n`;
    },
  },
  {
    id: "cornell",
    label: "Cornell",
    icon: "\u25A1",
    tag: "cornell",
    body: "## Topic\n\n\u200B\n\n### Cues & Questions\n\n- \u200B\n\n### Notes\n\n- \u200B\n\n---\n\n### Summary\n\n\u200B\n",
  },
];
