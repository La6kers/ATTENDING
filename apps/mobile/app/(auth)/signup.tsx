import { useState, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import api from '../../lib/api/mobileApiClient';
import { BRAND } from '../../lib/constants';

export default function SignupScreen() {
  const router = useRouter();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSignup = useCallback(async () => {
    setError('');

    if (!firstName.trim() || !lastName.trim() || !email.trim() || !password) {
      setError('All fields are required');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (!acceptedTerms) {
      setError('You must accept the terms and HIPAA notice');
      return;
    }

    setLoading(true);
    const result = await api.post('/auth/register', {
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim(),
      password,
    }, { noAuth: true });

    setLoading(false);

    if (result.ok) {
      router.replace('/(auth)/login');
    } else {
      setError(result.error?.message ?? 'Registration failed');
    }
  }, [firstName, lastName, email, password, confirmPassword, acceptedTerms, router]);

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
        <Text style={styles.title}>Create Your Account</Text>
        <Text style={styles.subtitle}>Join ATTENDING AI for personalized healthcare</Text>

        {error ? (
          <View style={styles.errorBanner}>
            <Ionicons name="alert-circle" size={18} color={BRAND.error} />
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        <View style={styles.row}>
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="First name"
            placeholderTextColor={BRAND.gray400}
            value={firstName}
            onChangeText={setFirstName}
            autoComplete="given-name"
            textContentType="givenName"
            editable={!loading}
          />
          <TextInput
            style={[styles.input, styles.halfInput]}
            placeholder="Last name"
            placeholderTextColor={BRAND.gray400}
            value={lastName}
            onChangeText={setLastName}
            autoComplete="family-name"
            textContentType="familyName"
            editable={!loading}
          />
        </View>

        <TextInput
          style={styles.input}
          placeholder="Email address"
          placeholderTextColor={BRAND.gray400}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
          textContentType="emailAddress"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Password (min 8 characters)"
          placeholderTextColor={BRAND.gray400}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
          textContentType="newPassword"
          editable={!loading}
        />

        <TextInput
          style={styles.input}
          placeholder="Confirm password"
          placeholderTextColor={BRAND.gray400}
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secureTextEntry
          textContentType="newPassword"
          editable={!loading}
        />

        {/* HIPAA Terms */}
        <Pressable
          style={styles.termsRow}
          onPress={() => setAcceptedTerms((v) => !v)}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: acceptedTerms }}
        >
          <Ionicons
            name={acceptedTerms ? 'checkbox' : 'square-outline'}
            size={24}
            color={acceptedTerms ? BRAND.primary : BRAND.gray400}
          />
          <Text style={styles.termsText}>
            I agree to the Terms of Service, Privacy Policy, and HIPAA Notice of
            Privacy Practices. I understand my health information will be protected
            under federal regulations.
          </Text>
        </Pressable>

        <Pressable
          style={({ pressed }) => [
            styles.signupButton,
            pressed && { opacity: 0.9 },
            loading && { opacity: 0.6 },
          ]}
          onPress={handleSignup}
          disabled={loading}
          accessibilityRole="button"
        >
          {loading ? (
            <ActivityIndicator color={BRAND.white} />
          ) : (
            <Text style={styles.signupButtonText}>Create Account</Text>
          )}
        </Pressable>

        <Pressable onPress={() => router.back()} style={styles.backLink}>
          <Text style={styles.backText}>Already have an account? Sign In</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: BRAND.background },
  content: { padding: 24, paddingBottom: 48 },
  title: { fontSize: 24, fontWeight: '700', color: BRAND.deepNavy, marginBottom: 4 },
  subtitle: { fontSize: 14, color: BRAND.gray500, marginBottom: 24 },
  errorBanner: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: '#FEF2F2',
    borderRadius: 10, padding: 12, gap: 8, marginBottom: 12,
  },
  errorText: { color: BRAND.error, fontSize: 14, flex: 1 },
  row: { flexDirection: 'row', gap: 12 },
  input: {
    backgroundColor: BRAND.white, borderRadius: 12, borderWidth: 1, borderColor: BRAND.gray200,
    paddingHorizontal: 14, height: 52, fontSize: 16, color: BRAND.deepNavy, marginBottom: 12,
  },
  halfInput: { flex: 1 },
  termsRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginVertical: 12, paddingRight: 8 },
  termsText: { flex: 1, fontSize: 13, color: BRAND.gray500, lineHeight: 18 },
  signupButton: {
    backgroundColor: BRAND.primary, borderRadius: 12, height: 52,
    alignItems: 'center', justifyContent: 'center', marginTop: 8,
  },
  signupButtonText: { color: BRAND.white, fontSize: 17, fontWeight: '700' },
  backLink: { alignItems: 'center', padding: 12 },
  backText: { fontSize: 14, color: BRAND.primary, fontWeight: '600' },
});
