use rusqlite::{params, Connection};
use serde::{Deserialize, Serialize};
use std::path::PathBuf;
use std::sync::Mutex;

pub struct DbState {
    pub conn_mutex: Mutex<Connection>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct HistoryItem {
    pub id: i64,
    pub file_name: String,
    pub provider: String,
    pub source_lang: String,
    pub target_lang: String,
    pub total_chars: i32,
    pub total_lines: i32,
    pub cost_est: f64,
    pub speed_lpm: f64,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
pub struct StatsResponse {
    pub total_translations_done: i64,
    pub total_cached_entries: i64,
    pub total_chars_translated: i64,
    pub total_lines_translated: i64,
    pub total_cost_usd: f64,
    pub average_speed_lpm: f64,
    pub history: Vec<HistoryItem>,
}

pub fn init_db(app_data_dir: PathBuf) -> Result<Connection, String> {
    std::fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data directory: {}", e))?;
    let db_path = app_data_dir.join("subtitles_translator.db");
    let conn = Connection::open(db_path)
        .map_err(|e| format!("Failed to open SQLite database: {}", e))?;

    // Create translation cache table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS translation_cache (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            source_lang TEXT NOT NULL,
            target_lang TEXT NOT NULL,
            provider TEXT NOT NULL,
            mode TEXT NOT NULL,
            source_text TEXT NOT NULL,
            translated_text TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create translation_cache table: {}", e))?;

    // Index for fast cache check
    conn.execute(
        "CREATE INDEX IF NOT EXISTS idx_translation_lookup 
         ON translation_cache (source_lang, target_lang, provider, mode, source_text)",
        [],
    ).map_err(|e| format!("Failed to create index on translation_cache: {}", e))?;

    // Create history table
    conn.execute(
        "CREATE TABLE IF NOT EXISTS translation_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            file_name TEXT NOT NULL,
            provider TEXT NOT NULL,
            source_lang TEXT NOT NULL,
            target_lang TEXT NOT NULL,
            total_chars INTEGER NOT NULL,
            total_lines INTEGER NOT NULL,
            cost_est REAL NOT NULL,
            speed_lpm REAL NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )",
        [],
    ).map_err(|e| format!("Failed to create translation_history table: {}", e))?;

    Ok(conn)
}

pub fn get_cached_translation(
    conn: &Connection,
    source_lang: &str,
    target_lang: &str,
    provider: &str,
    mode: &str,
    source_text: &str,
) -> Result<Option<String>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT translated_text FROM translation_cache 
             WHERE source_lang = ?1 AND target_lang = ?2 AND provider = ?3 AND mode = ?4 AND source_text = ?5 
             LIMIT 1",
        )
        .map_err(|e| format!("Failed to prepare select query: {}", e))?;

    let mut rows = stmt
        .query(params![source_lang, target_lang, provider, mode, source_text])
        .map_err(|e| format!("Failed to execute select query: {}", e))?;

    if let Some(row) = rows.next().map_err(|e| format!("Failed to fetch row: {}", e))? {
        let text: String = row.get(0).map_err(|e| format!("Failed to get text: {}", e))?;
        Ok(Some(text))
    } else {
        Ok(None)
    }
}

pub fn set_cached_translation(
    conn: &Connection,
    source_lang: &str,
    target_lang: &str,
    provider: &str,
    mode: &str,
    source_text: &str,
    translated_text: &str,
) -> Result<(), String> {
    // Only insert if not exists to avoid duplicate entries
    let cached = get_cached_translation(conn, source_lang, target_lang, provider, mode, source_text)?;
    if cached.is_some() {
        return Ok(());
    }

    conn.execute(
        "INSERT INTO translation_cache (source_lang, target_lang, provider, mode, source_text, translated_text) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        params![source_lang, target_lang, provider, mode, source_text, translated_text],
    )
    .map_err(|e| format!("Failed to insert into translation_cache: {}", e))?;

    Ok(())
}

pub fn clear_translation_cache(conn: &Connection) -> Result<(), String> {
    conn.execute("DELETE FROM translation_cache", [])
        .map_err(|e| format!("Failed to clear cache: {}", e))?;
    Ok(())
}

pub fn add_history_entry(
    conn: &Connection,
    file_name: &str,
    provider: &str,
    source_lang: &str,
    target_lang: &str,
    total_chars: i32,
    total_lines: i32,
    cost_est: f64,
    speed_lpm: f64,
) -> Result<(), String> {
    conn.execute(
        "INSERT INTO translation_history (file_name, provider, source_lang, target_lang, total_chars, total_lines, cost_est, speed_lpm) 
         VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)",
        params![file_name, provider, source_lang, target_lang, total_chars, total_lines, cost_est, speed_lpm],
    )
    .map_err(|e| format!("Failed to insert history: {}", e))?;
    Ok(())
}

pub fn get_statistics(conn: &Connection) -> Result<StatsResponse, String> {
    let mut stmt = conn
        .prepare("SELECT COUNT(*), SUM(total_chars), SUM(total_lines), SUM(cost_est), AVG(speed_lpm) FROM translation_history")
        .map_err(|e| format!("Failed to prepare stats query: {}", e))?;

    let mut rows = stmt
        .query([])
        .map_err(|e| format!("Failed to execute stats query: {}", e))?;

    let mut total_translations_done = 0;
    let mut total_chars_translated = 0;
    let mut total_lines_translated = 0;
    let mut total_cost_usd = 0.0;
    let mut average_speed_lpm = 0.0;

    if let Some(row) = rows.next().map_err(|e| format!("Failed to fetch stats row: {}", e))? {
        total_translations_done = row.get::<_, Option<i64>>(0).unwrap_or(Some(0)).unwrap_or(0);
        total_chars_translated = row.get::<_, Option<i64>>(1).unwrap_or(Some(0)).unwrap_or(0);
        total_lines_translated = row.get::<_, Option<i64>>(2).unwrap_or(Some(0)).unwrap_or(0);
        total_cost_usd = row.get::<_, Option<f64>>(3).unwrap_or(Some(0.0)).unwrap_or(0.0);
        average_speed_lpm = row.get::<_, Option<f64>>(4).unwrap_or(Some(0.0)).unwrap_or(0.0);
    }

    let total_cached_entries: i64 = conn
        .query_row("SELECT COUNT(*) FROM translation_cache", [], |row| row.get(0))
        .unwrap_or(0);

    // Get recent 50 history entries
    let mut stmt_history = conn
        .prepare(
            "SELECT id, file_name, provider, source_lang, target_lang, total_chars, total_lines, cost_est, speed_lpm, datetime(created_at, 'localtime') 
             FROM translation_history 
             ORDER BY created_at DESC 
             LIMIT 50",
        )
        .map_err(|e| format!("Failed to prepare history query: {}", e))?;

    let history_rows = stmt_history
        .query_map([], |row| {
            Ok(HistoryItem {
                id: row.get(0)?,
                file_name: row.get(1)?,
                provider: row.get(2)?,
                source_lang: row.get(3)?,
                target_lang: row.get(4)?,
                total_chars: row.get(5)?,
                total_lines: row.get(6)?,
                cost_est: row.get(7)?,
                speed_lpm: row.get(8)?,
                created_at: row.get(9)?,
            })
        })
        .map_err(|e| format!("Failed to run history query map: {}", e))?;

    let mut history = Vec::new();
    for item in history_rows {
        if let Ok(entry) = item {
            history.push(entry);
        }
    }

    Ok(StatsResponse {
        total_translations_done,
        total_cached_entries,
        total_chars_translated,
        total_lines_translated,
        total_cost_usd,
        average_speed_lpm,
        history,
    })
}
