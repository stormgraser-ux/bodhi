use tauri_plugin_sql::{Migration, MigrationKind};

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let migrations = vec![
        Migration {
            version: 1,
            description: "create notes and tags tables",
            sql: "CREATE TABLE notes (
                id TEXT PRIMARY KEY NOT NULL,
                title TEXT NOT NULL DEFAULT '',
                body TEXT NOT NULL DEFAULT '',
                created_at TEXT NOT NULL,
                updated_at TEXT NOT NULL
            );
            CREATE TABLE note_tags (
                note_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                PRIMARY KEY (note_id, tag),
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
        Migration {
            version: 2,
            description: "ensure note_tags table exists",
            sql: "CREATE TABLE IF NOT EXISTS note_tags (
                note_id TEXT NOT NULL,
                tag TEXT NOT NULL,
                PRIMARY KEY (note_id, tag),
                FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
            );",
            kind: MigrationKind::Up,
        },
    ];

    tauri::Builder::default()
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:bodhi.db", migrations)
                .build(),
        )
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
