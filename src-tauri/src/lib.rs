use tauri::Manager;
use tauri_plugin_sql::{Migration, MigrationKind};

mod sync_server;

#[derive(serde::Serialize)]
struct SyncInfo {
    ip: String,
    port: u16,
    running: bool,
}

#[tauri::command]
fn get_sync_info() -> SyncInfo {
    let ip = local_ip_address::local_ip()
        .map(|ip| ip.to_string())
        .unwrap_or_else(|_| "unknown".to_string());
    SyncInfo {
        ip,
        port: 8108,
        running: true,
    }
}

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
        Migration {
            version: 3,
            description: "add crdt_state and deletions table for sync",
            sql: "ALTER TABLE notes ADD COLUMN crdt_state BLOB;
            CREATE TABLE IF NOT EXISTS deletions (
                note_id TEXT PRIMARY KEY NOT NULL,
                deleted_at TEXT NOT NULL
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
        .plugin(tauri_plugin_process::init())
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![get_sync_info])
        .setup(|app| {
            let app_handle = app.handle().clone();

            // Resolve database path
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let db_path = app_data_dir.join("bodhi.db");

            // Resolve PWA directory from bundled resources
            let pwa_dir = app.path().resource_dir()
                .ok()
                .map(|r| r.join("pwa-dist"));

            // Start sync server in background
            tauri::async_runtime::spawn(async move {
                if let Err(e) = sync_server::start_sync_server(
                    db_path,
                    pwa_dir,
                    Some(app_handle),
                ).await {
                    eprintln!("Sync server error: {}", e);
                }
            });

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
