# Obsidian Review Bot Comment (PR #8004) — main 브랜치 기준

- Source: https://github.com/obsidianmd/obsidian-releases/pull/8004#issuecomment-3835510894
- GitHub main SHA: e7e0e6b2ccb201005ce892843a88bccedd6c7318
- Updated (UTC): 2026-02-03 01:53:45Z

---

## Required Findings (main 브랜치 기준)

> [!IMPORTANT]
> 아래 링크는 **GitHub main 브랜치 커밋** 기준입니다.

---

### 'audio.sampleRate' may use Object's default stringification format ('[object Object]') when stringified.
- [src/infrastructure/api/SettingsValidator.ts#L288-L288](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/infrastructure/api/SettingsValidator.ts#L288-L288)
  수정 주석: 객체가 될 수 있는 값은 String(...) 또는 JSON.stringify(...)로 명시 변환하고 타입을 좁힙니다.

### Expected an error object to be thrown.
- [src/infrastructure/api/providers/deepgram/DeepgramService.ts#L665-L665](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/infrastructure/api/providers/deepgram/DeepgramService.ts#L665-L665)
  수정 주석: 문자열 대신 Error 인스턴스(예: new Error(...))를 throw하거나 기존 error를 그대로 재throw합니다.
- [src/infrastructure/api/providers/deepgram/DeepgramServiceRefactored.ts#L229-L229](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/infrastructure/api/providers/deepgram/DeepgramServiceRefactored.ts#L229-L229)
  수정 주석: 문자열 대신 Error 인스턴스(예: new Error(...))를 throw하거나 기존 error를 그대로 재throw합니다.

### Disabling '@typescript-eslint/no-explicit-any' is not allowed.
- [src/patterns/Singleton.ts#L69-L69](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/patterns/Singleton.ts#L69-L69)
  수정 주석: eslint-disable를 제거하고 any 대신 명시적 타입/제네릭(예: unknown[])으로 대체합니다.
- [src/patterns/Singleton.ts#L75-L75](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/patterns/Singleton.ts#L75-L75)
  수정 주석: eslint-disable를 제거하고 any 대신 명시적 타입/제네릭(예: unknown[])으로 대체합니다.

### Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unsafe-argument').
- [src/patterns/Singleton.ts#L80](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/patterns/Singleton.ts#L80)
  수정 주석: 사용되지 않는 eslint-disable 주석을 삭제합니다.

### Use sentence case for UI text.
- [src/ui/formatting/FormatOptions.ts#L271-L271](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/formatting/FormatOptions.ts#L271-L271)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L395-L395](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L395-L395)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L396-L396](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L396-L396)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L498-L498](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L498-L498)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L586-L586](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L586-L586)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L589-L589](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L589-L589)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L623-L623](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L623-L623)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L710-L710](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L710-L710)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L724-L724](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L724-L724)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L759-L759](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L759-L759)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L922-L922](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L922-L922)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/EnhancedSettingsTab.ts#L930-L930](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L930-L930)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L155-L155](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L155-L155)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L265-L265](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L265-L265)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L319-L319](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L319-L319)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L357-L357](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L357-L357)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L368-L368](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L368-L368)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L369-L369](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L369-L369)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L371-L371](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L371-L371)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L380-L380](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L380-L380)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L403-L403](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L403-L403)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L405-L405](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L405-L405)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTab.ts#L527-L527](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L527-L527)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTabOptimized.ts#L473-L473](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTabOptimized.ts#L473-L473)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTabOptimized.ts#L482-L482](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTabOptimized.ts#L482-L482)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SettingsTabRefactored.ts#L156-L156](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTabRefactored.ts#L156-L156)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SimpleSettingsTab.ts#L42-L42](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L42-L42)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SimpleSettingsTab.ts#L64-L64](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L64-L64)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SimpleSettingsTab.ts#L65-L65](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L65-L65)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SimpleSettingsTab.ts#L68-L68](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L68-L68)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SimpleSettingsTab.ts#L81-L81](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L81-L81)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SimpleSettingsTab.ts#L84-L84](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L84-L84)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/SimpleSettingsTab.ts#L96-L96](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L96-L96)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ApiKeyValidator.ts#L73-L73](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ApiKeyValidator.ts#L73-L73)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/AudioSettings.ts#L41-L41](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L41-L41)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/AudioSettings.ts#L64-L64](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L64-L64)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/AudioSettings.ts#L65-L65](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L65-L65)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/AudioSettings.ts#L114-L114](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L114-L114)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/DeepgramSettings.ts#L581-L581](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/DeepgramSettings.ts#L581-L581)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/DeepgramSettings.ts#L617-L617](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/DeepgramSettings.ts#L617-L617)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L83-L83](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L83-L83)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L84-L84](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L84-L84)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L85-L85](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L85-L85)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L222-L222](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L222-L222)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L223-L223](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L223-L223)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L224-L224](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L224-L224)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L225-L225](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L225-L225)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L226-L226](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L226-L226)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L309-L309](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L309-L309)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L352-L352](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L352-L352)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L408-L408](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L408-L408)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L435-L435](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L435-L435)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ProviderSettings.ts#L438-L438](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L438-L438)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/components/ShortcutSettings.ts#L488-L488](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ShortcutSettings.ts#L488-L488)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L98-L98](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L98-L98)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L197-L197](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L197-L197)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L198-L198](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L198-L198)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L199-L199](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L199-L199)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L236-L236](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L236-L236)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L237-L237](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L237-L237)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L238-L238](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L238-L238)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L239-L239](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L239-L239)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L582-L582](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L582-L582)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L585-L585](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L585-L585)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L844-L844](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L844-L844)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L847-L847](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L847-L847)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainer.ts#L859-L859](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L859-L859)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L289-L289](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L289-L289)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L290-L290](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L290-L290)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L291-L291](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L291-L291)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L303-L303](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L303-L303)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L304-L304](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L304-L304)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L305-L305](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L305-L305)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/APIKeyManager.ts#L822-L822](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/APIKeyManager.ts#L822-L822)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L66-L66](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L66-L66)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L99-L99](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L99-L99)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L100-L100](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L100-L100)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L101-L101](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L101-L101)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L102-L102](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L102-L102)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L103-L103](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L103-L103)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.
- [src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L883-L883](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L883-L883)
  수정 주석: UI 문구를 sentence case(첫 단어만 대문자)로 통일합니다.

### 'value' may use Object's default stringification format ('[object Object]') when stringified.
- [src/ui/progress/StatusMessage.ts#L275-L275](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/progress/StatusMessage.ts#L275-L275)
  수정 주석: 객체가 될 수 있는 값은 String(...) 또는 JSON.stringify(...)로 명시 변환하고 타입을 좁힙니다.

---

## Optional Findings (main 브랜치 기준)

- (없음)

---

## Original Review Comment

```markdown
Thank you for your submission, an automated scan of your plugin code's revealed the following issues:

### Required

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/infrastructure/api/SettingsValidator.ts#L288-L288)
'audio.sampleRate' may use Object's default stringification format ('[object Object]') when stringified.

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/infrastructure/api/providers/deepgram/DeepgramService.ts#L665-L665)[\[2\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/infrastructure/api/providers/deepgram/DeepgramServiceRefactored.ts#L229-L229)
Expected an error object to be thrown.

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/patterns/Singleton.ts#L69-L69)[\[2\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/patterns/Singleton.ts#L75-L75)
Disabling '@typescript-eslint/no-explicit-any' is not allowed.

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/patterns/Singleton.ts#L80)
Unused eslint-disable directive (no problems were reported from '@typescript-eslint/no-unsafe-argument').

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/formatting/FormatOptions.ts#L271-L271)[\[2\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L395-L395)[\[3\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L396-L396)[\[4\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L498-L498)[\[5\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L586-L586)[\[6\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L589-L589)[\[7\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L623-L623)[\[8\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L710-L710)[\[9\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L724-L724)[\[10\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L759-L759)[\[11\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L922-L922)[\[12\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/EnhancedSettingsTab.ts#L930-L930)[\[13\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L155-L155)[\[14\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L265-L265)[\[15\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L319-L319)[\[16\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L357-L357)[\[17\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L368-L368)[\[18\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L369-L369)[\[19\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L371-L371)[\[20\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L380-L380)[\[21\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L403-L403)[\[22\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L405-L405)[\[23\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTab.ts#L527-L527)[\[24\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTabOptimized.ts#L473-L473)[\[25\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTabOptimized.ts#L482-L482)[\[26\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SettingsTabRefactored.ts#L156-L156)[\[27\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L42-L42)[\[28\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L64-L64)[\[29\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L65-L65)[\[30\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L68-L68)[\[31\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L81-L81)[\[32\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L84-L84)[\[33\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/SimpleSettingsTab.ts#L96-L96)[\[34\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ApiKeyValidator.ts#L73-L73)[\[35\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L41-L41)[\[36\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L64-L64)[\[37\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L65-L65)[\[38\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/AudioSettings.ts#L114-L114)[\[39\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/DeepgramSettings.ts#L581-L581)[\[40\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/DeepgramSettings.ts#L617-L617)[\[41\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L83-L83)[\[42\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L84-L84)[\[43\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L85-L85)[\[44\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L222-L222)[\[45\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L223-L223)[\[46\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L224-L224)[\[47\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L225-L225)[\[48\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L226-L226)[\[49\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L309-L309)[\[50\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L352-L352)[\[51\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L408-L408)[\[52\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L435-L435)[\[53\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ProviderSettings.ts#L438-L438)[\[54\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/components/ShortcutSettings.ts#L488-L488)[\[55\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L98-L98)[\[56\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L197-L197)[\[57\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L198-L198)[\[58\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L199-L199)[\[59\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L236-L236)[\[60\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L237-L237)[\[61\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L238-L238)[\[62\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L239-L239)[\[63\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L582-L582)[\[64\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L585-L585)[\[65\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L844-L844)[\[66\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L847-L847)[\[67\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainer.ts#L859-L859)[\[68\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L289-L289)[\[69\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L290-L290)[\[70\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L291-L291)[\[71\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L303-L303)[\[72\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L304-L304)[\[73\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/ProviderSettingsContainerRefactored.ts#L305-L305)[\[74\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/APIKeyManager.ts#L822-L822)[\[75\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L66-L66)[\[76\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L99-L99)[\[77\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L100-L100)[\[78\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L101-L101)[\[79\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L102-L102)[\[80\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L103-L103)[\[81\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/settings/provider/components/AdvancedSettingsPanel.ts#L883-L883)
Use sentence case for UI text.

[\[1\]](https://github.com/asyouplz/SpeechNote/blob/e7e0e6b2ccb201005ce892843a88bccedd6c7318/src/ui/progress/StatusMessage.ts#L275-L275)
'value' may use Object's default stringification format ('[object Object]') when stringified.



---

### Optional



---



Do <b>NOT</b> open a new PR for re-validation.
Once you have pushed some changes to your repository the bot will rescan within 6 hours
If you think some of the required changes are incorrect, please comment with `/skip` and the reason why you think the results are incorrect.
To run these checks locally, install the [eslint plugin](https://github.com/obsidianmd/eslint-plugin) in your project.
Do <b>NOT</b> rebase this PR, this will be handled by the reviewer once the plugin has been approved.

```
