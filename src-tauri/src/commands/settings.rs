use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct QuickTranslateConfig {
    pub source_language: String,
    pub target_language: String,
    pub hotkey: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct ReplaceConfig {
    pub source_language: String,
    pub target_language: String,
    pub hotkey: String,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub quick_translate: QuickTranslateConfig,
    pub replace: ReplaceConfig,
    pub active_provider: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            quick_translate: QuickTranslateConfig {
                source_language: "auto".into(),
                target_language: "vi".into(),
                hotkey: "CmdOrCtrl+Q".into(),
            },
            replace: ReplaceConfig {
                source_language: "auto".into(),
                target_language: "en".into(),
                hotkey: "CmdOrCtrl+Alt+W".into(),
            },
            active_provider: "google".into(),
        }
    }
}

fn get_settings_path() -> PathBuf {
    let mut path = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    path.push("qtranslate");
    path.push("settings.json");
    path
}

/// Load settings from file, or return defaults.
#[tauri::command]
pub async fn load_settings() -> Result<AppSettings, String> {
    let path = get_settings_path();
    if path.exists() {
        let content = fs::read_to_string(&path).map_err(|e| format!("Read error: {}", e))?;
        let settings: AppSettings =
            serde_json::from_str(&content).map_err(|e| format!("Parse error: {}", e))?;
        Ok(settings)
    } else {
        Ok(AppSettings::default())
    }
}

/// Save settings to file.
#[tauri::command]
pub async fn save_settings(settings: AppSettings) -> Result<(), String> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| format!("Create dir error: {}", e))?;
    }
    let content = serde_json::to_string_pretty(&settings).map_err(|e| format!("Serialize error: {}", e))?;
    fs::write(&path, content).map_err(|e| format!("Write error: {}", e))?;
    Ok(())
}
