import { useState, useCallback, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../../lib/auth/MobileAuthProvider';
import { BRAND } from '../../lib/constants';

export default function MfaScreen() {
  const { verifyMfa, isLoading } = useAuth();
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<TextInput>(null);

  const handleVerify = useCallback(async () => {
    setError('');
    if (code.length < 6) {
      setError('Enter the 6-digit code');
      return;
    }

    const result = await verifyMfa(code);
    if (!result.success) {
      setError(result.error ?? 'Verification failed');
      setCode('');
      inputRef.current?.focus();
    }
    // On success, auth provider navigates to main app
  }, [code, verifyMfa]);

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="shield-checkmark" size={48} color={BRAND.primary} />
      </View>

      <Text style={styles.title}>Two-Factor Authentication</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code from your authenticator app
      </Text>

      {error ? (
        <View style={styles.errorBanner}>
          <Ionicons name="alert-circle" size={18} color={BRAND.error} />
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}

      <TextInput
        ref={inputRef}
        style={styles.codeInput}
        value={code}
        onChangeText={(text) => setCode(text.replace(/\D/g, '').slice(0, 6))}
        keyboardType="number-pad"
        maxLength={6}
        placeholder="000000"
        placeholderTextColor={BRAND.gray300}
        autoFocus
        textContentType="oneTimeCode"
        accessibilityLabel="6-digit verification code"
        editable={!isLoading}
      />

      <Pressable
        style={({ pressed }) => [
          styles.verifyButton,
          pressed && { opacity: 0.9 },
          isLoading && { opacity: 0.6 },
        ]}
        onPress={handleVerify}
        disabled={isLoading}
        accessibilityRole="button"
      >
        {isLoading ? (
          <ActivityIndicator color={BRAND.white} />
        ) : (
          <Text style={styles.verifyButtonText}>Verify</Text>
        )}
      </Pressable>

      <Text style={styles.helpText}>
        If you've lost access to your authenticator, contact your care team
        for a backup code.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background, padding: 24, justifyContent: 'center' },
  iconContainer: { alignItems: 'center', marginBottom: 20 },
  title: { fontSize: 22, fontWeight: '700', color: BRAND.deepNavy, textAlign: 'center' },
  subtitle: { fontSize: 14, color: BRAND.gray500, textAlign: 'center', marginTop: 8, marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderRadius: 10, padding: 12, gap: 8, marginBottom: 16,
  },
  errorText: { color: BRAND.error, fontSize: 14, flex: 1 },
  codeInput: {
    backgroundColor: BRAND.white, borderRadius: 12, borderWidth: 2, borderColor: BRAND.gray200,
    height: 64, fontSize: 32, fontWeight: '700', textAlign: 'center', letterSpacing: 12,
    color: BRAND.deepNavy, marginBottom: 20,
  },
  verifyButton: {
    backgroundColor: BRAND.primary, borderRadius: 12, height: 52,
    alignItems: 'center', justifyContent: 'center',
  },
  verifyButtonText: { color: BRAND.white, fontSize: 17, fontWeight: '700' },
  helpText: { fontSize: 12, color: BRAND.gray400, textAlign: 'center', marginTop: 20, lineHeight: 18 },
});
