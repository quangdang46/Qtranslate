use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct TranslationResult {
    pub translated_text: String,
    pub detected_language: Option<String>,
}

#[tauri::command]
pub async fn translate_text(
    text: String,
    source_lang: String,
    target_lang: String,
) -> Result<TranslationResult, String> {
    let client = reqwest::Client::new();

    let url = format!(
        "https://translate.googleapis.com/translate_a/single?client=gtx&sl={}&tl={}&dt=t&q={}",
        source_lang,
        target_lang,
        urlencoding::encode(&text)
    );

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    let body = response
        .json::<serde_json::Value>()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let translated = parse_google_response(&body).unwrap_or_default();
    let detected = parse_detected_language(&body);

    Ok(TranslationResult {
        translated_text: translated,
        detected_language: detected,
    })
}

fn parse_google_response(json: &serde_json::Value) -> Option<String> {
    let sentences = json.get(0)?;
    let mut result = String::new();
    for item in sentences.as_array()? {
        if let Some(text) = item.get(0)?.as_str() {
            result.push_str(text);
        }
    }
    Some(result)
}

fn parse_detected_language(json: &serde_json::Value) -> Option<String> {
    json.get(2)?.as_str().map(|s| s.to_string())
}
