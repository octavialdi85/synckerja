# Android Log Triage Guide

This document classifies Android logs for this project so debugging can focus on actionable issues.

## 1) Actionable now

- `Capacitor: Unable to read file at path public/plugins`
  - Meaning: Web asset lookup mismatch. Fix by ensuring `public/plugins` exists in build assets.
- `Capacitor/Console ... Msg: undefined`
  - Meaning: noisy logs with empty payload; hides useful signals.
  - Action: guard empty `console.log` calls in app bootstrap.
- `chromium ... tile memory limits exceeded`
  - Meaning: initial webview render is too heavy on emulator/device.
  - Action: improve bundle chunking and reduce startup pressure.

## 2) Environment or emulator noise (monitor only)

- `MESA ... Failed to open rendernode`
- `ashmem ... readlink ... Operation not permitted`
- `libbinder... Thread Pool max thread count is 0` from `dumpsys/service`
- `wpa_supplicant ... CTRL-EVENT-BEACON-LOSS` on emulator

These are usually emulator/host limitations and not app logic regressions.

## 3) Expected debug-cycle noise

- `ActivityManager Force stopping id.synckerja.app` during redeploy
- `Killing ... due to from pid ...` immediately before relaunch

If these appear only around manual reruns from IDE, treat as expected run cycle behavior.

## 4) Recommended logcat filters

- Package-first:
  - `id.synckerja.app`
- Severity-first:
  - `Warn`, then `Error`
- Optional focused filter (shell):
  - `adb logcat --pid $(adb shell pidof -s id.synckerja.app)`

## 5) Regression checklist

- No recurring `public/plugins` warning after cold start.
- No recurring `Msg: undefined` noise in startup sequence.
- No functional regression in push registration and notification handlers.
- Lower frequency of renderer memory warnings in startup and first navigation.
