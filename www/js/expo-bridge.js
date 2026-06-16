/**
 * ╔══════════════════════════════════════════════════════════════╗
 * ║  PHYSIO SUAI — Expo / React Native WebView Bridge           ║
 * ║  Handles permissions + native file access for Audio & Docs  ║
 * ╚══════════════════════════════════════════════════════════════╝
 *
 * HOW TO USE IN YOUR EXPO APP:
 * ─────────────────────────────────────────────────────────────
 * 1. Install dependencies:
 *    npx expo install expo-document-picker expo-file-system
 *                     expo-media-library expo-av
 *                     @react-native-community/slider
 *
 * 2. Add to app.json / app.config.js:
 *    "plugins": [
 *      ["expo-media-library", { "photosPermission": "...", "savePhotosPermission": "..." }],
 *      ["expo-document-picker"]
 *    ]
 *
 * 3. In your App.jsx / Navigator, wrap your WebView screen with
 *    the <PhysioWebViewScreen /> component exported at the bottom.
 *
 * 4. This file also contains the in-WebView JS side (injectedJS)
 *    that intercepts messages from the native side and feeds them
 *    back into attach-menu.js / chatroom.html.
 */

// ═══════════════════════════════════════════════════════════════
//  SECTION A — REACT NATIVE SIDE  (put in your Expo .jsx files)
// ═══════════════════════════════════════════════════════════════

/*
// ── App.json / app.config.js plugin block ───────────────────────
// Add these to your "plugins" array:
//
// [
//   ["expo-media-library", {
//     "photosPermission":     "$(PRODUCT_NAME) needs access to your photos.",
//     "savePhotosPermission": "$(PRODUCT_NAME) needs to save files to your library.",
//     "isAccessMediaLocationEnabled": true
//   }],
//   ["expo-document-picker", {
//     "iCloudContainerEnvironment": "Production"
//   }]
// ]
//
// Android permissions (android/app/src/main/AndroidManifest.xml):
// <uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
//                  android:maxSdkVersion="32"/>
// <uses-permission android:name="android.permission.READ_MEDIA_AUDIO"/>
// <uses-permission android:name="android.permission.READ_MEDIA_IMAGES"/>
// <uses-permission android:name="android.permission.READ_MEDIA_VIDEO"/>
// <uses-permission android:name="android.permission.WRITE_EXTERNAL_STORAGE"
//                  android:maxSdkVersion="28"/>
// ─────────────────────────────────────────────────────────────────

import React, { useRef, useCallback } from 'react';
import { StyleSheet, Platform, Alert } from 'react-native';
import { WebView } from 'react-native-webview';
import * as DocumentPicker from 'expo-document-picker';
import * as MediaLibrary from 'expo-media-library';
import * as FileSystem from 'expo-file-system';
import { Audio } from 'expo-av';

// ── Permission helpers ──────────────────────────────────────────
async function requestAudioPermission() {
  if (Platform.OS === 'android') {
    const { status } = await MediaLibrary.requestPermissionsAsync();
    return status === 'granted';
  }
  // iOS: media library covers audio
  const { status } = await MediaLibrary.requestPermissionsAsync();
  return status === 'granted';
}

async function requestDocumentPermission() {
  // DocumentPicker handles its own permissions on both platforms.
  // On Android 13+ we need READ_MEDIA_* which DocumentPicker requests automatically.
  return true;
}

// ── Convert a local URI to base64 data URL ─────────────────────
async function uriToBase64DataURL(uri, mimeType) {
  try {
    const base64 = await FileSystem.readAsStringAsync(uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return 'data:' + mimeType + ';base64,' + base64;
  } catch (e) {
    console.warn('uriToBase64DataURL error:', e);
    return null;
  }
}

// ── Main WebView screen component ─────────────────────────────
export function PhysioWebViewScreen({ webUrl = 'https://physio-suai.netlify.app' }) {
  const webViewRef = useRef(null);

  // Send a message back into the WebView (JS side)
  const postToWeb = useCallback((payload) => {
    if (webViewRef.current) {
      webViewRef.current.injectJavaScript(
        `window._rnBridgeReceive && window._rnBridgeReceive(${JSON.stringify(JSON.stringify(payload))}); true;`
      );
    }
  }, []);

  // ── Handle messages FROM the WebView ────────────────────────
  const onMessage = useCallback(async (event) => {
    let msg;
    try { msg = JSON.parse(event.nativeEvent.data); }
    catch { return; }

    // ── PERMISSION REQUEST ───────────────────────────────────
    if (msg.type === 'REQUEST_PERMISSION') {
      if (msg.permission === 'READ_AUDIO_FILES') {
        const granted = await requestAudioPermission();
        postToWeb({ type: 'PERMISSION_RESULT', permission: msg.permission, granted });
      } else if (msg.permission === 'READ_EXTERNAL_STORAGE') {
        const granted = await requestDocumentPermission();
        postToWeb({ type: 'PERMISSION_RESULT', permission: msg.permission, granted });
      }
      return;
    }

    // ── OPEN AUDIO PICKER ────────────────────────────────────
    if (msg.type === 'OPEN_AUDIO') {
      const granted = await requestAudioPermission();
      if (!granted) {
        Alert.alert(
          'Permission Required',
          'Please allow access to your audio files in Settings.',
          [{ text: 'OK' }]
        );
        postToWeb({ type: 'FILE_CANCELLED' });
        return;
      }

      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: ['audio/*', 'audio/mpeg', 'audio/mp4', 'audio/ogg',
                 'audio/wav', 'audio/aac', 'audio/flac', 'audio/opus'],
          copyToCacheDirectory: true,
          multiple: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          postToWeb({ type: 'FILE_CANCELLED' });
          return;
        }

        const asset = result.assets[0];
        const mimeType = asset.mimeType || 'audio/mpeg';
        const dataUrl  = await uriToBase64DataURL(asset.uri, mimeType);
        if (!dataUrl) { postToWeb({ type: 'FILE_ERROR', error: 'Failed to read file' }); return; }

        postToWeb({
          type:     'FILE_SELECTED',
          fileType: 'audio',
          name:     asset.name,
          size:     asset.size,
          mime:     mimeType,
          dataUrl,
        });
      } catch (e) {
        console.error('Audio pick error:', e);
        postToWeb({ type: 'FILE_ERROR', error: e.message });
      }
      return;
    }

    // ── OPEN DOCUMENT PICKER ─────────────────────────────────
    if (msg.type === 'OPEN_DOCUMENT') {
      try {
        const result = await DocumentPicker.getDocumentAsync({
          type: [
            'application/pdf',
            'application/msword',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.ms-excel',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.ms-powerpoint',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation',
            'text/plain',
            'text/csv',
            '*/*',
          ],
          copyToCacheDirectory: true,
          multiple: false,
        });

        if (result.canceled || !result.assets || result.assets.length === 0) {
          postToWeb({ type: 'FILE_CANCELLED' });
          return;
        }

        const asset    = result.assets[0];
        const mimeType = asset.mimeType || 'application/octet-stream';
        const dataUrl  = await uriToBase64DataURL(asset.uri, mimeType);
        if (!dataUrl) { postToWeb({ type: 'FILE_ERROR', error: 'Failed to read file' }); return; }

        postToWeb({
          type:     'FILE_SELECTED',
          fileType: 'document',
          name:     asset.name,
          size:     asset.size,
          mime:     mimeType,
          dataUrl,
        });
      } catch (e) {
        console.error('Document pick error:', e);
        postToWeb({ type: 'FILE_ERROR', error: e.message });
      }
      return;
    }
  }, [postToWeb]);

  return (
    <WebView
      ref={webViewRef}
      source={{ uri: webUrl }}
      style={styles.webview}
      javaScriptEnabled={true}
      domStorageEnabled={true}
      allowFileAccess={true}
      allowUniversalAccessFromFileURLs={true}
      mixedContentMode="always"
      mediaCapturePermissionGrantType="grant"
      onMessage={onMessage}
      injectedJavaScriptBeforeContentLoaded={INJECTED_JS}
    />
  );
}

const styles = StyleSheet.create({
  webview: { flex: 1, backgroundColor: '#0d1117' },
});
*/


// ═══════════════════════════════════════════════════════════════
//  SECTION B — INJECTED JS  (runs inside the WebView on load)
//  This is the string you pass to injectedJavaScriptBeforeContentLoaded
// ═══════════════════════════════════════════════════════════════

const INJECTED_JS = `
(function() {
  // Mark that we're running inside React Native WebView
  window._isReactNative = true;

  /**
   * _rnBridgeReceive — called by PhysioWebViewScreen.postToWeb()
   * Receives a JSON-string payload from the native side and routes it.
   */
  window._rnBridgeReceive = function(jsonStr) {
    var msg;
    try { msg = JSON.parse(jsonStr); } catch(e) { return; }

    // ── Permission result ────────────────────────────────────
    if (msg.type === 'PERMISSION_RESULT') {
      if (!msg.granted) {
        if (typeof showToast === 'function') {
          showToast('Storage permission denied. Tap "Allow" to enable.', 'error');
        }
        var banner = msg.permission === 'READ_AUDIO_FILES'
          ? document.getElementById('_audPermBanner')
          : document.getElementById('_docPermBanner');
        if (banner) {
          banner.style.background = '#7f1d1d';
          banner.querySelector('span').textContent = 'Permission denied — tap Allow in Settings';
          banner.querySelector('span').style.color = '#fca5a5';
        }
      } else {
        // Hide the banner if permission was just granted
        var granted_banner = msg.permission === 'READ_AUDIO_FILES'
          ? document.getElementById('_audPermBanner')
          : document.getElementById('_docPermBanner');
        if (granted_banner) granted_banner.style.display = 'none';
      }
      return;
    }

    // ── File was selected ─────────────────────────────────────
    if (msg.type === 'FILE_SELECTED' && msg.dataUrl) {
      // Convert base64 data URL back to a File object
      try {
        var arr   = msg.dataUrl.split(',');
        var mime  = arr[0].match(/:(.*?);/)[1];
        var bstr  = atob(arr[1]);
        var n     = bstr.length;
        var u8arr = new Uint8Array(n);
        while (n--) { u8arr[n] = bstr.charCodeAt(n); }
        var file = new File([u8arr], msg.name || ('file_' + Date.now()), { type: mime });

        // Feed into attach-menu callback
        if (typeof window._attachCB === 'function') {
          var cb = window._attachCB; window._attachCB = null; cb(file);
        } else if (typeof window.onAttached === 'function') {
          window.onAttached(file);
        }

        // Close any open pickers
        ['_aAudUI', '_aDocUI'].forEach(function(id) {
          var el = document.getElementById(id);
          if (el) el.remove();
        });
      } catch(e) {
        console.error('_rnBridgeReceive FILE_SELECTED error:', e);
      }
      return;
    }

    // ── File picker was cancelled ─────────────────────────────
    if (msg.type === 'FILE_CANCELLED') {
      // Nothing to do — just leave UI as-is
      return;
    }

    // ── File read error ───────────────────────────────────────
    if (msg.type === 'FILE_ERROR') {
      if (typeof showToast === 'function') {
        showToast('Could not read file: ' + (msg.error || 'Unknown error'), 'error');
      }
      return;
    }
  };

  /**
   * Override Android bridge shims so attach-menu.js routes
   * through ReactNativeWebView.postMessage() instead of window.Android.*
   */
  if (!window.Android) {
    window.Android = {
      openAudio: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'OPEN_AUDIO' })
        );
      },
      openDocument: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'OPEN_DOCUMENT' })
        );
      },
      openGallery: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'OPEN_GALLERY' })
        );
      },
      openCamera: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'OPEN_CAMERA' })
        );
      },
      openLocation: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'OPEN_LOCATION' })
        );
      },
      openContact: function() {
        window.ReactNativeWebView && window.ReactNativeWebView.postMessage(
          JSON.stringify({ type: 'OPEN_CONTACT' })
        );
      },
    };
  }

  console.log('[PhysioSUAI] Expo bridge injected ✅');
})();
`;

// Export the injected JS string for use in your Expo component
if (typeof module !== 'undefined') {
  module.exports = { INJECTED_JS };
}
