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
    body: "- [ ] \n- [ ] \n- [ ] \n",
  },
  {
    id: "journal",
    label: "Journal",
    icon: "\u2638",
    tag: "journal",
    body: "## What is present today?\n\n\n\n## What am I grateful for?\n\n\n\n## What am I setting aside?\n\n",
  },
  {
    id: "meeting",
    label: "Meeting",
    icon: "\u25CB",
    tag: "meeting",
    body: () => {
      const date = new Date().toLocaleDateString();
      return `**Date:** ${date}\n\n**Attendees:**\n- \n\n## Discussion\n\n- \n\n## Action Items\n\n- [ ] \n- [ ] \n`;
    },
  },
  {
    id: "cornell",
    label: "Cornell",
    icon: "\u25A1",
    tag: "cornell",
    body: "## Topic\n\n\n\n## Cues & Questions\n\n- \n\n## Notes\n\n- \n\n---\n\n## Summary\n\n",
  },
];
