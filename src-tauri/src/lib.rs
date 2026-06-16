// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod db;
mod fs_utils;

use tauri::Manager;

#[tauri::command]
fn read_subtitle_file(path: String) -> Result<fs_utils::SubtitleReadResponse, String> {
    fs_utils::read_file_with_encoding(&path)
}

#[tauri::command]
fn write_subtitle_file(path: String, content: String) -> Result<(), String> {
    fs_utils::write_file_content(&path, &content)
}

#[tauri::command]
fn db_get_cache(
    state: tauri::State<'_, db::DbState>,
    source_lang: String,
    target_lang: String,
    provider: String,
    mode: String,
    source_text: String,
) -> Result<Option<String>, String> {
    let conn = state
        .conn_mutex
        .lock()
        .map_err(|e| format!("Failed to lock database mutex: {}", e))?;
    db::get_cached_translation(&conn, &source_lang, &target_lang, &provider, &mode, &source_text)
}

#[tauri::command]
fn db_set_cache(
    state: tauri::State<'_, db::DbState>,
    source_lang: String,
    target_lang: String,
    provider: String,
    mode: String,
    source_text: String,
    translated_text: String,
) -> Result<(), String> {
    let conn = state
        .conn_mutex
        .lock()
        .map_err(|e| format!("Failed to lock database mutex: {}", e))?;
    db::set_cached_translation(
        &conn,
        &source_lang,
        &target_lang,
        &provider,
        &mode,
        &source_text,
        &translated_text,
    )
}

#[tauri::command]
fn db_clear_cache(state: tauri::State<'_, db::DbState>) -> Result<(), String> {
    let conn = state
        .conn_mutex
        .lock()
        .map_err(|e| format!("Failed to lock database mutex: {}", e))?;
    db::clear_translation_cache(&conn)
}

#[tauri::command]
fn db_add_history(
    state: tauri::State<'_, db::DbState>,
    file_name: String,
    provider: String,
    source_lang: String,
    target_lang: String,
    total_chars: i32,
    total_lines: i32,
    cost_est: f64,
    speed_lpm: f64,
) -> Result<(), String> {
    let conn = state
        .conn_mutex
        .lock()
        .map_err(|e| format!("Failed to lock database mutex: {}", e))?;
    db::add_history_entry(
        &conn,
        &file_name,
        &provider,
        &source_lang,
        &target_lang,
        total_chars,
        total_lines,
        cost_est,
        speed_lpm,
    )
}

#[tauri::command]
fn db_get_stats(state: tauri::State<'_, db::DbState>) -> Result<db::StatsResponse, String> {
    let conn = state
        .conn_mutex
        .lock()
        .map_err(|e| format!("Failed to lock database mutex: {}", e))?;
    db::get_statistics(&conn)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .setup(|app| {
            // Get app data directory for DB storage
            let app_data_dir = app
                .path()
                .app_data_dir()
                .map_err(|e| format!("Could not get app data directory: {}", e))?;
            
            // Initialize database
            let conn = db::init_db(app_data_dir)?;
            app.manage(db::DbState {
                conn_mutex: std::sync::Mutex::new(conn),
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            read_subtitle_file,
            write_subtitle_file,
            db_get_cache,
            db_set_cache,
            db_clear_cache,
            db_add_history,
            db_get_stats
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
