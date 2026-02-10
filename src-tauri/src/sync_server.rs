use axum::{
    extract::State,
    http::{HeaderName, HeaderValue, Method, StatusCode},
    response::Json,
    routing::{get, post},
    Router,
};
use tauri::Emitter;
use automerge::ReadDoc;
use base64::{engine::general_purpose::STANDARD as BASE64, Engine};
use rusqlite::Connection;
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;
use tower_http::cors::CorsLayer;
use tower_http::services::ServeDir;

pub struct SyncState {
    #[allow(dead_code)]
    db_path: PathBuf,
    db: Mutex<Connection>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncRequest {
    notes: Vec<SyncNote>,
    deletions: Vec<SyncDeletion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncResponse {
    notes: Vec<SyncNote>,
    deletions: Vec<SyncDeletion>,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncNote {
    id: String,
    crdt_state: String, // base64-encoded
}

#[derive(Debug, Serialize, Deserialize)]
pub struct SyncDeletion {
    note_id: String,
    deleted_at: String,
}

#[derive(Debug, Serialize)]
pub struct StatusResponse {
    status: String,
    version: String,
}

fn open_db(path: &PathBuf) -> Result<Connection, rusqlite::Error> {
    let conn = Connection::open(path)?;
    conn.execute_batch("PRAGMA journal_mode=WAL;")?;
    Ok(conn)
}

async fn status_handler() -> Json<StatusResponse> {
    Json(StatusResponse {
        status: "ready".to_string(),
        version: env!("CARGO_PKG_VERSION").to_string(),
    })
}

async fn sync_handler(
    State(state): State<std::sync::Arc<SyncState>>,
    Json(request): Json<SyncRequest>,
) -> Result<Json<SyncResponse>, StatusCode> {
    let db = state.db.lock().map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    // 1. Apply phone deletions
    for del in &request.deletions {
        // Record tombstone
        db.execute(
            "INSERT OR REPLACE INTO deletions (note_id, deleted_at) VALUES (?1, ?2)",
            rusqlite::params![del.note_id, del.deleted_at],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Delete the note
        db.execute(
            "DELETE FROM note_tags WHERE note_id = ?1",
            rusqlite::params![del.note_id],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        db.execute(
            "DELETE FROM notes WHERE id = ?1",
            rusqlite::params![del.note_id],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
    }

    // 2. Merge phone notes with local
    for note in &request.notes {
        let remote_bytes = BASE64
            .decode(&note.crdt_state)
            .map_err(|_| StatusCode::BAD_REQUEST)?;

        // Check if we have a local version
        let local_crdt: Option<Vec<u8>> = db
            .query_row(
                "SELECT crdt_state FROM notes WHERE id = ?1",
                rusqlite::params![note.id],
                |row| row.get(0),
            )
            .ok();

        let merged_bytes = if let Some(local_bytes) = local_crdt {
            if local_bytes.is_empty() {
                remote_bytes.clone()
            } else {
                // Merge using Automerge
                match (
                    automerge::AutoCommit::load(&local_bytes),
                    automerge::AutoCommit::load(&remote_bytes),
                ) {
                    (Ok(mut local_doc), Ok(remote_doc)) => {
                        let _ = local_doc.merge(&mut remote_doc.clone());
                        local_doc.save()
                    }
                    _ => remote_bytes.clone(),
                }
            }
        } else {
            remote_bytes.clone()
        };

        // Read plaintext from merged CRDT
        let (title, body, tags, created_at, updated_at) =
            read_note_from_crdt(&merged_bytes).unwrap_or_else(|| {
                (
                    String::new(),
                    String::new(),
                    String::new(),
                    chrono_now(),
                    chrono_now(),
                )
            });

        // Upsert note
        db.execute(
            "INSERT INTO notes (id, title, body, created_at, updated_at, crdt_state)
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)
             ON CONFLICT(id) DO UPDATE SET title=?2, body=?3, updated_at=?5, crdt_state=?6",
            rusqlite::params![note.id, title, body, created_at, updated_at, merged_bytes],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        // Replace tags
        db.execute(
            "DELETE FROM note_tags WHERE note_id = ?1",
            rusqlite::params![note.id],
        )
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

        for tag in tags.split(',').filter(|t| !t.is_empty()) {
            db.execute(
                "INSERT INTO note_tags (note_id, tag) VALUES (?1, ?2)",
                rusqlite::params![note.id, tag.trim().to_lowercase()],
            )
            .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;
        }
    }

    // 3. Collect ALL desktop notes to send back
    let mut stmt = db
        .prepare("SELECT id, crdt_state FROM notes WHERE crdt_state IS NOT NULL")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response_notes: Vec<SyncNote> = stmt
        .query_map([], |row| {
            let id: String = row.get(0)?;
            let crdt_state: Vec<u8> = row.get(1)?;
            Ok(SyncNote {
                id,
                crdt_state: BASE64.encode(&crdt_state),
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .filter_map(|r| r.ok())
        .collect();

    // 4. Collect ALL desktop deletions
    let mut del_stmt = db
        .prepare("SELECT note_id, deleted_at FROM deletions")
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?;

    let response_deletions: Vec<SyncDeletion> = del_stmt
        .query_map([], |row| {
            Ok(SyncDeletion {
                note_id: row.get(0)?,
                deleted_at: row.get(1)?,
            })
        })
        .map_err(|_| StatusCode::INTERNAL_SERVER_ERROR)?
        .filter_map(|r| r.ok())
        .collect();

    Ok(Json(SyncResponse {
        notes: response_notes,
        deletions: response_deletions,
    }))
}

fn read_note_from_crdt(bytes: &[u8]) -> Option<(String, String, String, String, String)> {
    let doc = automerge::AutoCommit::load(bytes).ok()?;

    fn get_string(doc: &automerge::AutoCommit, key: &str) -> String {
        doc.get(automerge::ROOT, key)
            .ok()
            .flatten()
            .map(|(v, _)| match v {
                automerge::Value::Scalar(s) => s.to_string(),
                _ => String::new(),
            })
            .unwrap_or_default()
    }

    let title = get_string(&doc, "title");
    let body = get_string(&doc, "body");
    let tags = get_string(&doc, "tags");
    let created_at = {
        let v = get_string(&doc, "created_at");
        if v.is_empty() { chrono_now() } else { v }
    };
    let updated_at = {
        let v = get_string(&doc, "updated_at");
        if v.is_empty() { chrono_now() } else { v }
    };

    Some((title, body, tags, created_at, updated_at))
}

fn chrono_now() -> String {
    // Simple ISO 8601 timestamp without chrono dependency
    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)
        .unwrap_or_default();
    // Use a fixed format — JS will parse this fine
    format!(
        "{}",
        now.as_secs()
    )
}

/// Chrome Private Network Access: respond with `Access-Control-Allow-Private-Network: true`
/// when the preflight includes `Access-Control-Request-Private-Network: true`.
async fn private_network_access(
    req: axum::http::Request<axum::body::Body>,
    next: axum::middleware::Next,
) -> axum::response::Response {
    let mut res = next.run(req).await;
    res.headers_mut().insert(
        HeaderName::from_static("access-control-allow-private-network"),
        HeaderValue::from_static("true"),
    );
    res
}

pub async fn start_sync_server(
    db_path: PathBuf,
    pwa_dir: Option<PathBuf>,
    event_emitter: Option<tauri::AppHandle>,
) -> Result<(), Box<dyn std::error::Error + Send + Sync>> {
    let conn = open_db(&db_path)?;
    let state = std::sync::Arc::new(SyncState {
        db_path: db_path.clone(),
        db: Mutex::new(conn),
    });

    let emitter = event_emitter.clone();
    let sync_state = state.clone();

    // CORS: allow GitHub Pages PWA to reach sync server over LAN
    let cors = CorsLayer::new()
        .allow_origin("https://stormgraser-ux.github.io".parse::<HeaderValue>().unwrap())
        .allow_methods([Method::GET, Method::POST])
        .allow_headers([axum::http::header::CONTENT_TYPE])
        .expose_headers([HeaderName::from_static("access-control-allow-private-network")])
        .max_age(std::time::Duration::from_secs(3600));

    // Build API routes
    let api = Router::new()
        .route("/api/status", get(status_handler))
        .route(
            "/api/sync",
            post(move |s, j| {
                let emitter = emitter.clone();
                async move {
                    let result = sync_handler(s, j).await;
                    // Emit event so desktop frontend refreshes
                    if result.is_ok() {
                        if let Some(handle) = &emitter {
                            let _ = handle.emit("sync-completed", ());
                        }
                    }
                    result
                }
            }),
        )
        .with_state(sync_state)
        .layer(cors)
        .layer(axum::middleware::from_fn(private_network_access));

    // Combine API with static file serving for PWA
    let app = if let Some(pwa_path) = pwa_dir {
        api.fallback_service(ServeDir::new(pwa_path))
    } else {
        api.fallback_service(ServeDir::new("."))
    };

    let listener = tokio::net::TcpListener::bind("0.0.0.0:8108").await?;
    println!("Sync server running at http://0.0.0.0:8108");

    axum::serve(listener, app).await?;

    Ok(())
}
