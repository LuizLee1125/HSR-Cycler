// Prevents additional console window on Windows in release
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

#[tauri::command]
fn get_app_version() -> String {
    "v2.6.0 Live".to_string()
}

fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![get_app_version])
        .run(tauri::generate_context!())
        .expect("error while running HSR Cycler desktop application");
}
