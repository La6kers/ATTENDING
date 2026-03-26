import { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Platform } from 'react-native';
import { WebView } from 'react-native-webview';
import { secureTokenStore } from '../lib/auth/secureTokenStore';
import { BRAND, API_CONFIG } from '../lib/constants';

const COMPASS_URL = `${API_CONFIG.BASE_URL.replace('/api', '')}/patient-portal/compass`;

export default function CompassScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    secureTokenStore.getAccessToken().then(setToken);
  }, []);

  if (Platform.OS === 'web') {
    return (
      <View style={styles.center}>
        <Text style={styles.fallbackTitle}>COMPASS Assessment</Text>
        <Text style={styles.fallbackText}>
          The COMPASS assessment is available through your web browser.
          Please visit the patient portal to complete your assessment.
        </Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>Unable to load COMPASS</Text>
        <Text style={styles.errorText}>
          Please check your internet connection and try again.
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {loading && (
        <View style={styles.loadingOverlay}>
          <ActivityIndicator size="large" color={BRAND.primary} />
          <Text style={styles.loadingText}>Loading COMPASS...</Text>
        </View>
      )}
      <WebView
        source={{
          uri: COMPASS_URL,
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onError={() => { setLoading(false); setError(true); }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsBackForwardNavigationGestures
        accessibilityLabel="COMPASS Assessment web content"
        onMessage={(event) => {
          // Handle messages from COMPASS (e.g., assessment completed)
          try {
            const data = JSON.parse(event.nativeEvent.data);
            if (data.type === 'assessment_complete') {
              // Navigate back or show completion
            }
          } catch { /* not JSON */ }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  webview: { flex: 1 },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject, backgroundColor: BRAND.background,
    alignItems: 'center', justifyContent: 'center', zIndex: 10,
  },
  loadingText: { marginTop: 12, fontSize: 15, color: BRAND.deepNavy },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: BRAND.background },
  fallbackTitle: { fontSize: 22, fontWeight: '700', color: BRAND.deepNavy, marginBottom: 12 },
  fallbackText: { fontSize: 15, color: BRAND.gray500, textAlign: 'center', lineHeight: 22 },
  errorTitle: { fontSize: 20, fontWeight: '700', color: BRAND.error, marginBottom: 12 },
  errorText: { fontSize: 15, color: BRAND.gray500, textAlign: 'center', lineHeight: 22 },
});
