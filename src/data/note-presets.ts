export interface NotePreset {
  id: string;
  label: string;
  icon: string;
  body: string | (() => string);
  /** TipTap JSON content — bypasses markdown parsing for reliable rendering */
  tiptapContent?: Record<string, unknown> | (() => Record<string, unknown>);
  tag?: string;
}

export function getPresetBody(preset: NotePreset): string {
  return typeof preset.body === "function" ? preset.body() : preset.body;
}

export function getPresetTiptapContent(preset: NotePreset): Record<string, unknown> | undefined {
  if (!preset.tiptapContent) return undefined;
  return typeof preset.tiptapContent === "function" ? preset.tiptapContent() : preset.tiptapContent;
}

// Helpers for building TipTap JSON nodes
function heading(level: number, text: string) {
  return { type: "heading", attrs: { level }, content: [{ type: "text", text }] };
}
function paragraph(text = "") {
  if (!text) return { type: "paragraph" };
  return { type: "paragraph", content: [{ type: "text", text }] };
}
function bulletList(...items: string[]) {
  return {
    type: "bulletList",
    content: items.map((t) => ({
      type: "listItem",
      content: [paragraph(t)],
    })),
  };
}
function taskList(...items: string[]) {
  return {
    type: "taskList",
    content: items.map((t) => ({
      type: "taskItem",
      attrs: { checked: false },
      content: [paragraph(t)],
    })),
  };
}
function hr() {
  return { type: "horizontalRule" };
}

/** Section card: blockquote wrapping a heading label + content area */
function section(title: string, ...content: Record<string, unknown>[]) {
  return {
    type: "blockquote",
    content: [
      heading(3, title),
      ...(content.length ? content : [paragraph()]),
    ],
  };
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
    tiptapContent: {
      type: "doc",
      content: [
        taskList("", "", ""),
      ],
    },
  },
  {
    id: "journal",
    label: "Journal",
    icon: "\u2638",
    tag: "journal",
    body: "> ### What is present today?\n>\n\n> ### What am I grateful for?\n>\n\n> ### What am I setting aside?\n>\n",
    tiptapContent: {
      type: "doc",
      content: [
        section("What is present today?"),
        section("What am I grateful for?"),
        section("What am I setting aside?"),
      ],
    },
  },
  {
    id: "meeting",
    label: "Meeting",
    icon: "\u25CB",
    tag: "meeting",
    body: () => {
      const date = new Date().toLocaleDateString();
      return `## ${date}\n\n> ### Attendees\n>\n> - \n\n> ### Discussion\n>\n> - \n\n> ### Action Items\n>\n> - [ ] \n> - [ ] \n`;
    },
    tiptapContent: () => {
      const date = new Date().toLocaleDateString();
      return {
        type: "doc",
        content: [
          heading(2, date),
          section("Attendees", bulletList("")),
          section("Discussion", bulletList("")),
          section("Action Items", taskList("", "")),
        ],
      };
    },
  },
  {
    id: "cornell",
    label: "Cornell",
    icon: "\u25A1",
    tag: "cornell",
    body: "> ### Topic\n>\n\n> ### Cues & Questions\n>\n> - \n\n> ### Notes\n>\n> - \n\n---\n\n> ### Summary\n>\n",
    tiptapContent: {
      type: "doc",
      content: [
        section("Topic"),
        section("Cues & Questions", bulletList("")),
        section("Notes", bulletList("")),
        hr(),
        section("Summary"),
      ],
    },
  },
];
