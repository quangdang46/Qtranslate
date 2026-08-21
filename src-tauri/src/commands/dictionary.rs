use serde::Serialize;

/// Result of a dictionary lookup — definitions, synonyms, antonyms, phonetic.
#[derive(Debug, Serialize)]
pub struct DictionaryResult {
    pub word: String,
    pub phonetic: Option<String>,
    pub definitions: Vec<DictionaryDefinition>,
    pub synonyms: Vec<String>,
    pub antonyms: Vec<String>,
}

#[derive(Debug, Serialize)]
pub struct DictionaryDefinition {
    pub part_of_speech: String,
    pub definition: String,
}

/// Look up an English word using the free dictionaryapi.dev endpoint.
/// Returns the first entry found, with definitions grouped by part of speech.
/// Synonyms and antonyms are collected from all meanings.
#[tauri::command]
pub async fn lookup_dictionary(word: String) -> Result<DictionaryResult, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://api.dictionaryapi.dev/api/v2/entries/en/{}",
        urlencoding::encode(&word)
    );

    let response = client
        .get(&url)
        .timeout(std::time::Duration::from_secs(10))
        .send()
        .await
        .map_err(|e| format!("Network error: {}", e))?;

    if response.status().as_u16() == 404 {
        return Err(format!("No definitions found for \"{}\"", word));
    }

    if !response.status().is_success() {
        return Err(format!("HTTP error: {}", response.status()));
    }

    let body: Vec<serde_json::Value> = response
        .json()
        .await
        .map_err(|e| format!("Parse error: {}", e))?;

    let entry = body.first().ok_or("Empty response")?;

    let word_str = entry.get("word").and_then(|v| v.as_str()).unwrap_or(&word).to_string();

    let phonetic = entry
        .get("phonetic")
        .and_then(|v| v.as_str())
        .map(|s| s.to_string())
        .or_else(|| {
            // Some entries only have phonetics in the phonetics array
            entry
                .get("phonetics")
                .and_then(|v| v.as_array())
                .and_then(|arr| {
                    arr.iter()
                        .find_map(|p| p.get("text").and_then(|t| t.as_str()).map(|s| s.to_string()))
                })
        });

    let mut definitions = Vec::new();
    let mut synonyms_set = std::collections::HashSet::new();
    let mut antonyms_set = std::collections::HashSet::new();

    if let Some(meanings) = entry.get("meanings").and_then(|v| v.as_array()) {
        for meaning in meanings {
            let pos = meaning
                .get("partOfSpeech")
                .and_then(|v| v.as_str())
                .unwrap_or("")
                .to_string();

            if let Some(defs) = meaning.get("definitions").and_then(|v| v.as_array()) {
                for def in defs {
                    if let Some(text) = def.get("definition").and_then(|v| v.as_str()) {
                        definitions.push(DictionaryDefinition {
                            part_of_speech: pos.clone(),
                            definition: text.to_string(),
                        });
                    }
                }
            }

            // Collect synonyms and antonyms from each meaning
            if let Some(syns) = meaning.get("synonyms").and_then(|v| v.as_array()) {
                for s in syns {
                    if let Some(t) = s.as_str() {
                        synonyms_set.insert(t.to_string());
                    }
                }
            }
            if let Some(ants) = meaning.get("antonyms").and_then(|v| v.as_array()) {
                for a in ants {
                    if let Some(t) = a.as_str() {
                        antonyms_set.insert(t.to_string());
                    }
                }
            }
        }
    }

    Ok(DictionaryResult {
        word: word_str,
        phonetic,
        definitions,
        synonyms: synonyms_set.into_iter().collect(),
        antonyms: antonyms_set.into_iter().collect(),
    })
}
