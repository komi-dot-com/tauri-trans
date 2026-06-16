use std::fs::File;
use std::io::Read;
use std::path::Path;
use encoding_rs::WINDOWS_1252;

#[derive(serde::Serialize)]
pub struct SubtitleReadResponse {
    pub name: String,
    pub size: u64,
    pub content: String,
    pub encoding: String,
}

pub fn read_file_with_encoding(path_str: &str) -> Result<SubtitleReadResponse, String> {
    let path = Path::new(path_str);
    if !path.exists() {
        return Err(format!("File does not exist: {}", path_str));
    }

    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let metadata = std::fs::metadata(path).map_err(|e| format!("Failed to read file metadata: {}", e))?;
    let size = metadata.len();

    let mut file = File::open(path).map_err(|e| format!("Failed to open file: {}", e))?;
    let mut bytes = Vec::new();
    file.read_to_end(&mut bytes).map_err(|e| format!("Failed to read file: {}", e))?;

    // Check for UTF-8 BOM [EF, BB, BF]
    if bytes.len() >= 3 && bytes[0] == 0xEF && bytes[1] == 0xBB && bytes[2] == 0xBF {
        let text = String::from_utf8(bytes[3..].to_vec())
            .map_err(|e| format!("Invalid UTF-8 after BOM: {}", e))?;
        return Ok(SubtitleReadResponse {
            name,
            size,
            content: text,
            encoding: "UTF-8 BOM".to_string(),
        });
    }

    // Try UTF-8
    match String::from_utf8(bytes.clone()) {
        Ok(text) => Ok(SubtitleReadResponse {
            name,
            size,
            content: text,
            encoding: "UTF-8".to_string(),
        }),
        Err(_) => {
            // Fallback to ANSI (Windows-1252)
            let (decoded, _, malformed) = WINDOWS_1252.decode(&bytes);
            if malformed {
                Ok(SubtitleReadResponse {
                    name,
                    size,
                    content: decoded.into_owned(),
                    encoding: "ANSI (Windows-1252, decoded with errors)".to_string(),
                })
            } else {
                Ok(SubtitleReadResponse {
                    name,
                    size,
                    content: decoded.into_owned(),
                    encoding: "ANSI (Windows-1252)".to_string(),
                })
            }
        }
    }
}


pub fn write_file_content(path_str: &str, content: &str) -> Result<(), String> {
    let path = Path::new(path_str);
    std::fs::write(path, content).map_err(|e| format!("Failed to write file: {}", e))?;
    Ok(())
}
