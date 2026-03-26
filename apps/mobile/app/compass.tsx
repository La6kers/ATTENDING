import { useState } from "react";
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from "react-native";
import { WebView } from "react-native-webview";

const BRAND = {
  primary: "#1A8FA8",
  deepNavy: "#0C3547",
  lightTeal: "#4FD1C5",
  background: "#F0FAFA",
};

/**
 * COMPASS Assessment screen.
 *
 * Wraps the patient-portal COMPASS page in a WebView so patients
 * can complete assessments natively. On web, renders a fallback
 * message since WebView is not available.
 */

const COMPASS_URL = "https://attending.ai/patient-portal/compass";

export default function CompassScreen() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  if (Platform.OS === "web") {
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
          You can also access COMPASS through the patient portal website.
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
        source={{ uri: COMPASS_URL }}
        style={styles.webview}
        onLoadEnd={() => setLoading(false)}
        onError={() => {
          setLoading(false);
          setError(true);
        }}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState={false}
        allowsBackForwardNavigationGestures
        accessibilityLabel="COMPASS Assessment web content"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: BRAND.background,
  },
  webview: {
    flex: 1,
  },
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: BRAND.background,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 15,
    color: BRAND.deepNavy,
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 32,
    backgroundColor: BRAND.background,
  },
  fallbackTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: BRAND.deepNavy,
    marginBottom: 12,
  },
  fallbackText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: "700",
    color: "#DC2626",
    marginBottom: 12,
  },
  errorText: {
    fontSize: 15,
    color: "#64748B",
    textAlign: "center",
    lineHeight: 22,
  },
});
