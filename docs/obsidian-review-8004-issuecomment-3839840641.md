# Obsidian Review Bot Comment (PR #8004) — main 브랜치 기준

- Source: https://github.com/obsidianmd/obsidian-releases/pull/8004#issuecomment-3839840641
- GitHub main SHA: 18a62e8a59070f874384a7f35b2abcfca81cd44b
- Updated (UTC): 2026-02-03T08:28:29Z

---

## Required Findings (main 브랜치 기준)

> [!IMPORTANT]
> 아래 링크는 **GitHub main 브랜치 커밋** 기준입니다.

---

### 'audio.sampleRate' may use Object's default stringification format ('[object Object]') when stringified.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/infrastructure/api/SettingsValidator.ts#L299-L299](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/infrastructure/api/SettingsValidator.ts#L299-L299)
  수정 주석: 객체가 될 수 있는 값은 String(...) 또는 JSON.stringify(...)로 명시 변환하고 타입을 좁힙니다.

### 'value' may use Object's default stringification format ('[object Object]') when stringified.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/progress/StatusMessage.ts#L273-L273](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/progress/StatusMessage.ts#L273-L273)
  수정 주석: 객체가 될 수 있는 값은 String(...) 또는 JSON.stringify(...)로 명시 변환하고 타입을 좁힙니다.

### Use sentence case for UI text.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L395-L395](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L395-L395)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L512-L512](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L512-L512)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L586-L586](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L586-L586)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L623-L623](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L623-L623)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L710-L710](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L710-L710)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L759-L759](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L759-L759)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L155-L155](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L155-L155)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L319-L319](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L319-L319)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L357-L357](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L357-L357)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L368-L368](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L368-L368)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L369-L369](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L369-L369)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L380-L380](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L380-L380)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L403-L403](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L403-L403)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L405-L405](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L405-L405)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabOptimized.ts#L473-L473](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabOptimized.ts#L473-L473)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabOptimized.ts#L482-L482](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabOptimized.ts#L482-L482)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabRefactored.ts#L156-L156](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabRefactored.ts#L156-L156)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L42-L42](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L42-L42)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L64-L64](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L64-L64)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L65-L65](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L65-L65)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L81-L81](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L81-L81)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L84-L84](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L84-L84)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L96-L96](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L96-L96)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/DeepgramSettings.ts#L581-L581](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/DeepgramSettings.ts#L581-L581)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L83-L83](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L83-L83)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L84-L84](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L84-L84)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L85-L85](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L85-L85)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L309-L309](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L309-L309)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L197-L197](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L197-L197)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L198-L198](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L198-L198)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L199-L199](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L199-L199)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L289-L289](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L289-L289)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L290-L290](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L290-L290)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.
- [18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L291-L291](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L291-L291)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일하되, 고유명사 표기는 유지합니다.

---

## Optional Findings (main 브랜치 기준)

- (없음)

---

## Original Review Comment

```markdown
Thank you for your submission, an automated scan of your plugin code's revealed the following issues:

### Required

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/infrastructure/api/SettingsValidator.ts#L299-L299)
'audio.sampleRate' may use Object's default stringification format ('[object Object]') when stringified.

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/progress/StatusMessage.ts#L273-L273)
'value' may use Object's default stringification format ('[object Object]') when stringified.

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L395-L395)[\[2\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L512-L512)[\[3\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L586-L586)[\[4\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L623-L623)[\[5\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L710-L710)[\[6\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/EnhancedSettingsTab.ts#L759-L759)[\[7\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L155-L155)[\[8\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L319-L319)[\[9\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L357-L357)[\[10\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L368-L368)[\[11\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L369-L369)[\[12\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L380-L380)[\[13\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L403-L403)[\[14\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTab.ts#L405-L405)[\[15\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabOptimized.ts#L473-L473)[\[16\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabOptimized.ts#L482-L482)[\[17\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SettingsTabRefactored.ts#L156-L156)[\[18\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L42-L42)[\[19\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L64-L64)[\[20\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L65-L65)[\[21\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L81-L81)[\[22\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L84-L84)[\[23\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/SimpleSettingsTab.ts#L96-L96)[\[24\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/DeepgramSettings.ts#L581-L581)[\[25\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L83-L83)[\[26\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L84-L84)[\[27\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L85-L85)[\[28\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/components/ProviderSettings.ts#L309-L309)[\[29\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L197-L197)[\[30\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L198-L198)[\[31\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainer.ts#L199-L199)[\[32\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L289-L289)[\[33\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L290-L290)[\[34\]](https://github.com/asyouplz/SpeechNote/blob/18a62e8a59070f874384a7f35b2abcfca81cd44b/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L291-L291)
Use sentence case for UI text.



---

### Optional



---



Do <b>NOT</b> open a new PR for re-validation.
Once you have pushed some changes to your repository the bot will rescan within 6 hours
If you think some of the required changes are incorrect, please comment with `/skip` and the reason why you think the results are incorrect.
To run these checks locally, install the [eslint plugin](https://github.com/obsidianmd/eslint-plugin) in your project.
Do <b>NOT</b> rebase this PR, this will be handled by the reviewer once the plugin has been approved.
```
